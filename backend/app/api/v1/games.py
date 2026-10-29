from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.game_service import GameService
from app.schemas.game import GameOut, ThemeOut

router = APIRouter(prefix="/games", tags=["Games"])

@router.get("", response_model=List[GameOut])
def list_games(db: Session = Depends(get_db)):
    """Lista os jogos ativos, só com temas ativos e a contagem de itens de cada tema."""
    return GameService.public_games(db, GameService.get_all_games(db))

@router.get("/{game_id}", response_model=GameOut)
def get_game(game_id: str, db: Session = Depends(get_db)):
    """Obtém detalhes de um jogo específico."""
    game = GameService.get_game_by_id(db, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    return GameService.public_games(db, [game])[0]

@router.get("/{game_id}/themes", response_model=List[ThemeOut])
def get_game_themes(game_id: str, db: Session = Depends(get_db)):
    """Retorna os temas ativos do jogo."""
    themes = GameService.get_themes_by_game(db, game_id)
    counts = GameService.count_items_by_theme(db, (t.id for t in themes))
    return [{**ThemeOut.model_validate(t).model_dump(), "item_count": counts.get(t.id, 0)} for t in themes]
