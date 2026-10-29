"""Impostor (modo ``impostor``). Mín. 3 jogadores.

Config (camelCase): ``discussionSeconds`` 30..900 (padrão 120).

Fases::

    distribution ──(local: NEXT_CARD no último / online: START_DISCUSSION)──▶ discussion
    discussion ──REVEAL──▶ reveal ──JUDGE──▶ reveal (com outcome)
    NEW_ROUND (líder, qualquer fase) ▶ distribution com novo impostor e cenário

A cada rodada: congela os assentos, sorteia o impostor e um cenário; o grupo
honesto recebe ``honest`` e o impostor uma das ``variations`` (sorteada).

Ações (``type`` + payload; quem pode):

* ``ACK_CARD`` — online, assento da rodada, ``distribution``: "já vi".
* ``REVEAL_CARD`` / ``HIDE_CARD`` / ``NEXT_CARD`` — Pass and Play,
  ``distribution``: revela a carta do assento da vez (``asSeat`` = o da vez),
  esconde, passa adiante. ``NEXT_CARD`` no último → ``discussion``.
* ``START_DISCUSSION`` — líder, ``distribution`` (online e local). O
  cronômetro já começa rodando.
* ``TIMER_PAUSE`` / ``TIMER_RESUME`` / ``TIMER_ADD {seconds=30}`` /
  ``TIMER_RESET`` — líder, ``discussion``. Ao esgotar: evento ``time_up`` (não
  muda de fase).
* ``REVEAL`` — líder, ``discussion``.
* ``JUDGE {impostorGuessed: bool}`` — líder, ``reveal``: o impostor acertou a
  pergunta do grupo? true → ``impostor_won``; false → ``group_won``.
* ``NEW_ROUND`` — líder, qualquer fase (ação de conteúdo).

View::

    {
      "mode": "impostor", "phase": str, "phaseSeq": int, "local": bool,
      "seats": [{"id", "name"}],
      "round": int,
      "roundSeatIds": [seatId],
      "viewed": [seatId],                         # distribution
      "distribution": {order, cursor, current, revealed, viewed, done} | null,  # só local
      "you": {"seatId", "question": str, "isImpostor": bool} | null,
            # online, assento da rodada; sempre a própria carta (exceto em reveal, onde tudo é público)
      "card": {"seatId", "question", "isImpostor"} | null,
            # local: só a carta da vez enquanto revelada
      "timer": {duration, deadline, paused, remaining} | null,   # discussion
      "reveal": {"impostorId", "honestQuestion", "impostorQuestion",
                 "outcome": "pending" | "impostor_won" | "group_won"} | null,  # só em reveal
      "history": [{"round", "impostorId", "outcome"}]  # rodadas julgadas
    }

Espectador (``None``): sem ``you``/``card``; ``reveal`` só na fase reveal.

Eventos: ``time_up``, ``round_aborted {reason: "impostor_left"}``,
``not_enough_players {minPlayers}``.

Saídas: se o impostor sai, a rodada é refeita (se ainda houver ≥3). Quem entra
no meio joga a partir da próxima rodada.
"""

from __future__ import annotations

from typing import Annotated, Literal, Union

from pydantic import Field, TypeAdapter

from app.games.base import ActionModel, Actor, CamelModel, GameEngine, GameError, Viewer, viewer_seat
from app.games.common.actions import (
    AckCard,
    HideCard,
    NextCard,
    RevealCard,
    TimerAdd,
    TimerMixin,
    TimerPause,
    TimerReset,
    TimerResume,
)
from app.games.common.countdown import Countdown
from app.games.common.distribution import SecretDistribution
from app.games.content import ContentPool


class ImpostorConfig(CamelModel):
    discussion_seconds: int = Field(default=120, ge=30, le=900)


class StartDiscussion(ActionModel):
    type: Literal["START_DISCUSSION"]


class Reveal(ActionModel):
    type: Literal["REVEAL"]


class Judge(ActionModel):
    type: Literal["JUDGE"]
    impostor_guessed: bool


class NewRound(ActionModel):
    type: Literal["NEW_ROUND"]


ImpostorAction = Annotated[
    Union[
        AckCard, RevealCard, HideCard, NextCard, StartDiscussion, Reveal, Judge, NewRound,
        TimerPause, TimerResume, TimerAdd, TimerReset,
    ],
    Field(discriminator="type"),
]


class ImpostorEngine(TimerMixin, GameEngine):
    mode = "impostor"
    min_players = 3
    Config = ImpostorConfig
    Action = TypeAdapter(ImpostorAction)
    content_actions = frozenset({"NEW_ROUND"})
    timer_phases = ("discussion",)

    config: ImpostorConfig

    def _content_ok(self, pool: ContentPool) -> bool:
        return pool.has_content_for("impostor")

    def _start(self) -> None:
        self.round = 0
        self.history: list[dict] = []
        self.countdown = Countdown(self.config.discussion_seconds)
        self._new_round()

    def _new_round(self) -> None:
        pool: ContentPool = self._require_pool()
        if len(self.seats) < self.min_players:
            raise GameError("not_enough_players", f"São necessários pelo menos {self.min_players} jogadores.")
        self.round += 1
        self.round_seats = self.seat_ids()
        self.impostor_id = self.rng.choice(self.round_seats)
        scenario = self.rng.choice(pool.scenarios)
        self.honest_question = scenario.honest
        self.impostor_question = self.rng.choice(scenario.variations)
        self.dist = SecretDistribution(self.round_seats, self.local)
        self.outcome = "pending"
        self.countdown.reset(self.config.discussion_seconds)
        self._set_phase("distribution")

    # ----- ações ----------------------------------------------------------

    def _act_ack_card(self, actor: Actor, act: AckCard) -> None:
        self._require_phase("distribution")
        if self.local:
            raise GameError("invalid_action", "No Pass and Play use REVEAL_CARD.")
        seat = self._acting_seat(actor)
        self.dist.ack(seat)

    def _act_reveal_card(self, actor: Actor, act: RevealCard) -> None:
        self._require_phase("distribution")
        self.dist.reveal(actor.seat_id)

    def _act_hide_card(self, actor: Actor, act: HideCard) -> None:
        self._require_phase("distribution")
        self.dist.hide()

    def _act_next_card(self, actor: Actor, act: NextCard) -> None:
        self._require_phase("distribution")
        if self.dist.next():
            self._begin_discussion()

    def _act_start_discussion(self, actor: Actor, act: StartDiscussion) -> None:
        self._require_host(actor)
        self._require_phase("distribution")
        self._begin_discussion()

    def _begin_discussion(self) -> None:
        self._set_phase("discussion")
        self.countdown.reset(self.config.discussion_seconds)
        self.countdown.start(self.clock())
        self._arm_countdown()

    def _act_reveal(self, actor: Actor, act: Reveal) -> None:
        self._require_host(actor)
        self._require_phase("discussion")
        self.countdown.pause(self.clock())
        self._set_phase("reveal")

    def _act_judge(self, actor: Actor, act: Judge) -> None:
        self._require_host(actor)
        self._require_phase("reveal")
        self.outcome = "impostor_won" if act.impostor_guessed else "group_won"
        entry = {"round": self.round, "impostorId": self.impostor_id, "outcome": self.outcome}
        self.history = [h for h in self.history if h["round"] != self.round] + [entry]

    def _act_new_round(self, actor: Actor, act: NewRound) -> None:
        self._require_host(actor)
        self._new_round()

    # ----- entrada/saída --------------------------------------------------

    def _seat_left(self, seat_id: str) -> None:
        if seat_id not in self.round_seats:
            return
        self.round_seats.remove(seat_id)
        self.dist.remove(seat_id)
        if self.phase == "reveal":
            return
        if seat_id == self.impostor_id:
            self._emit("round_aborted", {"reason": "impostor_left"})
            if len(self.seats) >= self.min_players and self._pool is not None:
                self._new_round()
        elif self.phase == "distribution" and self.local and self.dist.done:
            self._begin_discussion()

    # ----- view -----------------------------------------------------------

    def _card(self, seat_id: str) -> dict:
        is_imp = seat_id == self.impostor_id
        return {
            "seatId": seat_id,
            "question": self.impostor_question if is_imp else self.honest_question,
            "isImpostor": is_imp,
        }

    def view_for(self, viewer: Viewer | None) -> dict:
        me = viewer_seat(viewer)
        you = self._card(me) if me is not None and me in self.round_seats else None
        card = None
        if viewer is not None and viewer.local and self.phase == "distribution":
            cur = self.dist.current
            if cur is not None and self.dist.revealed and cur in viewer.seat_ids:
                card = self._card(cur)
        reveal = None
        if self.phase == "reveal":
            reveal = {
                "impostorId": self.impostor_id,
                "honestQuestion": self.honest_question,
                "impostorQuestion": self.impostor_question,
                "outcome": self.outcome,
            }
        return {
            **self._base_view(),
            "round": self.round,
            "roundSeatIds": list(self.round_seats),
            "viewed": [s for s in self.round_seats if s in self.dist.viewed] if self.phase == "distribution" else [],
            "distribution": self.dist.view() if self.local and self.phase == "distribution" else None,
            "you": you,
            "card": card,
            "timer": self.countdown.view(self.clock()) if self.phase == "discussion" else None,
            "reveal": reveal,
            "history": list(self.history),
        }
