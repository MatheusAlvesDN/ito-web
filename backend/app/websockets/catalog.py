"""Acesso ao banco usado pelas salas (sempre fora do event loop, via ``anyio.to_thread``).

Convenção de ids de tema: a sala guarda o **id global** do tema (``Theme.id``,
ex.: ``classic_anime``) — o mesmo ``id`` devolvido por ``GET /api/v1/games``.
``SELECT_THEMES`` também aceita o id original (``anime``) e o converte para o
global. No ITO, ``free``/``classic_free`` (modo livre) é sempre aceito e vira
``classic_free``.
"""

from __future__ import annotations

from typing import Callable

import anyio

from app.games.base import GameError
from app.games.content import FREE_THEME_IDS, ContentPool, ContentProvider

UNKNOWN_THEME = ("unknown_theme", "Tema não encontrado ou desativado.")
FREE_THEME_GLOBAL_ID = "classic_free"


class Catalog:
    def __init__(self, session_factory_getter: Callable[[], Callable]):
        self._get_factory = session_factory_getter

    @property
    def session_factory(self) -> Callable:
        return self._get_factory()

    # ----- síncronos (rodam em thread) -------------------------------------

    def _game_active(self, mode: str) -> bool:
        from app.models.game import Game

        session = self.session_factory()
        try:
            game = session.get(Game, mode)
            return game is not None and bool(game.is_active)
        finally:
            session.close()

    def _resolve_themes(self, mode: str, theme_ids: list[str]) -> list[str]:
        from sqlalchemy import or_, select

        from app.models.game import Theme

        wanted = list(dict.fromkeys(theme_ids))  # sem duplicados, mantém a ordem
        free = [t for t in wanted if mode == "classic" and t in FREE_THEME_IDS]
        rest = [t for t in wanted if t not in free]
        resolved: dict[str, str] = {}
        if rest:
            session = self.session_factory()
            try:
                rows = session.execute(
                    select(Theme.id, Theme.original_theme_id).where(
                        Theme.game_id == mode,
                        Theme.is_active.is_(True),
                        or_(Theme.id.in_(rest), Theme.original_theme_id.in_(rest)),
                    )
                ).all()
            finally:
                session.close()
            for global_id, original_id in rows:
                resolved[global_id] = global_id
                resolved.setdefault(original_id, global_id)
        out: list[str] = []
        for t in wanted:
            gid = FREE_THEME_GLOBAL_ID if t in free else resolved.get(t)
            if gid is None:
                raise GameError(*UNKNOWN_THEME)
            if gid not in out:
                out.append(gid)
        return out

    def _load(self, mode: str, theme_ids: list[str]) -> ContentPool:
        return ContentProvider(self.session_factory).load(mode, theme_ids)

    # ----- assíncronos ------------------------------------------------------

    async def game_active(self, mode: str) -> bool:
        return await anyio.to_thread.run_sync(self._game_active, mode)

    async def resolve_themes(self, mode: str, theme_ids: list[str]) -> list[str]:
        return await anyio.to_thread.run_sync(self._resolve_themes, mode, list(theme_ids))

    async def load_content(self, mode: str, theme_ids: list[str]) -> ContentPool:
        return await anyio.to_thread.run_sync(self._load, mode, list(theme_ids))
