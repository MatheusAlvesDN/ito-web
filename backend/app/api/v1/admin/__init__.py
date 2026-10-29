from fastapi import APIRouter

from app.api.v1.admin import admins, auth, content, games, themes

# Painel admin: tudo em /api/v1/admin (só o login é público)
router = APIRouter(prefix="/admin")
router.include_router(auth.router)
router.include_router(games.router)
router.include_router(themes.router)
router.include_router(content.router)
router.include_router(admins.router)
