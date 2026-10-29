from typing import Iterable, List, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.game import Game, Theme, Question, ImpostorScenario, WhoAmIPersonality
from app.schemas.game import ThemeOut

class GameService:
    @staticmethod
    def count_items_by_theme(db: Session, theme_ids: Iterable[str], active_only: bool = True) -> dict[str, int]:
        """theme_id -> quantidade de itens (cada tema só usa um dos três tipos)."""
        theme_ids = list(theme_ids)
        counts: dict[str, int] = {}
        if not theme_ids:
            return counts
        for model in (Question, ImpostorScenario, WhoAmIPersonality):
            query = db.query(model.theme_id, func.count(model.id)).filter(model.theme_id.in_(theme_ids))
            if active_only:
                query = query.filter(model.is_active.is_(True))
            for theme_id, n in query.group_by(model.theme_id):
                counts[theme_id] = counts.get(theme_id, 0) + n
        return counts

    @staticmethod
    def public_games(db: Session, games: List[Game]) -> List[dict]:
        """Jogos para a API pública: só temas ativos, cada um com a contagem de itens ativos."""
        active_themes = {g.id: [t for t in g.themes if t.is_active] for g in games}
        counts = GameService.count_items_by_theme(db, (t.id for ts in active_themes.values() for t in ts))
        return [
            {
                "id": g.id,
                "name": g.name,
                "description": g.description,
                "icon": g.icon,
                "themes": [
                    {**ThemeOut.model_validate(t).model_dump(), "item_count": counts.get(t.id, 0)}
                    for t in active_themes[g.id]
                ],
            }
            for g in games
        ]

    @staticmethod
    def get_all_games(db: Session) -> List[Game]:
        return db.query(Game).filter(Game.is_active.is_(True)).all()

    @staticmethod
    def get_game_by_id(db: Session, game_id: str) -> Optional[Game]:
        return db.query(Game).filter(Game.id == game_id, Game.is_active.is_(True)).first()

    @staticmethod
    def get_themes_by_game(db: Session, game_id: str) -> List[Theme]:
        return (
            db.query(Theme)
            .join(Game)
            .filter(Theme.game_id == game_id, Theme.is_active.is_(True), Game.is_active.is_(True))
            .all()
        )

    @staticmethod
    def get_theme_by_id(db: Session, theme_id: str) -> Optional[Theme]:
        return db.query(Theme).filter(Theme.id == theme_id, Theme.is_active.is_(True)).first()
