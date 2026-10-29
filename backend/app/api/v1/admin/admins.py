from typing import List
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.database import get_db
from app.models.admin import AdminUser
from app.schemas.admin import AdminCreate, AdminDetailOut, AdminUpdate
from app.services.admin_service import AdminService

router = APIRouter(prefix="/admins", tags=["Admin - Admins"], dependencies=[Depends(require_admin)])


@router.get("", response_model=List[AdminDetailOut])
def list_admins(db: Session = Depends(get_db)):
    return AdminService.list_admins(db)


@router.post("", response_model=AdminDetailOut, status_code=status.HTTP_201_CREATED)
def create_admin(data: AdminCreate, db: Session = Depends(get_db)):
    return AdminService.create_admin(db, data)


@router.patch("/{admin_id}", response_model=AdminDetailOut)
def update_admin(
    admin_id: int,
    data: AdminUpdate,
    request: Request,
    current: AdminUser = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Ativa/desativa ou troca a senha. Ninguém desativa a si mesmo; sempre sobra um admin ativo."""
    return AdminService.update_admin(db, admin_id, data, current, getattr(request.state, "admin_session_id", None))
