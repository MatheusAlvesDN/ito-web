"""Cronômetro de servidor (puro: o horário ``now`` é sempre passado).

``view(now)`` → ``{"duration": float, "deadline": float | None, "paused": bool,
"remaining": float}``. ``deadline`` está no mesmo relógio do servidor
(``serverNow`` do STATE, em segundos); é ``None`` quando pausado. O cliente
calcula ``deadline - serverNow`` (corrigindo o desvio do próprio relógio) ou
usa ``remaining`` diretamente quando pausado.
"""

from __future__ import annotations


class Countdown:
    def __init__(self, duration: float):
        self.duration = float(duration)
        self._remaining = float(duration)
        self.deadline: float | None = None

    @property
    def paused(self) -> bool:
        return self.deadline is None

    def remaining(self, now: float) -> float:
        if self.deadline is None:
            return max(0.0, self._remaining)
        return max(0.0, self.deadline - now)

    def expired(self, now: float) -> bool:
        return self.remaining(now) <= 0

    def start(self, now: float) -> None:
        """Começa/retoma a contagem a partir do tempo restante."""
        if self.deadline is None and self._remaining > 0:
            self.deadline = now + self._remaining

    resume = start

    def pause(self, now: float) -> None:
        if self.deadline is not None:
            self._remaining = max(0.0, self.deadline - now)
            self.deadline = None

    def add(self, seconds: float, now: float) -> None:
        if self.deadline is not None:
            self.deadline = max(now, self.deadline) + seconds
        else:
            self._remaining = max(0.0, self._remaining) + seconds

    def reset(self, duration: float | None = None) -> None:
        """Volta ao tempo cheio, **pausado**."""
        if duration is not None:
            self.duration = float(duration)
        self._remaining = self.duration
        self.deadline = None

    def finish(self) -> None:
        """Marca como esgotado (pausado em 0)."""
        self._remaining = 0.0
        self.deadline = None

    def view(self, now: float) -> dict:
        return {
            "duration": self.duration,
            "deadline": self.deadline,
            "paused": self.paused,
            "remaining": round(self.remaining(now), 3),
        }
