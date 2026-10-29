"""Quem Sou Eu (modo ``whoami``). Mín. 2 jogadores.

Config (camelCase): ``roundSeconds`` 30..900 (padrão 120).

Cada assento recebe uma personalidade (sem repetir entre assentos enquanto o
pool permitir; o pool é deduplicado entre temas). O torneio é uma sequência de
partidas; cada partida tem rodadas.

Fases::

    reveal (só local) ──NEXT_CARD no último──▶ playing ──END_MATCH──▶ match_ended
    online: começa direto em playing
    match_ended ──NEXT_MATCH──▶ reveal/playing (nova partida)
    match_ended ──SHOW_OVERALL──▶ overall ──NEXT_MATCH──▶ reveal/playing
    RESET_ALL (líder, qualquer fase) ▶ partida 1, histórico zerado

Ações (``type`` + payload; quem pode):

* ``REVEAL_CARD`` / ``HIDE_CARD`` / ``NEXT_CARD`` — Pass and Play, ``reveal``:
  mostra a personalidade do assento da vez, esconde, passa adiante.
* ``REROLL {seatId}`` — troca a personalidade de ``seatId`` (ação de conteúdo).
  Local em ``reveal``: só o assento da vez com a carta revelada. Em
  ``playing``: só o líder.
* ``NEXT_ROUND`` — líder, ``playing``: rodada+1; cronômetro volta ao tempo
  cheio, pausado.
* ``TIMER_PAUSE`` / ``TIMER_RESUME`` / ``TIMER_ADD {seconds=30}`` /
  ``TIMER_RESET`` — líder, ``playing``. O cronômetro começa pausado em cada
  rodada. Ao esgotar: evento ``time_up``.
* ``TOGGLE_GUESSED {seatId}`` — ``playing``. Líder, ou (online) qualquer
  assento exceto o próprio ``seatId``. Marcar define ``roundsToGuess`` = rodada
  atual; desmarcar limpa.
* ``ADJUST_ROUNDS {seatId, delta}`` — líder, ``playing``/``match_ended``:
  ``roundsToGuess = max(1, (roundsToGuess ou rodada) + delta)``.
* ``END_MATCH`` — líder, ``playing``. Quem não acertou fica com
  ``roundsToGuess = rodada`` (penalidade). Grava a partida no histórico.
* ``NEXT_MATCH`` — líder, ``match_ended``/``overall`` (ação de conteúdo).
* ``SHOW_OVERALL`` — líder, ``match_ended``.
* ``RESET_ALL`` — líder, qualquer fase (ação de conteúdo).

View::

    {
      "mode": "whoami", "phase": str, "phaseSeq": int, "local": bool,
      "seats": [{"id", "name"}],
      "matchNumber": int, "round": int,
      "players": [{"seatId", "name", "personality": str | null,
                   "guessed": bool, "roundsToGuess": int | null}],
            # personality: local → sempre visível; online → null no próprio
            # assento até match_ended/overall; espectador (None) → sempre null
      "distribution": {order, cursor, current, revealed, viewed, done} | null,  # só local em reveal
      "card": {"seatId", "personality"} | null,   # local: carta da vez revelada (reveal)
      "timer": {duration, deadline, paused, remaining} | null,   # playing
      "history": [{"matchNumber", "results": [{"seatId", "name", "personality",
                                                "guessed", "roundsToGuess"}]}],
      "overall": [{"seatId", "name", "matchesGuessed", "totalRounds", "totalMatches",
                   "history": [{"matchNumber", "rounds", "guessed", "personality"}]}] | null
            # em match_ended/overall; ordenado: matchesGuessed desc, totalRounds asc
    }

Eventos: ``time_up``, ``guessed {seatId, guessed}``, ``not_enough_players``.

Entradas no meio: online em ``playing`` o novo assento recebe uma
personalidade na hora; nos demais casos entra na próxima partida.
"""

from __future__ import annotations

from typing import Annotated, Literal, Union

from pydantic import Field, TypeAdapter

from app.games.base import ActionModel, Actor, CamelModel, GameEngine, GameError, Seat, Viewer, viewer_seat
from app.games.common.actions import (
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


class WhoAmIConfig(CamelModel):
    round_seconds: int = Field(default=120, ge=30, le=900)


class Reroll(ActionModel):
    type: Literal["REROLL"]
    seat_id: str


class NextRound(ActionModel):
    type: Literal["NEXT_ROUND"]


class ToggleGuessed(ActionModel):
    type: Literal["TOGGLE_GUESSED"]
    seat_id: str


class AdjustRounds(ActionModel):
    type: Literal["ADJUST_ROUNDS"]
    seat_id: str
    delta: int = Field(ge=-50, le=50)


class EndMatch(ActionModel):
    type: Literal["END_MATCH"]


class NextMatch(ActionModel):
    type: Literal["NEXT_MATCH"]


class ShowOverall(ActionModel):
    type: Literal["SHOW_OVERALL"]


class ResetAll(ActionModel):
    type: Literal["RESET_ALL"]


WhoAmIAction = Annotated[
    Union[
        RevealCard, HideCard, NextCard, Reroll, NextRound, ToggleGuessed, AdjustRounds,
        EndMatch, NextMatch, ShowOverall, ResetAll, TimerPause, TimerResume, TimerAdd, TimerReset,
    ],
    Field(discriminator="type"),
]

PERSONAL_REVEALED = ("match_ended", "overall")


class WhoAmIEngine(TimerMixin, GameEngine):
    mode = "whoami"
    min_players = 2
    Config = WhoAmIConfig
    Action = TypeAdapter(WhoAmIAction)
    content_actions = frozenset({"REROLL", "NEXT_MATCH", "RESET_ALL"})
    timer_phases = ("playing",)

    config: WhoAmIConfig

    def _content_ok(self, pool: ContentPool) -> bool:
        return pool.has_content_for("whoami")

    def _start(self) -> None:
        self.countdown = Countdown(self.config.round_seconds)
        self._reset_all()

    def _reset_all(self) -> None:
        self.history: list[dict] = []
        self.match_number = 0
        self._new_match()

    def _new_match(self) -> None:
        pool: ContentPool = self._require_pool()
        if len(self.seats) < self.min_players:
            raise GameError("not_enough_players", f"São necessários pelo menos {self.min_players} jogadores.")
        self.match_number += 1
        self.round = 1
        self.names = {s.id: s.name for s in self.seats}
        self.players: dict[str, dict] = {}
        deck = list(pool.personalities)
        self.rng.shuffle(deck)
        for i, sid in enumerate(self.seat_ids()):
            self.players[sid] = {"personality": deck[i % len(deck)], "guessed": False, "roundsToGuess": None}
        self.countdown.reset(self.config.round_seconds)
        self.dist: SecretDistribution | None = None
        if self.local:
            self.dist = SecretDistribution(list(self.players), True)
            self._set_phase("reveal")
        else:
            self._set_phase("playing")

    def _draw_for(self, seat_id: str) -> str:
        pool: ContentPool = self._require_pool()
        current = self.players.get(seat_id, {}).get("personality")
        used = {p["personality"] for sid, p in self.players.items() if sid != seat_id}
        options = [p for p in pool.personalities if p not in used and p != current]
        if not options:
            options = [p for p in pool.personalities if p != current] or list(pool.personalities)
        return self.rng.choice(options)

    def _player(self, seat_id: str) -> dict:
        if seat_id not in self.players:
            raise GameError("unknown_seat", "Jogador não encontrado.")
        return self.players[seat_id]

    # ----- ações ----------------------------------------------------------

    def _act_reveal_card(self, actor: Actor, act: RevealCard) -> None:
        self._require_phase("reveal")
        self.dist.reveal(actor.seat_id)

    def _act_hide_card(self, actor: Actor, act: HideCard) -> None:
        self._require_phase("reveal")
        self.dist.hide()

    def _act_next_card(self, actor: Actor, act: NextCard) -> None:
        self._require_phase("reveal")
        if self.dist.next():
            self._set_phase("playing")

    def _act_reroll(self, actor: Actor, act: Reroll) -> None:
        self._require_phase("reveal", "playing")
        self._player(act.seat_id)
        if self.phase == "reveal":
            if not (self.dist.revealed and self.dist.current == act.seat_id):
                raise GameError("not_your_turn", "Só dá para trocar a carta que está sendo mostrada.")
        else:
            self._require_host(actor)
        self.players[act.seat_id]["personality"] = self._draw_for(act.seat_id)

    def _act_next_round(self, actor: Actor, act: NextRound) -> None:
        self._require_host(actor)
        self._require_phase("playing")
        self.round += 1
        self.countdown.reset(self.config.round_seconds)
        self._arm_countdown()

    def _act_toggle_guessed(self, actor: Actor, act: ToggleGuessed) -> None:
        self._require_phase("playing")
        p = self._player(act.seat_id)
        if not actor.is_host:
            if self.local or actor.seat_id is None:
                raise GameError("not_allowed", "Só o líder pode fazer isso.")
            if actor.seat_id == act.seat_id:
                raise GameError("not_allowed", "Você não pode marcar o próprio acerto.")
        p["guessed"] = not p["guessed"]
        p["roundsToGuess"] = self.round if p["guessed"] else None
        self._emit("guessed", {"seatId": act.seat_id, "guessed": p["guessed"]})

    def _act_adjust_rounds(self, actor: Actor, act: AdjustRounds) -> None:
        self._require_host(actor)
        self._require_phase("playing", "match_ended")
        p = self._player(act.seat_id)
        base = p["roundsToGuess"] if p["roundsToGuess"] is not None else self.round
        p["roundsToGuess"] = max(1, base + act.delta)
        if self.phase == "match_ended":
            self._record_match()

    def _act_end_match(self, actor: Actor, act: EndMatch) -> None:
        self._require_host(actor)
        self._require_phase("playing")
        for p in self.players.values():
            if not p["guessed"] or p["roundsToGuess"] is None:
                p["roundsToGuess"] = self.round  # penalidade de quem não acertou
        self._record_match()
        self.countdown.pause(self.clock())
        self._set_phase("match_ended")

    def _record_match(self) -> None:
        results = [
            {
                "seatId": sid,
                "name": self.names.get(sid) or self._name(sid),
                "personality": p["personality"],
                "guessed": p["guessed"],
                "roundsToGuess": p["roundsToGuess"] if p["roundsToGuess"] is not None else self.round,
            }
            for sid, p in self.players.items()
        ]
        record = {"matchNumber": self.match_number, "results": results}
        self.history = [m for m in self.history if m["matchNumber"] != self.match_number] + [record]

    def _act_next_match(self, actor: Actor, act: NextMatch) -> None:
        self._require_host(actor)
        self._require_phase("match_ended", "overall")
        self._new_match()

    def _act_show_overall(self, actor: Actor, act: ShowOverall) -> None:
        self._require_host(actor)
        self._require_phase("match_ended")
        self._set_phase("overall")

    def _act_reset_all(self, actor: Actor, act: ResetAll) -> None:
        self._require_host(actor)
        self._require_pool()
        if len(self.seats) < self.min_players:
            raise GameError("not_enough_players", f"São necessários pelo menos {self.min_players} jogadores.")
        self._reset_all()

    # ----- entrada/saída --------------------------------------------------

    def _seat_left(self, seat_id: str) -> None:
        if self.phase in PERSONAL_REVEALED:
            return  # partida encerrada: mantém o resultado
        self.players.pop(seat_id, None)
        if self.dist is not None:
            self.dist.remove(seat_id)
            if self.phase == "reveal" and self.dist.done:
                self._set_phase("playing")

    def _seat_joined(self, seat: Seat) -> None:
        if self.phase == "playing" and not self.local and self._pool is not None:
            self.names[seat.id] = seat.name
            self.players[seat.id] = {"personality": None, "guessed": False, "roundsToGuess": None}
            self.players[seat.id]["personality"] = self._draw_for(seat.id)

    # ----- view -----------------------------------------------------------

    def _overall(self) -> list[dict]:
        stats: dict[str, dict] = {}
        for match in self.history:
            for r in match["results"]:
                s = stats.setdefault(
                    r["seatId"],
                    {"seatId": r["seatId"], "name": r["name"], "matchesGuessed": 0, "totalRounds": 0,
                     "totalMatches": 0, "history": []},
                )
                s["name"] = self._name(r["seatId"]) or r["name"]
                s["totalMatches"] += 1  # só as partidas que o jogador jogou
                s["totalRounds"] += r["roundsToGuess"]
                s["matchesGuessed"] += 1 if r["guessed"] else 0
                s["history"].append({
                    "matchNumber": match["matchNumber"], "rounds": r["roundsToGuess"],
                    "guessed": r["guessed"], "personality": r["personality"],
                })
        # Desempate pela média de rodadas, para quem entrou depois não levar vantagem por jogar menos
        return sorted(stats.values(), key=lambda s: (-s["matchesGuessed"], s["totalRounds"] / s["totalMatches"]))

    def view_for(self, viewer: Viewer | None) -> dict:
        me = viewer_seat(viewer)
        public = viewer is None  # espectador/público: nenhuma personalidade
        hide_own = me is not None and self.phase not in PERSONAL_REVEALED
        players = [
            {
                "seatId": sid,
                "name": self._name(sid, self.names),
                "personality": None if (public or (hide_own and sid == me)) else p["personality"],
                "guessed": p["guessed"],
                "roundsToGuess": p["roundsToGuess"],
            }
            for sid, p in self.players.items()
        ]
        card = None
        if viewer is not None and viewer.local and self.phase == "reveal" and self.dist is not None:
            cur = self.dist.current
            if cur is not None and self.dist.revealed:
                card = {"seatId": cur, "personality": self.players[cur]["personality"]}
        history = self.history
        if hide_own:
            # partida em andamento ainda não está no histórico; partidas antigas são públicas
            history = [m for m in self.history if m["matchNumber"] != self.match_number]
        overall = self._overall() if self.phase in PERSONAL_REVEALED else None
        if public:
            history = [
                {**m, "results": [{**r, "personality": None} for r in m["results"]]} for m in history
            ]
            if overall is not None:
                overall = [
                    {**o, "history": [{**h, "personality": None} for h in o["history"]]} for o in overall
                ]
        return {
            **self._base_view(),
            "matchNumber": self.match_number,
            "round": self.round,
            "players": players,
            "distribution": self.dist.view() if self.dist is not None and self.phase == "reveal" else None,
            "card": card,
            "timer": self.countdown.view(self.clock()) if self.phase == "playing" else None,
            "history": history,
            "overall": overall,
        }
