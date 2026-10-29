from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_DB_PATH = (BASE_DIR / "partygames.db").as_posix()

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")

    PROJECT_NAME: str = "Party Games API"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    DATABASE_URL: str = f"sqlite:///{DEFAULT_DB_PATH}"
    # Em produção, defina CORS_ORIGINS no .env como lista JSON, ex: ["https://meusite.com"]
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    # Multiplayer
    WS_MAX_MESSAGE_BYTES: int = 256_000
    WS_RECONNECT_GRACE_SECONDS: float = 30.0
    # Pass and Play (sala local, um aparelho): mais tempo para voltar à sala
    WS_LOCAL_RECONNECT_GRACE_SECONDS: float = 600.0

settings = Settings()
