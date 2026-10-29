"""Modelos de ação e handlers reaproveitados por vários motores."""

from __future__ import annotations

from typing import ClassVar, Literal

from pydantic import Field

from app.games.base import ActionModel, Actor, GameError
from app.games.common.countdown import Countdown


class AckCard(ActionModel):
    type: Literal["ACK_CARD"]


class RevealCard(ActionModel):
    type: Literal["REVEAL_CARD"]


class HideCard(ActionModel):
    type: Literal["HIDE_CARD"]


class NextCard(ActionModel):
    type: Literal["NEXT_CARD"]


class TimerPause(ActionModel):
    type: Literal["TIMER_PAUSE"]


class TimerResume(ActionModel):
    type: Literal["TIMER_RESUME"]


class TimerAdd(ActionModel):
    type: Literal["TIMER_ADD"]
    seconds: int = Field(default=30, ge=1, le=600)


class TimerReset(ActionModel):
    type: Literal["TIMER_RESET"]


TIMER_ACTIONS = (TimerPause, TimerResume, TimerAdd, TimerReset)
CARD_ACTIONS = (AckCard, RevealCard, HideCard, NextCard)


class TimerMixin:
    """Ações TIMER_* (só o líder) sobre ``self.countdown``.

    Ao esgotar: ``Emit("time_up")`` e o cronômetro fica pausado em 0 (não
    avança de fase sozinho).
    """

    countdown: Countdown
    timer_phases: ClassVar[tuple[str, ...]] = ()

    def _timer_guard(self, actor: Actor) -> None:
        self._require_host(actor)  # type: ignore[attr-defined]
        self._require_phase(*self.timer_phases)  # type: ignore[attr-defined]

    def _arm_countdown(self) -> None:
        now = self.clock()  # type: ignore[attr-defined]
        if self.countdown.paused:
            self._cancel("countdown")  # type: ignore[attr-defined]
        else:
            self._schedule("countdown", self.countdown.remaining(now))  # type: ignore[attr-defined]

    def _act_timer_pause(self, actor: Actor, act: TimerPause) -> None:
        self._timer_guard(actor)
        self.countdown.pause(self.clock())  # type: ignore[attr-defined]
        self._arm_countdown()

    def _act_timer_resume(self, actor: Actor, act: TimerResume) -> None:
        self._timer_guard(actor)
        now = self.clock()  # type: ignore[attr-defined]
        if self.countdown.expired(now):
            raise GameError("time_over", "O tempo acabou. Reinicie o cronômetro ou adicione tempo.")
        self.countdown.resume(now)
        self._arm_countdown()

    def _act_timer_add(self, actor: Actor, act: TimerAdd) -> None:
        self._timer_guard(actor)
        self.countdown.add(act.seconds, self.clock())  # type: ignore[attr-defined]
        self._arm_countdown()

    def _act_timer_reset(self, actor: Actor, act: TimerReset) -> None:
        """Volta ao tempo cheio mantendo o estado (rodando continua rodando)."""
        self._timer_guard(actor)
        was_running = not self.countdown.paused
        self.countdown.reset()
        if was_running:
            self.countdown.start(self.clock())  # type: ignore[attr-defined]
        self._arm_countdown()

    def _timer_countdown(self) -> None:
        self.countdown.finish()
        self._emit("time_up")  # type: ignore[attr-defined]
