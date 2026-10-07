from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.game_service import GameService
from app.schemas.game import GameOut, ThemeOut, GameContentOut

router = APIRouter(prefix="/games", tags=["Games"])

@router.get("", response_model=List[GameOut])
def list_games(db: Session = Depends(get_db)):
    """Lista todos os jogos disponíveis na plataforma."""
    return GameService.get_all_games(db)

@router.get("/{game_id}", response_model=GameOut)
def get_game(game_id: str, db: Session = Depends(get_db)):
    """Obtém detalhes de um jogo específico."""
    game = GameService.get_game_by_id(db, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Jogo não encontrado")
    return game

@router.get("/{game_id}/themes", response_model=List[ThemeOut])
def get_game_themes(game_id: str, db: Session = Depends(get_db)):
    """Retorna os temas disponíveis para o jogo."""
    return GameService.get_themes_by_game(db, game_id)

@router.get("/{game_id}/themes/{theme_id}/content", response_model=GameContentOut)
def get_theme_content(
    game_id: str,
    theme_id: str,
    random_count: Optional[int] = Query(None, description="Quantidade de itens aleatórios a sortear"),
    db: Session = Depends(get_db)
):
    """Retorna as perguntas, cenários ou personalidades do tema especificado."""
    # theme_id pode ser tanto o ID global ('classic_anime') quanto o original_theme_id ('anime')
    theme = GameService.get_theme_by_id(db, theme_id)
    if not theme:
        theme = GameService.get_theme_by_game_and_original_id(db, game_id, theme_id)

    if not theme:
        raise HTTPException(status_code=404, detail=f"Tema '{theme_id}' não encontrado para o jogo '{game_id}'")

    result = GameContentOut(
        game_id=game_id,
        theme_id=theme.original_theme_id
    )

    if game_id in ["classic", "whatdoyouknow"]:
        result.questions = GameService.get_questions_for_theme(db, theme.id, random_count=random_count)
    elif game_id == "impostor":
        result.scenarios = GameService.get_scenarios_for_theme(db, theme.id, random_count=random_count)
    elif game_id == "whoami":
        result.personalities = GameService.get_personalities_for_theme(db, theme.id, random_count=random_count)

    return result
