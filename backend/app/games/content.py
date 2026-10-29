"""Conteúdo dos jogos (perguntas, cenários do impostor, personalidades).

``ContentProvider(session_factory).load(mode, theme_ids)`` lê do banco (SQLAlchemy
síncrono — a sala deve chamá-lo via ``anyio.to_thread.run_sync``) só os temas
**ativos** do jogo ``mode`` e, quando as colunas existirem, só jogo/itens ativos.
O id de tema aceito pode ser o global (``classic_anime``) ou o original
(``anime``).

``StaticContent`` tem a mesma interface e serve para testes.

Pool vazio → ``GameError("no_content", ...)``. No ITO (``classic``) o tema
``free``/``classic_free`` liga o modo livre: não precisa de conteúdo e a
pergunta é sempre ``FREE_MODE_QUESTION``.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Iterable, Protocol

from app.games.base import GameError

FREE_MODE_QUESTION = "MODO LIVRE: Inventem um desafio!"
FREE_THEME_IDS = frozenset({"free", "classic_free"})

NO_CONTENT = ("no_content", "Os temas escolhidos não têm conteúdo.")


@dataclass(frozen=True)
class ContentQuestion:
    text: str
    theme_id: str


@dataclass(frozen=True)
class Scenario:
    honest: str
    variations: tuple[str, ...]


@dataclass
class ContentPool:
    questions: list[ContentQuestion] = field(default_factory=list)
    scenarios: list[Scenario] = field(default_factory=list)
    personalities: list[str] = field(default_factory=list)
    free_mode: bool = False

    def has_content_for(self, mode: str) -> bool:
        if mode == "classic":
            return self.free_mode or bool(self.questions)
        if mode == "whatdoyouknow":
            return bool(self.questions)
        if mode == "impostor":
            return bool(self.scenarios)
        if mode == "whoami":
            return bool(self.personalities)
        return True


class ContentSource(Protocol):
    def load(self, mode: str, theme_ids: Iterable[str]) -> ContentPool: ...


def is_free_mode(mode: str, theme_ids: Iterable[str]) -> bool:
    return mode == "classic" and any(t in FREE_THEME_IDS for t in theme_ids)


def _clean(text) -> str:
    return text.strip() if isinstance(text, str) else ""


def build_pool(
    mode: str,
    questions: Iterable[tuple[str, str]] = (),
    scenarios: Iterable[tuple[str, Iterable[str]]] = (),
    personalities: Iterable[str] = (),
    free_mode: bool = False,
) -> ContentPool:
    """Normaliza (tira vazios/duplicados) e valida o pool. Levanta no_content."""
    seen: set[str] = set()
    qs: list[ContentQuestion] = []
    for text, theme_id in questions:
        t = _clean(text)
        if t and t not in seen:
            seen.add(t)
            qs.append(ContentQuestion(t, theme_id))
    scs: list[Scenario] = []
    for honest, variations in scenarios:
        h = _clean(honest)
        vs = tuple(v for v in (_clean(x) for x in (variations or [])) if v)
        if h and vs:
            scs.append(Scenario(h, vs))
    pers: list[str] = []
    seen_p: set[str] = set()
    for p in personalities:
        name = _clean(p)
        if name and name.casefold() not in seen_p:
            seen_p.add(name.casefold())
            pers.append(name)
    pool = ContentPool(qs, scs, pers, free_mode)
    if not pool.has_content_for(mode):
        raise GameError(*NO_CONTENT)
    return pool


class ContentProvider:
    """Lê conteúdo ativo do banco."""

    def __init__(self, session_factory: Callable | None = None):
        if session_factory is None:
            from app.core.database import SessionLocal

            session_factory = SessionLocal
        self.session_factory = session_factory

    def load(self, mode: str, theme_ids: Iterable[str]) -> ContentPool:
        theme_ids = [t for t in theme_ids if t]
        if is_free_mode(mode, theme_ids):
            return ContentPool(free_mode=True)
        if not theme_ids:
            raise GameError(*NO_CONTENT)

        from sqlalchemy import or_, select

        from app.models.game import Game, ImpostorScenario, Question, Theme, WhoAmIPersonality

        session = self.session_factory()
        try:
            stmt = select(Theme.id).where(
                Theme.game_id == mode,
                Theme.is_active.is_(True),
                or_(Theme.id.in_(theme_ids), Theme.original_theme_id.in_(theme_ids)),
            )
            if hasattr(Game, "is_active"):
                stmt = stmt.join(Game, Game.id == Theme.game_id).where(Game.is_active.is_(True))
            ids = list(session.scalars(stmt))
            if not ids:
                raise GameError(*NO_CONTENT)

            def items(model):
                q = select(model).where(model.theme_id.in_(ids))
                if hasattr(model, "is_active"):
                    q = q.where(model.is_active.is_(True))
                return list(session.scalars(q.order_by(model.id)))

            if mode in ("classic", "whatdoyouknow"):
                return build_pool(mode, questions=((q.content, q.theme_id) for q in items(Question)))
            if mode == "impostor":
                return build_pool(
                    mode,
                    scenarios=((s.honest, s.impostor_variations or []) for s in items(ImpostorScenario)),
                )
            if mode == "whoami":
                return build_pool(mode, personalities=(p.name for p in items(WhoAmIPersonality)))
            raise GameError("unknown_mode", "Modo de jogo desconhecido.")
        finally:
            session.close()


class StaticContent:
    """Fonte de conteúdo em memória (testes). Mesma interface de ContentProvider."""

    def __init__(
        self,
        questions: Iterable[str | tuple[str, str]] = (),
        scenarios: Iterable[tuple[str, Iterable[str]]] = (),
        personalities: Iterable[str] = (),
    ):
        self.questions = [(q, "static") if isinstance(q, str) else q for q in questions]
        self.scenarios = list(scenarios)
        self.personalities = list(personalities)

    def load(self, mode: str, theme_ids: Iterable[str] = ()) -> ContentPool:
        theme_ids = list(theme_ids)
        if is_free_mode(mode, theme_ids):
            return ContentPool(free_mode=True)
        return build_pool(
            mode,
            questions=self.questions,
            scenarios=self.scenarios,
            personalities=self.personalities,
        )
