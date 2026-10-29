from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.database import get_db
from app.schemas.admin import ThemeAdminOut, ThemeCreate, ThemeUpdate
from app.services.admin_service import AdminService

router = APIRouter(tags=["Admin - Temas"], dependencies=[Depends(require_admin)])


@router.get("/games/{game_id}/themes", response_model=List[ThemeAdminOut])
def list_themes(game_id: str, db: Session = Depends(get_db)):
    """Temas do jogo, inclusive inativos, com contagem de itens."""
    return AdminService.list_themes(db, game_id)


@router.post("/games/{game_id}/themes", response_model=ThemeAdminOut, status_code=status.HTTP_201_CREATED)
def create_theme(game_id: str, data: ThemeCreate, db: Session = Depends(get_db)):
    return AdminService.create_theme(db, game_id, data)


@router.get("/themes/{theme_id}", response_model=ThemeAdminOut)
def get_theme(theme_id: str, db: Session = Depends(get_db)):
    return AdminService.get_theme(db, theme_id)


@router.patch("/themes/{theme_id}", response_model=ThemeAdminOut)
def update_theme(theme_id: str, data: ThemeUpdate, db: Session = Depends(get_db)):
    return AdminService.update_theme(db, theme_id, data)


@router.delete("/themes/{theme_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_theme(theme_id: str, db: Session = Depends(get_db)):
    """Apaga o tema e todo o seu conteúdo."""
    AdminService.delete_theme(db, theme_id)
