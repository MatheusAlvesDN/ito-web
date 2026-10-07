import random
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.game import Game, Theme, Question, ImpostorScenario, WhoAmIPersonality

class GameService:
    @staticmethod
    def get_all_games(db: Session) -> List[Game]:
        return db.query(Game).all()

    @staticmethod
    def get_game_by_id(db: Session, game_id: str) -> Optional[Game]:
        return db.query(Game).filter(Game.id == game_id).first()

    @staticmethod
    def get_themes_by_game(db: Session, game_id: str) -> List[Theme]:
        return db.query(Theme).filter(Theme.game_id == game_id, Theme.is_active == True).all()

    @staticmethod
    def get_theme_by_id(db: Session, theme_id: str) -> Optional[Theme]:
        return db.query(Theme).filter(Theme.id == theme_id).first()

    @staticmethod
    def get_theme_by_game_and_original_id(db: Session, game_id: str, original_theme_id: str) -> Optional[Theme]:
        return db.query(Theme).filter(Theme.game_id == game_id, Theme.original_theme_id == original_theme_id).first()

    @staticmethod
    def get_questions_for_theme(db: Session, theme_id: str, random_count: Optional[int] = None) -> List[str]:
        query = db.query(Question.content).filter(Question.theme_id == theme_id)
        items = [q[0] for q in query.all()]
        if random_count and len(items) > random_count:
            return random.sample(items, random_count)
        return items

    @staticmethod
    def get_scenarios_for_theme(db: Session, theme_id: str, random_count: Optional[int] = None) -> List[dict]:
        query = db.query(ImpostorScenario).filter(ImpostorScenario.theme_id == theme_id)
        scenarios = query.all()
        result = [
            {
                "id": s.id,
                "honest": s.honest,
                "impostorVariations": s.impostor_variations
            }
            for s in scenarios
        ]
        if random_count and len(result) > random_count:
            return random.sample(result, random_count)
        return result

    @staticmethod
    def get_personalities_for_theme(db: Session, theme_id: str, random_count: Optional[int] = None) -> List[str]:
        query = db.query(WhoAmIPersonality.name).filter(WhoAmIPersonality.theme_id == theme_id)
        items = [p[0] for p in query.all()]
        if random_count and len(items) > random_count:
            return random.sample(items, random_count)
        return items
