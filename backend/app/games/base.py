"""Interface comum dos motores de jogo.

Os motores são **puros e síncronos**: não conhecem asyncio, sockets nem banco.
A camada de sala (``websockets/room.py``) é quem:

* carrega o conteúdo (``content.py``) antes de ``start`` e das ações listadas em
  ``content_actions`` e o repassa ao motor;
* executa os efeitos devolvidos (``Schedule``/``Cancel``/``Emit``);
* chama ``on_timer(key, token)`` quando um ``Schedule`` vence;
* gera o STATE de cada socket com ``view_for(viewer)``.

Convenções:

* Ações chegam como ``dict`` (JSON do cliente, chaves camelCase) ou como o
  modelo Pydantic já validado. O campo ``type`` discrimina a ação.
* Ações de assento (ex.: ``ACK_CARD``, ``VOTE``) usam ``actor.seat_id``. No Pass
  and Play o aparelho controla todos os assentos e manda ``asSeat``; a sala
  converte isso em ``actor.seat_id``.
* Timers: cada ``Schedule`` leva um ``token`` opaco. ``on_timer`` com token
  diferente do último agendado para aquela chave (ou depois de uma troca de
  fase) é ignorado — timers velhos nunca mudam o estado.
* ``phase_seq`` aumenta a cada troca de fase (útil para o cliente resetar UI).
* Erros: ``GameError(code, message)`` com mensagem em português; o estado não é
  alterado quando a ação é rejeitada.
"""

from __future__ import annotations

import random
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Callable, ClassVar, Iterable

from pydantic import BaseModel, ConfigDict, TypeAdapter, ValidationError
from pydantic.alias_generators import to_camel


# ---------------------------------------------------------------------------
# Tipos básicos
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Seat:
    id: str
    name: str


@dataclass(frozen=True)
class Actor:
    """Quem enviou a ação. ``seat_id`` é o assento em nome do qual age."""

    player_id: str
    seat_id: str | None
    is_host: bool
    local: bool


@dataclass(frozen=True)
class Viewer:
    """Para quem a view é gerada. Online: um assento; local: todos."""

    seat_ids: frozenset[str]
    is_host: bool
    local: bool


# ---------------------------------------------------------------------------
# Efeitos
# ---------------------------------------------------------------------------


@dataclass
class Schedule:
    key: str
    delay: float
    token: int


@dataclass
class Cancel:
    key: str


@dataclass
class Emit:
    """Evento efêmero (som/toast). ``to_seat=None`` = para todos."""

    name: str
    data: dict = field(default_factory=dict)
    to_seat: str | None = None


Effect = Schedule | Cancel | Emit


class GameError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(f"{code}: {message}")
        self.code = code
        self.message = message


NOT_ALLOWED = ("not_allowed", "Só o líder pode fazer isso.")


# ---------------------------------------------------------------------------
# Modelos base de config/ação (camelCase no JSON)
# ---------------------------------------------------------------------------


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="ignore", frozen=True)


class ActionModel(CamelModel):
    type: str


# ---------------------------------------------------------------------------
# Motor
# ---------------------------------------------------------------------------


class GameEngine(ABC):
    mode: ClassVar[str]
    min_players: ClassVar[int]
    max_players: ClassVar[int | None] = None
    Config: ClassVar[type[BaseModel]]
    Action: ClassVar[TypeAdapter]
    content_actions: ClassVar[frozenset[str]] = frozenset()

    def __init__(
        self,
        config: BaseModel | dict | None,
        seats: Iterable[Seat],
        *,
        local: bool,
        rng: random.Random | None = None,
        clock: Callable[[], float] | None = None,
    ):
        self.config = self.parse_config(config)
        self.seats: list[Seat] = list(seats)
        self.local = local
        self.rng = rng or random.Random()
        if clock is None:
            import time

            clock = time.time
        self.clock = clock
        self.phase: str = "init"
        self.phase_seq: int = 0
        self._token_counter = 0
        self._armed: dict[str, int] = {}
        self._fx: list[Effect] = []
        self._pool = None  # último ContentPool recebido

    # ----- classe -----------------------------------------------------------

    @classmethod
    def parse_config(cls, config: BaseModel | dict | None) -> BaseModel:
        if isinstance(config, cls.Config):
            return config
        if isinstance(config, BaseModel):
            config = config.model_dump(by_alias=True)
        try:
            return cls.Config.model_validate(config or {})
        except ValidationError as exc:
            raise GameError("invalid_config", "Configuração inválida para este modo.") from exc

    @classmethod
    def validate_start(cls, seats: list[Seat], config: BaseModel | dict | None) -> None:
        cfg = cls.parse_config(config)
        n = len(seats)
        if n < cls.min_players:
            raise GameError("not_enough_players", f"Este modo precisa de pelo menos {cls.min_players} jogadores.")
        if cls.max_players is not None and n > cls.max_players:
            raise GameError("too_many_players", f"Este modo aceita no máximo {cls.max_players} jogadores.")
        if len({s.id for s in seats}) != n:
            raise GameError("invalid_seats", "Assentos duplicados.")
        cls._validate_start_extra(seats, cfg)

    @classmethod
    def _validate_start_extra(cls, seats: list[Seat], config: BaseModel) -> None:  # pragma: no cover - hook
        return None

    @classmethod
    def parse_action(cls, action: Any) -> ActionModel:
        if isinstance(action, BaseModel):
            return action  # type: ignore[return-value]
        try:
            return cls.Action.validate_python(action)
        except ValidationError as exc:
            raise GameError("invalid_action", "Ação inválida.") from exc

    # ----- API pública ------------------------------------------------------

    def start(self, content=None) -> list[Effect]:
        if content is not None:
            self._accept_content(content)
        return self._run(self._start)

    def handle_action(self, actor: Actor, action: Any, content=None) -> list[Effect]:
        act = self.parse_action(action)
        if actor.seat_id is not None and self.seat(actor.seat_id) is None:
            raise GameError("unknown_seat", "Jogador não encontrado.")
        if act.type in self.content_actions and content is not None:
            self._accept_content(content)
        handler = getattr(self, "_act_" + act.type.lower(), None)
        if handler is None:  # pragma: no cover - união e handlers andam juntos
            raise GameError("invalid_action", "Ação inválida.")
        return self._run(handler, actor, act)

    def on_timer(self, key: str, token: int) -> list[Effect]:
        if self._armed.get(key) != token:
            return []
        del self._armed[key]
        handler = getattr(self, "_timer_" + key, None)
        if handler is None:
            return []
        return self._run(handler)

    def on_seat_left(self, seat_id: str) -> list[Effect]:
        if self.seat(seat_id) is None:
            return []
        self.seats = [s for s in self.seats if s.id != seat_id]

        def run() -> None:
            self._seat_left(seat_id)
            if len(self.seats) < self.min_players:
                self._emit("not_enough_players", {"minPlayers": self.min_players})

        return self._run(run)

    def on_seat_joined(self, seat: Seat) -> list[Effect]:
        if self.seat(seat.id) is not None:
            # reconexão / troca de nome: só atualiza o nome
            self.seats = [seat if s.id == seat.id else s for s in self.seats]
            return []
        self.seats.append(seat)
        return self._run(self._seat_joined, seat)

    @abstractmethod
    def view_for(self, viewer: Viewer | None) -> dict: ...

    # ----- ganchos dos motores ---------------------------------------------

    @abstractmethod
    def _start(self) -> None: ...

    def _seat_left(self, seat_id: str) -> None:
        return None

    def _seat_joined(self, seat: Seat) -> None:
        return None

    def _content_ok(self, pool) -> bool:
        return True

    # ----- utilidades -------------------------------------------------------

    def _accept_content(self, pool) -> None:
        if not self._content_ok(pool):
            raise GameError("no_content", "Os temas escolhidos não têm conteúdo.")
        self._pool = pool

    def _require_pool(self):
        if self._pool is None or not self._content_ok(self._pool):
            raise GameError("no_content", "Os temas escolhidos não têm conteúdo.")
        return self._pool

    def _run(self, fn: Callable[..., None], *args) -> list[Effect]:
        self._fx = []
        fn(*args)
        fx, self._fx = self._fx, []
        return fx

    def _emit(self, name: str, data: dict | None = None, to_seat: str | None = None) -> None:
        self._fx.append(Emit(name, data or {}, to_seat))

    def _schedule(self, key: str, delay: float) -> None:
        self._token_counter += 1
        self._armed[key] = self._token_counter
        self._fx.append(Schedule(key, max(0.0, float(delay)), self._token_counter))

    def _cancel(self, key: str) -> None:
        if self._armed.pop(key, None) is not None:
            self._fx.append(Cancel(key))

    def _set_phase(self, phase: str) -> None:
        for key in list(self._armed):
            self._cancel(key)
        self.phase = phase
        self.phase_seq += 1

    def seat(self, seat_id: str | None) -> Seat | None:
        for s in self.seats:
            if s.id == seat_id:
                return s
        return None

    def seat_ids(self) -> list[str]:
        return [s.id for s in self.seats]

    def _require_seat_id(self, seat_id: str | None) -> str:
        if seat_id is None or self.seat(seat_id) is None:
            raise GameError("unknown_seat", "Jogador não encontrado.")
        return seat_id

    def _acting_seat(self, actor: Actor) -> str:
        if actor.seat_id is None:
            raise GameError("no_seat", "Você não está jogando nesta partida.")
        return self._require_seat_id(actor.seat_id)

    @staticmethod
    def _require_host(actor: Actor) -> None:
        if not actor.is_host:
            raise GameError(*NOT_ALLOWED)

    def _require_phase(self, *phases: str) -> None:
        if self.phase not in phases:
            raise GameError("invalid_phase", "Essa ação não está disponível agora.")

    def _base_view(self) -> dict:
        return {
            "mode": self.mode,
            "phase": self.phase,
            "phaseSeq": self.phase_seq,
            "local": self.local,
            "seats": [{"id": s.id, "name": s.name} for s in self.seats],
        }

    def _name(self, seat_id: str, fallback: dict[str, str] | None = None) -> str:
        s = self.seat(seat_id)
        if s is not None:
            return s.name
        return (fallback or {}).get(seat_id, "")


def viewer_seat(viewer: Viewer | None) -> str | None:
    """Assento único do viewer online (``None`` para local/espectador)."""
    if viewer is None or viewer.local or len(viewer.seat_ids) != 1:
        return None
    return next(iter(viewer.seat_ids))
