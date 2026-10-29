"""Sala: jogadores, lobby, motor de jogo, timers e envio de STATE/EVENT.

Toda mutação roda dentro de ``Room.transact`` (que segura ``room.lock``):
handler → (motor → efeitos) → ``rev += 1`` → STATE personalizado para cada
socket → EVENTs. ``GameError`` vira ``ERROR`` só para quem enviou e não muda
nada. Contrato com o cliente: ``PROTOCOL.md`` nesta pasta.
"""

from __future__ import annotations

import asyncio
import inspect
import json
import logging
import random
import secrets
import time
from typing import Any, Awaitable, Callable, Literal, Optional

from fastapi import WebSocket

from app.games import ENGINES, Actor, Cancel, Emit, GameEngine, GameError, Schedule, Seat, Viewer
from app.websockets.catalog import Catalog

log = logging.getLogger(__name__)

# Relógio dos motores e do ``serverNow`` (segundos, monotônico do servidor).
clock = time.monotonic

RoomKind = Literal["online", "local"]
Handler = Callable[[], "list[Emit] | None | Awaitable[list[Emit] | None]"]

NOT_HOST = ("not_allowed", "Só o líder pode fazer isso.")


class Player:
    def __init__(self, player_id: str, name: str, avatar: Optional[str] = None, websocket: Optional[WebSocket] = None):
        self.id = player_id
        self.name = name
        self.avatar = avatar
        self.websocket = websocket
        # Tarefa que remove o jogador se ele não reconectar dentro do período de graça
        self.removal_task: Optional[asyncio.Task] = None

    @property
    def connected(self) -> bool:
        return self.websocket is not None

    def cancel_removal(self) -> None:
        task, self.removal_task = self.removal_task, None
        if task and not task.done() and task is not asyncio.current_task():
            task.cancel()

    def to_dict(self) -> dict:
        return {"id": self.id, "name": self.name, "avatar": self.avatar, "connected": self.connected}


def local_seat_id() -> str:
    return "l_" + secrets.token_hex(4)


def clean_local_names(names: list[str], previous: list[Seat] | None = None) -> list[Seat]:
    """Valida os nomes do Pass and Play e reaproveita ids de nomes que continuam."""
    from app.websockets.protocol import MAX_LOCAL_PLAYERS, MIN_LOCAL_PLAYERS

    names = [n.strip() for n in names]
    if not (MIN_LOCAL_PLAYERS <= len(names) <= MAX_LOCAL_PLAYERS) or any(not n for n in names):
        raise GameError(
            "invalid_players", f"Informe de {MIN_LOCAL_PLAYERS} a {MAX_LOCAL_PLAYERS} nomes de jogadores."
        )
    if len({n.casefold() for n in names}) != len(names):
        raise GameError("duplicate_names", "Os nomes dos jogadores precisam ser diferentes.")
    old = {s.name.casefold(): s.id for s in previous or []}
    used: set[str] = set()
    seats: list[Seat] = []
    for n in names:
        sid = old.get(n.casefold())
        while sid is None or sid in used:
            sid = local_seat_id()
        used.add(sid)
        seats.append(Seat(sid, n))
    return seats


class Room:
    def __init__(
        self,
        code: str,
        kind: RoomKind,
        host_id: str,
        *,
        catalog: Catalog,
        on_send_failed: Callable[["Room", str, WebSocket], Awaitable[None]] | None = None,
    ):
        self.code = code
        self.kind: RoomKind = kind
        self.host_id = host_id
        self.players: dict[str, Player] = {}  # ordem de entrada
        self.stage: Literal["lobby", "game"] = "lobby"
        self.mode: str | None = None
        self.config: dict = {}
        self.theme_ids: list[str] = []
        self.local_seats: list[Seat] = []
        self.engine: GameEngine | None = None
        self.rev = 0
        self.lock = asyncio.Lock()
        self.timers: dict[str, asyncio.Task] = {}
        self.closed = False
        self.catalog = catalog
        self._on_send_failed = on_send_failed

    @property
    def local(self) -> bool:
        return self.kind == "local"

    # ----- jogadores ---------------------------------------------------------

    def unique_name(self, name: str, player_id: str) -> str:
        taken = {p.name.casefold() for p in self.players.values() if p.id != player_id}
        candidate, n = name, 2
        while candidate.casefold() in taken:
            candidate = f"{name} {n}"
            n += 1
        return candidate

    def promote_new_host(self) -> str:
        candidates = [p for p in self.players.values() if p.connected] or list(self.players.values())
        self.host_id = candidates[0].id if candidates else ""
        return self.host_id

    def is_host(self, player_id: str) -> bool:
        return player_id == self.host_id

    def seated(self, player_id: str) -> bool:
        return self.engine is not None and self.engine.seat(player_id) is not None

    def member(self, player_id: str, websocket: WebSocket | None = None) -> Player:
        """Jogador ``player_id`` cujo socket atual é ``websocket`` (senão ``not_in_room``)."""
        player = self.players.get(player_id)
        if self.closed or player is None or (websocket is not None and player.websocket is not websocket):
            raise GameError("not_in_room", "Você não está em uma sala.")
        return player

    def require_host(self, player: Player) -> None:
        if not self.is_host(player.id):
            raise GameError(*NOT_HOST)

    def require_stage(self, stage: str) -> None:
        if self.stage != stage:
            if stage == "lobby":
                raise GameError("invalid_phase", "Há uma partida em andamento.")
            raise GameError("invalid_phase", "Nenhuma partida em andamento.")

    # ----- quem vê / quem age ------------------------------------------------

    def controls(self, player: Player) -> list[str]:
        if self.local:
            return [s.id for s in self.local_seats] if self.is_host(player.id) else []
        return [player.id]

    def viewer_for(self, player: Player) -> Viewer | None:
        is_host = self.is_host(player.id)
        if self.local:
            if not is_host or self.engine is None:
                return None
            return Viewer(frozenset(self.engine.seat_ids()), True, True)
        if self.seated(player.id):
            return Viewer(frozenset({player.id}), is_host, False)
        return None  # não sentado: visão pública (sem segredos)

    def actor_for(self, player: Player, as_seat: str | None) -> Actor:
        assert self.engine is not None
        is_host = self.is_host(player.id)
        if self.local:
            if not is_host:
                raise GameError(*NOT_HOST)
            if as_seat is not None and self.engine.seat(as_seat) is None:
                raise GameError("unknown_seat", "Jogador não encontrado.")
            return Actor(player.id, as_seat, True, True)
        if as_seat is not None and as_seat != player.id:
            raise GameError("not_allowed", "Você só pode jogar pelo seu próprio lugar.")
        seat_id = player.id if self.seated(player.id) else None
        return Actor(player.id, seat_id, is_host, False)

    # ----- envio -------------------------------------------------------------

    def room_view(self) -> dict:
        return {
            "code": self.code,
            "kind": self.kind,
            "hostId": self.host_id,
            "stage": self.stage,
            "mode": self.mode,
            "config": self.config,
            "themeIds": list(self.theme_ids),
            "players": [p.to_dict() for p in self.players.values()],
            "localSeats": [{"id": s.id, "name": s.name} for s in self.local_seats],
        }

    def state_for(self, player: Player, cache: dict | None = None, room_view: dict | None = None) -> dict:
        cache = {} if cache is None else cache
        game = None
        if self.engine is not None:
            viewer = self.viewer_for(player)
            key = None if viewer is None else (viewer.seat_ids, viewer.is_host, viewer.local)
            if key not in cache:
                cache[key] = self.engine.view_for(viewer)
            game = cache[key]
        return {
            "type": "STATE",
            "rev": self.rev,
            "serverNow": clock(),
            "room": room_view or self.room_view(),
            "you": {"playerId": player.id, "isHost": self.is_host(player.id), "controls": self.controls(player)},
            "game": game,
        }

    async def _send_many(self, items: list[tuple[Player, str]]) -> None:
        async def send(player: Player, payload: str):
            ws = player.websocket
            if ws is None:
                return
            try:
                await ws.send_text(payload)
            except Exception:
                if self._on_send_failed is not None:
                    # Fora do lock: a limpeza da conexão precisa do lock da sala
                    asyncio.create_task(self._on_send_failed(self, player.id, ws))

        await asyncio.gather(*(send(p, payload) for p, payload in items))

    async def broadcast_state(self) -> None:
        cache: dict = {}
        rv = self.room_view()
        items = [
            (p, json.dumps(self.state_for(p, cache, rv))) for p in self.players.values() if p.connected
        ]
        await self._send_many(items)

    def _targets(self, to_seat: str | None) -> list[Player]:
        connected = [p for p in self.players.values() if p.connected]
        if to_seat is None:
            return connected
        if self.local:
            return [p for p in connected if self.is_host(p.id)]
        return [p for p in connected if p.id == to_seat]

    async def send_events(self, events: list[Emit]) -> None:
        items: list[tuple[Player, str]] = []
        for ev in events:
            payload = json.dumps({"type": "EVENT", "name": ev.name, "data": ev.data})
            items.extend((p, payload) for p in self._targets(ev.to_seat))
        if items:
            await self._send_many(items)

    @staticmethod
    async def send_to(websocket: WebSocket, message: dict) -> None:
        try:
            await websocket.send_text(json.dumps(message))
        except Exception:
            pass

    @staticmethod
    async def send_error(websocket: WebSocket | None, code: str, message: str) -> None:
        if websocket is not None:
            await Room.send_to(websocket, {"type": "ERROR", "code": code, "message": message})

    # ----- transação ---------------------------------------------------------

    async def transact(self, fn: Handler, *, reply_to: WebSocket | None = None) -> bool:
        """Roda ``fn`` sob o lock. ``fn`` devolve a lista de eventos (estado mudou →
        rev+1 + STATE + EVENTs) ou ``None`` (nada mudou). ``GameError`` → ERROR para
        ``reply_to``. Devolve True se a transação foi aplicada."""
        async with self.lock:
            if self.closed:
                await self.send_error(reply_to, "not_in_room", "Você não está em uma sala.")
                return False
            try:
                result = fn()
                if inspect.isawaitable(result):
                    result = await result
            except GameError as exc:
                await self.send_error(reply_to, exc.code, exc.message)
                return False
            except Exception:  # bug: não derruba a conexão
                log.exception("erro na sala %s", self.code)
                await self.send_error(reply_to, "internal_error", "Erro interno do servidor.")
                return False
            if result is None or self.closed:
                return result is not None
            self.rev += 1
            await self.broadcast_state()
            await self.send_events(result)
            return True

    # ----- motor: efeitos e timers ------------------------------------------

    def apply_effects(self, fx: list) -> list[Emit]:
        events: list[Emit] = []
        for eff in fx:
            if isinstance(eff, Schedule):
                self._schedule_timer(eff)
            elif isinstance(eff, Cancel):
                self._cancel_timer(eff.key)
            elif isinstance(eff, Emit):
                events.append(eff)
        if self.engine is not None and any(e.name == "not_enough_players" for e in events):
            self.end_game()
            events.append(Emit("returned_to_lobby", {"reason": "not_enough_players"}))
        return events

    def _schedule_timer(self, sched: Schedule) -> None:
        self._cancel_timer(sched.key)
        self.timers[sched.key] = asyncio.create_task(self._fire(sched.key, sched.token, sched.delay))

    def _cancel_timer(self, key: str) -> None:
        task = self.timers.pop(key, None)
        if task is not None and task is not asyncio.current_task():
            task.cancel()

    def cancel_timers(self) -> None:
        for key in list(self.timers):
            self._cancel_timer(key)

    async def _fire(self, key: str, token: int, delay: float) -> None:
        await asyncio.sleep(delay)
        me = asyncio.current_task()

        def run():
            if self.timers.get(key) is not me:
                return None  # cancelado/substituído enquanto esperava o lock
            del self.timers[key]
            if self.engine is None:
                return None
            return self.apply_effects(self.engine.on_timer(key, token))

        await self.transact(run)

    def end_game(self) -> None:
        self.cancel_timers()
        self.engine = None
        self.stage = "lobby"

    def close(self) -> None:
        self.closed = True
        self.cancel_timers()
        for p in self.players.values():
            p.cancel_removal()

    # ----- lobby (chamar dentro de transact) ---------------------------------

    async def select_mode(self, player: Player, mode: str) -> list[Emit]:
        self.require_host(player)
        self.require_stage("lobby")
        if mode not in ENGINES or not await self.catalog.game_active(mode):
            raise GameError("unknown_mode", "Modo de jogo desconhecido ou desativado.")
        if mode != self.mode:
            self.mode = mode
            self.config = ENGINES[mode].Config().model_dump(by_alias=True)
            self.theme_ids = []
        return []

    def _require_mode(self) -> type[GameEngine]:
        if self.mode is None:
            raise GameError("no_mode", "Escolha um modo de jogo primeiro.")
        return ENGINES[self.mode]

    def set_config(self, player: Player, config: dict) -> list[Emit]:
        self.require_host(player)
        self.require_stage("lobby")
        cls = self._require_mode()
        self.config = cls.parse_config(config).model_dump(by_alias=True)
        return []

    async def select_themes(self, player: Player, theme_ids: list[str]) -> list[Emit]:
        self.require_host(player)
        self.require_stage("lobby")
        self._require_mode()
        assert self.mode is not None
        self.theme_ids = await self.catalog.resolve_themes(self.mode, theme_ids)
        return []

    def set_local_players(self, player: Player, names: list[str]) -> list[Emit]:
        if not self.local:
            raise GameError("invalid_action", "Disponível só no modo Pass and Play.")
        self.require_host(player)
        self.require_stage("lobby")
        self.local_seats = clean_local_names(names, self.local_seats)
        return []

    def _start_seats(self) -> list[Seat]:
        if self.local:
            return list(self.local_seats)
        return [Seat(p.id, p.name) for p in self.players.values()]

    async def start_game(self, player: Player) -> list[Emit]:
        self.require_host(player)
        self.require_stage("lobby")
        cls = self._require_mode()
        assert self.mode is not None
        seats = self._start_seats()
        cls.validate_start(seats, self.config)
        content = await self.catalog.load_content(self.mode, self.theme_ids)
        engine = cls(
            self.config, seats, local=self.local, rng=random.Random(secrets.randbits(64)), clock=clock
        )
        fx = engine.start(content)
        self.engine = engine
        self.stage = "game"
        return [Emit("game_started", {"mode": self.mode}), *self.apply_effects(fx)]

    def return_to_lobby(self, player: Player) -> list[Emit]:
        self.require_host(player)
        self.require_stage("game")
        self.end_game()
        return [Emit("returned_to_lobby", {"reason": "host"})]

    async def game_action(self, player: Player, action: dict[str, Any], as_seat: str | None) -> list[Emit]:
        self.require_stage("game")
        engine = self.engine
        assert engine is not None and self.mode is not None
        act = engine.parse_action(action)
        actor = self.actor_for(player, as_seat)
        content = None
        if act.type in engine.content_actions:
            try:
                content = await self.catalog.load_content(self.mode, self.theme_ids)
            except GameError:
                content = None  # o motor usa o último conteúdo carregado (ou recusa com no_content)
        fx = engine.handle_action(actor, act, content)
        return self.apply_effects(fx)

    # ----- entrada/saída de assentos durante a partida -----------------------

    def seat_joined(self, player: Player) -> list[Emit]:
        if self.engine is None or self.local:
            return []
        return self.apply_effects(self.engine.on_seat_joined(Seat(player.id, player.name)))

    def seat_left(self, player_id: str) -> list[Emit]:
        if self.engine is None or self.local:
            return []
        return self.apply_effects(self.engine.on_seat_left(player_id))
