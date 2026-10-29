"""Distribuição de cartas secretas.

Pass and Play (``local=True``): o celular passa de mão em mão na ordem
``order``. Só o assento da vez (``current``) pode revelar a própria carta;
``next()`` exige que ele já tenha visto a carta e esconde/avança.

Online (``local=False``): cada assento sempre vê a própria carta; ``ack(seat)``
só marca que ele viu (contagem "X de Y viram").

``view()`` → ``{"order": [seatId], "cursor": int, "current": seatId | None,
"revealed": bool, "viewed": [seatId], "done": bool}``.
"""

from __future__ import annotations

from app.games.base import GameError


class SecretDistribution:
    def __init__(self, seat_ids: list[str], local: bool):
        self.order = list(seat_ids)
        self.local = local
        self.cursor = 0
        self.revealed = False
        self.viewed: set[str] = set()

    @property
    def current(self) -> str | None:
        if not self.local or self.cursor >= len(self.order):
            return None
        return self.order[self.cursor]

    @property
    def done(self) -> bool:
        if self.local:
            return self.cursor >= len(self.order)
        return all(s in self.viewed for s in self.order)

    def _require_local(self) -> None:
        if not self.local:
            raise GameError("invalid_action", "Ação disponível só no modo Pass and Play.")

    def reveal(self, as_seat: str | None = None) -> str:
        """Revela a carta do assento da vez. Devolve o id revelado."""
        self._require_local()
        cur = self.current
        if cur is None:
            raise GameError("invalid_phase", "Todas as cartas já foram vistas.")
        if as_seat is not None and as_seat != cur:
            raise GameError("not_your_turn", "Não é a vez desse jogador.")
        self.revealed = True
        self.viewed.add(cur)
        return cur

    def hide(self) -> None:
        self._require_local()
        self.revealed = False

    def next(self) -> bool:
        """Passa para o próximo. Devolve True quando todos já viram."""
        self._require_local()
        cur = self.current
        if cur is None:
            return True
        if cur not in self.viewed:
            raise GameError("card_not_seen", "Revele a carta antes de passar adiante.")
        self.revealed = False
        self.cursor += 1
        return self.done

    def ack(self, seat_id: str) -> None:
        if seat_id not in self.order:
            raise GameError("unknown_seat", "Jogador não está nesta rodada.")
        self.viewed.add(seat_id)

    def visible_to(self, seat_id: str) -> bool:
        """A carta de ``seat_id`` pode aparecer na view dele agora?"""
        if seat_id not in self.order:
            return False
        if self.local:
            return self.revealed and self.current == seat_id
        return True

    def remove(self, seat_id: str) -> None:
        if seat_id not in self.order:
            return
        idx = self.order.index(seat_id)
        self.order.pop(idx)
        self.viewed.discard(seat_id)
        if idx < self.cursor:
            self.cursor -= 1
        elif idx == self.cursor:
            self.revealed = False

    def add(self, seat_id: str) -> None:
        if seat_id not in self.order:
            self.order.append(seat_id)

    def view(self) -> dict:
        return {
            "order": list(self.order),
            "cursor": self.cursor,
            "current": self.current,
            "revealed": self.revealed,
            "viewed": [s for s in self.order if s in self.viewed],
            "done": self.done,
        }
