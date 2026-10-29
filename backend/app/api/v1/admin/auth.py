from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.database import get_db
from app.models.admin import AdminUser
from app.schemas.admin import AdminOut, LoginIn, LoginOut
from app.services.admin_service import AdminService

router = APIRouter(prefix="/auth", tags=["Admin - Auth"])


@router.post("/login", response_model=LoginOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    """Troca usuário/senha por um token de sessão (válido por 7 dias)."""
    admin = AdminService.authenticate(db, data.username, data.password)
    if admin is None:
        # Mesma mensagem para usuário inexistente, inativo ou senha errada
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário ou senha inválidos.")
    token = AdminService.create_session(db, admin)
    return LoginOut(token=token, admin=AdminOut.model_validate(admin))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, admin: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    """Encerra a sessão atual."""
    AdminService.delete_session(db, request.state.admin_session_id)


@router.get("/me", response_model=AdminOut)
def me(admin: AdminUser = Depends(require_admin)):
    return admin
