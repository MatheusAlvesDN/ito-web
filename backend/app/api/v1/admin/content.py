from typing import Any, Optional
from fastapi import APIRouter, Body, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.database import get_db
from app.schemas.admin import BulkImportIn, BulkImportOut, ItemOut, ItemPage, ItemType
from app.services.admin_service import AdminService

router = APIRouter(tags=["Admin - Conteúdo"], dependencies=[Depends(require_admin)])

# O formato do item depende do jogo do tema:
#   classic/whatdoyouknow -> {content}; impostor -> {honest, impostor_variations}; whoami -> {name}
ITEM_BODY = Body(
    ...,
    openapi_examples={
        "pergunta": {"value": {"content": "Algo que você levaria para uma ilha deserta"}},
        "cenário": {"value": {"honest": "Qual sua comida favorita?", "impostor_variations": ["Qual comida você odeia?"]}},
        "personalidade": {"value": {"name": "Albert Einstein"}},
    },
)


@router.get("/themes/{theme_id}/items", response_model=ItemPage)
def list_items(
    theme_id: str,
    search: Optional[str] = Query(None, max_length=200),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    return AdminService.list_items(db, theme_id, search, offset, limit)


@router.post("/themes/{theme_id}/items", response_model=ItemOut, status_code=status.HTTP_201_CREATED)
def create_item(theme_id: str, body: dict[str, Any] = ITEM_BODY, db: Session = Depends(get_db)):
    return AdminService.create_item(db, theme_id, body)


@router.post("/themes/{theme_id}/items/bulk", response_model=BulkImportOut)
def bulk_import(theme_id: str, data: BulkImportIn, db: Session = Depends(get_db)):
    """Uma linha por item; no impostor: `honesta | variação1; variação2`. Ignora vazias e repetidas."""
    return AdminService.bulk_import(db, theme_id, data.lines)


@router.patch("/items/{item_type}/{item_id}", response_model=ItemOut)
def update_item(item_type: ItemType, item_id: int, body: dict[str, Any] = ITEM_BODY, db: Session = Depends(get_db)):
    return AdminService.update_item(db, item_type, item_id, body)


@router.delete("/items/{item_type}/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_type: ItemType, item_id: int, db: Session = Depends(get_db)):
    AdminService.delete_item(db, item_type, item_id)
