from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.admin import AdminUser
from app.services.admin_service import AdminService

bearer_scheme = HTTPBearer(auto_error=False, description="Token de sessão do admin")


def require_admin(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> AdminUser:
    """Valida o token Bearer e devolve o admin logado (401 caso contrário)."""
    if credentials is None or credentials.scheme.lower() != "bearer" or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Faça login como administrador.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    session = AdminService.get_valid_session(db, credentials.credentials)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão inválida ou expirada. Faça login novamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Guardado para logout/troca de senha saberem qual é a sessão atual
    request.state.admin_session_id = session.id
    return session.admin
