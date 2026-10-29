from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect
from sqlalchemy.engine import Engine

from app.core.database import engine as default_engine

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
BASELINE_REVISION = "0001"


def alembic_config() -> Config:
    # Sem alembic.ini: não reconfigura o logging do uvicorn
    cfg = Config()
    cfg.set_main_option("script_location", (BACKEND_DIR / "alembic").as_posix())
    return cfg


def run_migrations(engine: Engine | None = None) -> None:
    """Aplica as migrações pendentes. Bancos criados pelo antigo create_all
    (tabelas sem alembic_version) são marcados como baseline antes do upgrade."""
    engine = engine or default_engine
    cfg = alembic_config()
    with engine.begin() as connection:
        cfg.attributes["connection"] = connection
        tables = set(inspect(connection).get_table_names())
        if "games" in tables and "alembic_version" not in tables:
            command.stamp(cfg, BASELINE_REVISION)
        command.upgrade(cfg, "head")
