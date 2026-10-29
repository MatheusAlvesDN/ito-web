"""O Que Você Sabe (modo ``whatdoyouknow``). Mín. 3 jogadores. Sem fim de jogo.

Config: nenhuma.

Cada rodada sorteia um **alvo** (sem repetir até todos terem sido alvo; aí a
fila é refeita) e uma **pergunta** (sem repetir até esgotar). O alvo responde;
os outros tentam adivinhar. Na pontuação o líder marca quem acertou.

Fases::

    question ──GO_SCORING──▶ scoring ──CONFIRM──▶ leaderboard ──NEXT_ROUND──▶ question
    (NEXT_ROUND também pode ser usado em question para pular a pergunta)

Ações (``type`` + payload; quem pode — todas do líder):

* ``GO_SCORING`` — ``question``.
* ``TOGGLE_WINNER {seatId}`` — ``scoring``; ``seatId`` ≠ alvo.
* ``CONFIRM`` — ``scoring``: alvo +1 por acertador; cada acertador +1. Emite
  ``round_scored {targetId, winners, gains}``.
* ``NEXT_ROUND`` — ``leaderboard`` ou ``question`` (ação de conteúdo).

View (igual para todos — não há segredos)::

    {
      "mode": "whatdoyouknow", "phase": str, "phaseSeq": int, "local": bool,
      "seats": [{"id", "name"}],
      "round": int,
      "targetId": seatId | null,
      "question": {"text", "themeId"} | null,
      "winners": [seatId],                 # marcados na pontuação atual
      "scores": {seatId: int},
      "ranking": [{"seatId", "name", "score"}],   # score desc, depois ordem dos assentos
      "lastGains": {seatId: int} | null     # ganhos da última CONFIRM (leaderboard)
    }

Saídas/entradas: quem sai deixa o placar e a fila; se era o alvo (em question
ou scoring) um novo alvo é sorteado (evento ``target_changed``). Quem entra
começa com 0 e entra na fila de alvos.
"""

from __future__ import annotations

from typing import Annotated, Literal, Union

from pydantic import Field, TypeAdapter

from app.games.base import ActionModel, Actor, CamelModel, GameEngine, GameError, Seat, Viewer
from app.games.content import ContentPool, ContentQuestion


class WhatDoYouKnowConfig(CamelModel):
    pass


class GoScoring(ActionModel):
    type: Literal["GO_SCORING"]


class ToggleWinner(ActionModel):
    type: Literal["TOGGLE_WINNER"]
    seat_id: str


class Confirm(ActionModel):
    type: Literal["CONFIRM"]


class NextRound(ActionModel):
    type: Literal["NEXT_ROUND"]


WhatDoYouKnowAction = Annotated[
    Union[GoScoring, ToggleWinner, Confirm, NextRound],
    Field(discriminator="type"),
]


class WhatDoYouKnowEngine(GameEngine):
    mode = "whatdoyouknow"
    min_players = 3
    Config = WhatDoYouKnowConfig
    Action = TypeAdapter(WhatDoYouKnowAction)
    content_actions = frozenset({"NEXT_ROUND"})

    def _content_ok(self, pool: ContentPool) -> bool:
        return pool.has_content_for("whatdoyouknow")

    def _start(self) -> None:
        self._require_pool()
        self.round = 0
        self.scores: dict[str, int] = {sid: 0 for sid in self.seat_ids()}
        self.remaining: list[str] = []
        self.used: set[str] = set()
        self.target_id: str | None = None
        self.question: ContentQuestion | None = None
        self.winners: list[str] = []
        self.last_gains: dict[str, int] | None = None
        self._new_round()

    def _draw_target(self) -> None:
        if not self.remaining:
            self.remaining = self.seat_ids()
        self.target_id = self.rng.choice(self.remaining)
        self.remaining.remove(self.target_id)

    def _new_round(self) -> None:
        pool: ContentPool = self._require_pool()
        if len(self.seats) < self.min_players:
            raise GameError("not_enough_players", f"São necessários pelo menos {self.min_players} jogadores.")
        available = [q for q in pool.questions if q.text not in self.used]
        if not available:
            self.used.clear()
            available = list(pool.questions)
        self.question = self.rng.choice(available)
        self.used.add(self.question.text)
        self.round += 1
        self._draw_target()
        self.winners = []
        self.last_gains = None
        self._set_phase("question")

    # ----- ações ----------------------------------------------------------

    def _act_go_scoring(self, actor: Actor, act: GoScoring) -> None:
        self._require_host(actor)
        self._require_phase("question")
        self._set_phase("scoring")

    def _act_toggle_winner(self, actor: Actor, act: ToggleWinner) -> None:
        self._require_host(actor)
        self._require_phase("scoring")
        self._require_seat_id(act.seat_id)
        if act.seat_id == self.target_id:
            raise GameError("invalid_target", "Quem respondeu não pode ser marcado como acertador.")
        if act.seat_id in self.winners:
            self.winners.remove(act.seat_id)
        else:
            self.winners.append(act.seat_id)

    def _act_confirm(self, actor: Actor, act: Confirm) -> None:
        self._require_host(actor)
        self._require_phase("scoring")
        gains: dict[str, int] = {}
        if self.target_id is not None:
            gains[self.target_id] = len(self.winners)
        for w in self.winners:
            gains[w] = gains.get(w, 0) + 1
        for sid, g in gains.items():
            if sid in self.scores:
                self.scores[sid] += g
        self.last_gains = gains
        self._emit("round_scored", {"targetId": self.target_id, "winners": list(self.winners), "gains": gains})
        self._set_phase("leaderboard")

    def _act_next_round(self, actor: Actor, act: NextRound) -> None:
        self._require_host(actor)
        self._require_phase("leaderboard", "question")
        self._new_round()

    # ----- entrada/saída --------------------------------------------------

    def _seat_left(self, seat_id: str) -> None:
        self.scores.pop(seat_id, None)
        if seat_id in self.remaining:
            self.remaining.remove(seat_id)
        if seat_id in self.winners:
            self.winners.remove(seat_id)
        if seat_id == self.target_id and self.phase in ("question", "scoring"):
            self.winners = []
            if self.seats:
                self._draw_target()
                self._emit("target_changed", {"targetId": self.target_id})
                if self.phase == "scoring":
                    self._set_phase("question")
            else:
                self.target_id = None

    def _seat_joined(self, seat: Seat) -> None:
        self.scores.setdefault(seat.id, 0)
        if seat.id not in self.remaining:
            self.remaining.append(seat.id)

    # ----- view -----------------------------------------------------------

    def view_for(self, viewer: Viewer | None) -> dict:
        order = {sid: i for i, sid in enumerate(self.seat_ids())}
        ranking = sorted(
            ({"seatId": s.id, "name": s.name, "score": self.scores.get(s.id, 0)} for s in self.seats),
            key=lambda r: (-r["score"], order[r["seatId"]]),
        )
        return {
            **self._base_view(),
            "round": self.round,
            "targetId": self.target_id,
            "question": {"text": self.question.text, "themeId": self.question.theme_id} if self.question else None,
            "winners": list(self.winners),
            "scores": {s.id: self.scores.get(s.id, 0) for s in self.seats},
            "ranking": ranking,
            "lastGains": self.last_gains,
        }
