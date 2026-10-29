from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.errors import validation_exception_handler
from app.core.migrations import run_migrations
import app.models  # noqa: F401  Garante registro dos modelos no metadata
from app.api.v1.games import router as games_router
from app.api.v1.admin import router as admin_router
from app.websockets.endpoint import router as websocket_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Cria/atualiza o schema via Alembic (bancos antigos do create_all são marcados como baseline)
    run_migrations()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# Erros de validação com mensagens em português
app.add_exception_handler(RequestValidationError, validation_exception_handler)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro de Rotas REST
app.include_router(games_router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_router, prefix=settings.API_V1_PREFIX)

# Multiplayer online (WebSocket /ws)
app.include_router(websocket_router)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": settings.VERSION}
