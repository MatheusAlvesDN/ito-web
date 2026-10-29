from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.database import get_db
from app.schemas.admin import GameAdminOut, GameUpdate
from app.services.admin_service import AdminService

router = APIRouter(prefix="/games", tags=["Admin - Jogos"], dependencies=[Depends(require_admin)])


@router.get("", response_model=List[GameAdminOut])
def list_games(db: Session = Depends(get_db)):
    """Todos os jogos, inclusive inativos, com contagem de temas."""
    return AdminService.list_games(db)


@router.patch("/{game_id}", response_model=GameAdminOut)
def update_game(game_id: str, data: GameUpdate, db: Session = Depends(get_db)):
    return AdminService.update_game(db, game_id, data)
