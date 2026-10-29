"""ITO (modo ``classic``).

Config (camelCase): ``scale`` ∈ {50, 100, 1000} (padrão 100), ``lives`` 1..5
(padrão 3), ``saboteur`` bool (padrão false). Mín. 2 jogadores (3 com
sabotador); nº de jogadores ≤ ``scale``.

Fases::

    init ──DEAL──▶ rolling ──(timer 2,5 s)──▶ numbers ──START_ORDERING──▶ ordering
      ▲                                                                     │CHECK
      └──────────────NEXT_ROUND────────── result ◀──────────────────────────┤
                                         (gameOver=true se vidas=0 sem sabotador)
    com sabotador e vidas=0: ordering ──CHECK──▶ saboteur_voting ──REVEAL_SABOTEUR/ACCUSE──▶ saboteur_reveal
    RESTART (líder, qualquer fase) ▶ init, rodada 1, vidas cheias, novo sabotador.

Ações (``type`` + payload; quem pode):

* ``DEAL`` — líder, ``init``. Congela os assentos da rodada e sorteia números
  distintos 1..scale.
* ``ACK_CARD`` — online, qualquer assento da rodada, ``numbers``: marca "vi".
* ``REVEAL_CARD`` / ``HIDE_CARD`` / ``NEXT_CARD`` — Pass and Play, ``numbers``:
  revela a carta do assento da vez (``asSeat`` precisa ser o da vez), esconde,
  passa adiante (exige que a carta tenha sido vista). ``NEXT_CARD`` no último
  assento sorteia a pergunta e vai para ``ordering`` (ação de conteúdo).
* ``START_ORDERING`` — líder, ``numbers``. Sorteia a pergunta (sem repetir até
  esgotar) e vai para ``ordering``. (ação de conteúdo)
* ``MOVE {seatId, toIndex}`` — líder, ``ordering``: move um assento na fila.
* ``SET_ORDER {order: [seatId]}`` — líder, ``ordering``: fila inteira
  (permutação dos assentos da rodada).
* ``CHECK`` — líder, ``ordering``. Certo = números em ordem crescente. Erro
  custa 1 vida. Emite ``round_result {success, lives}``.
* ``NEXT_ROUND`` — líder, ``result`` sem ``gameOver``.
* ``VOTE {targetId}`` — online, cada assento da rodada, ``saboteur_voting``:
  voto (pode trocar; não vale votar em si mesmo).
* ``REVEAL_SABOTEUR`` — líder online, ``saboteur_voting``: apura os votos.
  Mais votado único = acusado; empate ou nenhum voto = sabotador vence.
* ``ACCUSE {suspectId}`` — Pass and Play (líder), ``saboteur_voting``:
  acusação única do grupo.
* ``RESTART`` — líder, qualquer fase.

View (``view_for``)::

    {
      "mode": "classic", "phase": str, "phaseSeq": int, "local": bool,
      "seats": [{"id", "name"}],
      "round": int, "lives": int, "maxLives": int, "scale": int, "saboteurMode": bool,
      "roundSeatIds": [seatId],              # congelados no DEAL ([] antes)
      "question": {"text", "themeId"} | null, # a partir de ordering
      "order": [seatId],                     # ordering/result/saboteur_*
      "viewed": [seatId],                    # numbers: quem já viu a carta
      "distribution": {order, cursor, current, revealed, viewed, done} | null,  # só local, numbers
      "you": {"seatId", "number": int | null, "isSaboteur": bool} | null,
            # online, assento da rodada (ou sentado). number só a partir de numbers.
      "card": {"seatId", "number", "isSaboteur"} | null,
            # local: só a carta da vez enquanto revelada
      "numbers": {seatId: int} | null,       # público só em result/saboteur_*
      "lastResult": {"success": bool, "livesLost": int} | null,
      "gameOver": bool,                      # result final sem sabotador
      "voting": {"voteCounts": {seatId: int}, "votedSeatIds": [seatId],
                 "myVote": seatId | null} | null,           # saboteur_voting
      "saboteurReveal": {"saboteurId", "suspectId": seatId | null, "groupWon": bool,
                         "voteCounts": {seatId: int}} | null  # saboteur_reveal
    }

Espectador (``None``): igual, sem ``you``/``card`` e sem ``myVote``.

Eventos: ``round_result {success, lives}``, ``saboteur_result {groupWon}``,
``not_enough_players {minPlayers}``.
"""

from __future__ import annotations

from typing import Annotated, Literal, Union

from pydantic import Field, TypeAdapter

from app.games.base import ActionModel, Actor, CamelModel, GameEngine, GameError, Viewer, viewer_seat
from app.games.common.actions import AckCard, HideCard, NextCard, RevealCard
from app.games.common.distribution import SecretDistribution
from app.games.content import FREE_MODE_QUESTION, ContentPool, ContentQuestion


class ItoConfig(CamelModel):
    scale: Literal[50, 100, 1000] = 100
    lives: int = Field(default=3, ge=1, le=5)
    saboteur: bool = False


class Deal(ActionModel):
    type: Literal["DEAL"]


class StartOrdering(ActionModel):
    type: Literal["START_ORDERING"]


class Move(ActionModel):
    type: Literal["MOVE"]
    seat_id: str
    to_index: int


class SetOrder(ActionModel):
    type: Literal["SET_ORDER"]
    order: list[str]


class Check(ActionModel):
    type: Literal["CHECK"]


class NextRound(ActionModel):
    type: Literal["NEXT_ROUND"]


class Restart(ActionModel):
    type: Literal["RESTART"]


class Vote(ActionModel):
    type: Literal["VOTE"]
    target_id: str


class RevealSaboteur(ActionModel):
    type: Literal["REVEAL_SABOTEUR"]


class Accuse(ActionModel):
    type: Literal["ACCUSE"]
    suspect_id: str


ItoAction = Annotated[
    Union[
        Deal, StartOrdering, Move, SetOrder, Check, NextRound, Restart,
        Vote, RevealSaboteur, Accuse, AckCard, RevealCard, HideCard, NextCard,
    ],
    Field(discriminator="type"),
]

ROLLING_SECONDS = 2.5
REVEALED_PHASES = ("result", "saboteur_voting", "saboteur_reveal")


class ItoEngine(GameEngine):
    mode = "classic"
    min_players = 2
    Config = ItoConfig
    Action = TypeAdapter(ItoAction)
    content_actions = frozenset({"START_ORDERING", "NEXT_CARD"})

    config: ItoConfig

    @classmethod
    def _validate_start_extra(cls, seats, config: ItoConfig) -> None:
        if len(seats) > config.scale:
            raise GameError("too_many_players", f"A escala {config.scale} aceita no máximo {config.scale} jogadores.")
        if config.saboteur and len(seats) < 3:
            raise GameError("not_enough_players", "O modo Sabotador precisa de pelo menos 3 jogadores.")

    def _content_ok(self, pool: ContentPool) -> bool:
        return pool.has_content_for("classic")

    # ----- estado ---------------------------------------------------------

    def _start(self) -> None:
        self._require_pool()
        self.used_questions: set[str] = set()
        self._new_game()

    def _new_game(self) -> None:
        self.round = 1
        self.lives = self.config.lives
        self.saboteur_id: str | None = self.rng.choice(self.seat_ids()) if self.config.saboteur and self.seats else None
        self._reset_round()
        self.game_over = False
        self._set_phase("init")

    def _reset_round(self) -> None:
        self.round_seats: list[str] = []
        self.names: dict[str, str] = {}
        self.numbers: dict[str, int] = {}
        self.order: list[str] = []
        self.question: ContentQuestion | None = None
        self.dist: SecretDistribution | None = None
        self.last_result: dict | None = None
        self.votes: dict[str, str] = {}
        self.accused: str | None = None
        self.group_won: bool | None = None
        self.final_counts: dict[str, int] = {}

    # ----- ações ----------------------------------------------------------

    def _act_deal(self, actor: Actor, act: Deal) -> None:
        self._require_host(actor)
        self._require_phase("init")
        n = len(self.seats)
        if n < self.min_players:
            raise GameError("not_enough_players", f"São necessários pelo menos {self.min_players} jogadores.")
        if n > self.config.scale:
            raise GameError("too_many_players", "Há mais jogadores do que números na escala.")
        self._reset_round()
        self.round_seats = self.seat_ids()
        self.names = {s.id: s.name for s in self.seats}
        drawn = self.rng.sample(range(1, self.config.scale + 1), n)
        self.numbers = dict(zip(self.round_seats, drawn))
        self.dist = SecretDistribution(self.round_seats, self.local)
        self._set_phase("rolling")
        self._schedule("rolling", ROLLING_SECONDS)

    def _timer_rolling(self) -> None:
        if self.phase == "rolling":
            self._set_phase("numbers")

    def _act_ack_card(self, actor: Actor, act: AckCard) -> None:
        self._require_phase("numbers")
        seat = self._acting_seat(actor)
        assert self.dist is not None
        if self.local:
            raise GameError("invalid_action", "No Pass and Play use REVEAL_CARD.")
        self.dist.ack(seat)

    def _act_reveal_card(self, actor: Actor, act: RevealCard) -> None:
        self._require_phase("numbers")
        assert self.dist is not None
        self.dist.reveal(actor.seat_id)

    def _act_hide_card(self, actor: Actor, act: HideCard) -> None:
        self._require_phase("numbers")
        assert self.dist is not None
        self.dist.hide()

    def _act_next_card(self, actor: Actor, act: NextCard) -> None:
        self._require_phase("numbers")
        assert self.dist is not None
        cur = self.dist.current
        if cur is not None and cur not in self.dist.viewed:
            raise GameError("card_not_seen", "Revele a carta antes de passar adiante.")
        if self.dist.cursor >= len(self.dist.order) - 1:
            self._require_pool()  # valida antes de mudar o estado
            self.dist.next()
            self._begin_ordering()
        else:
            self.dist.next()

    def _act_start_ordering(self, actor: Actor, act: StartOrdering) -> None:
        self._require_host(actor)
        self._require_phase("numbers")
        self._begin_ordering()

    def _begin_ordering(self) -> None:
        pool: ContentPool = self._require_pool()
        if pool.free_mode:
            self.question = ContentQuestion(FREE_MODE_QUESTION, "free")
        else:
            available = [q for q in pool.questions if q.text not in self.used_questions]
            if not available:
                self.used_questions.clear()
                available = list(pool.questions)
            self.question = self.rng.choice(available)
            self.used_questions.add(self.question.text)
        self.order = list(self.round_seats)
        self._set_phase("ordering")

    def _act_move(self, actor: Actor, act: Move) -> None:
        self._require_host(actor)
        self._require_phase("ordering")
        if act.seat_id not in self.order:
            raise GameError("unknown_seat", "Jogador não encontrado.")
        idx = max(0, min(act.to_index, len(self.order) - 1))
        self.order.remove(act.seat_id)
        self.order.insert(idx, act.seat_id)

    def _act_set_order(self, actor: Actor, act: SetOrder) -> None:
        self._require_host(actor)
        self._require_phase("ordering")
        if sorted(act.order) != sorted(self.order) or len(set(act.order)) != len(act.order):
            raise GameError("invalid_order", "A ordem precisa conter cada jogador da rodada uma vez.")
        self.order = list(act.order)

    def _act_check(self, actor: Actor, act: Check) -> None:
        self._require_host(actor)
        self._require_phase("ordering")
        nums = [self.numbers[s] for s in self.order]
        success = all(a < b for a, b in zip(nums, nums[1:]))
        lost = 0 if success else 1
        self.lives = max(0, self.lives - lost)
        self.last_result = {"success": success, "livesLost": lost}
        self._emit("round_result", {"success": success, "lives": self.lives})
        if self.lives == 0 and self.saboteur_id is not None and self.config.saboteur:
            self.votes = {}
            self._set_phase("saboteur_voting")
        else:
            self.game_over = self.lives == 0
            self._set_phase("result")

    def _act_next_round(self, actor: Actor, act: NextRound) -> None:
        self._require_host(actor)
        self._require_phase("result")
        if self.game_over:
            raise GameError("game_over", "Fim de jogo. Comece um novo jogo.")
        self.round += 1
        self._reset_round()
        self._set_phase("init")

    def _act_restart(self, actor: Actor, act: Restart) -> None:
        self._require_host(actor)
        self._new_game()

    def _act_vote(self, actor: Actor, act: Vote) -> None:
        self._require_phase("saboteur_voting")
        if self.local:
            raise GameError("invalid_action", "No Pass and Play o grupo faz uma única acusação.")
        voter = self._acting_seat(actor)
        if voter not in self.round_seats:
            raise GameError("not_in_round", "Você não está nesta rodada.")
        if act.target_id not in self.round_seats:
            raise GameError("unknown_seat", "Jogador não encontrado.")
        if act.target_id == voter:
            raise GameError("self_vote", "Você não pode votar em si mesmo.")
        self.votes[voter] = act.target_id

    def _vote_counts(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for target in self.votes.values():
            counts[target] = counts.get(target, 0) + 1
        return counts

    def _act_reveal_saboteur(self, actor: Actor, act: RevealSaboteur) -> None:
        self._require_host(actor)
        self._require_phase("saboteur_voting")
        if self.local:
            raise GameError("invalid_action", "No Pass and Play use ACCUSE.")
        counts = self._vote_counts()
        suspect = None
        if counts:
            top = max(counts.values())
            leaders = [s for s, c in counts.items() if c == top]
            if len(leaders) == 1:
                suspect = leaders[0]
        self._finish_saboteur(suspect, counts)

    def _act_accuse(self, actor: Actor, act: Accuse) -> None:
        self._require_host(actor)
        self._require_phase("saboteur_voting")
        if not self.local:
            raise GameError("invalid_action", "Online cada jogador vota com VOTE.")
        if act.suspect_id not in self.round_seats:
            raise GameError("unknown_seat", "Jogador não encontrado.")
        self._finish_saboteur(act.suspect_id, {})

    def _finish_saboteur(self, suspect: str | None, counts: dict[str, int]) -> None:
        self.accused = suspect
        self.final_counts = counts
        self.group_won = suspect is not None and suspect == self.saboteur_id
        self.game_over = True
        self._emit("saboteur_result", {"groupWon": self.group_won})
        self._set_phase("saboteur_reveal")

    # ----- entrada/saída --------------------------------------------------

    def _seat_left(self, seat_id: str) -> None:
        if self.phase == "saboteur_reveal":
            return  # jogo encerrado: mantém o resultado como está
        was_saboteur = seat_id == self.saboteur_id
        if was_saboteur:
            self.saboteur_id = None
        if seat_id in self.round_seats:
            self.round_seats.remove(seat_id)
            self.numbers.pop(seat_id, None)
            if seat_id in self.order:
                self.order.remove(seat_id)
            if self.dist is not None:
                self.dist.remove(seat_id)
            self.votes.pop(seat_id, None)
            self.votes = {v: t for v, t in self.votes.items() if t != seat_id}
        if self.phase == "saboteur_voting" and was_saboteur:
            # sem sabotador para descobrir: o jogo termina como derrota comum
            self.game_over = True
            self._set_phase("result")
        elif self.phase == "numbers" and self.local and self.dist is not None and self.dist.done and self.round_seats:
            if self._pool is not None and self._content_ok(self._pool):
                self._begin_ordering()

    # ----- view -----------------------------------------------------------

    def _card(self, seat_id: str) -> dict:
        number = self.numbers.get(seat_id) if self.phase not in ("init", "rolling") else None
        return {
            "seatId": seat_id,
            "number": number,
            "isSaboteur": bool(self.config.saboteur and seat_id == self.saboteur_id),
        }

    def view_for(self, viewer: Viewer | None) -> dict:
        me = viewer_seat(viewer)
        revealed = self.phase in REVEALED_PHASES
        you = None
        if me is not None and self.seat(me) is not None:
            you = self._card(me)
        card = None
        if viewer is not None and viewer.local and self.phase == "numbers" and self.dist is not None:
            cur = self.dist.current
            if cur is not None and self.dist.revealed and cur in viewer.seat_ids:
                card = self._card(cur)
        voting = None
        if self.phase == "saboteur_voting":
            voting = {
                "voteCounts": self._vote_counts(),
                "votedSeatIds": [s for s in self.round_seats if s in self.votes],
                "myVote": self.votes.get(me) if me else None,
            }
        sab_reveal = None
        if self.phase == "saboteur_reveal":
            sab_reveal = {
                "saboteurId": self.saboteur_id,
                "suspectId": self.accused,
                "groupWon": bool(self.group_won),
                "voteCounts": dict(self.final_counts),
            }
        return {
            **self._base_view(),
            "round": self.round,
            "lives": self.lives,
            "maxLives": self.config.lives,
            "scale": self.config.scale,
            "saboteurMode": self.config.saboteur,
            "roundSeatIds": list(self.round_seats),
            "question": {"text": self.question.text, "themeId": self.question.theme_id} if self.question else None,
            "order": list(self.order),
            "viewed": sorted(self.dist.viewed, key=self.round_seats.index) if self.dist and self.phase == "numbers" else [],
            "distribution": self.dist.view() if self.dist and self.local and self.phase == "numbers" else None,
            "you": you,
            "card": card,
            "numbers": dict(self.numbers) if revealed else None,
            "lastResult": self.last_result,
            "gameOver": self.game_over,
            "voting": voting,
            "saboteurReveal": sab_reveal,
        }
