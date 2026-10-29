from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from app.core.config import settings
from app.core.database import Base
import app.models  # noqa: F401  Garante registro de todos os modelos no metadata

config = context.config

# Logging só quando chamado pela CLI (com alembic.ini); o app não mexe nos loggers do uvicorn
if config.config_file_name is not None and config.attributes.get("configure_logger", True):
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url() -> str:
    return config.get_main_option("sqlalchemy.url") or settings.DATABASE_URL


def run_migrations_offline() -> None:
    context.configure(
        url=get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_with_connection(connection) -> None:
    # render_as_batch: o SQLite não suporta ALTER TABLE completo
    context.configure(connection=connection, target_metadata=target_metadata, render_as_batch=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    # O app passa a própria conexão (app/core/migrations.py); a CLI cria uma
    connection = config.attributes.get("connection")
    if connection is not None:
        run_with_connection(connection)
        return
    engine = create_engine(get_url(), poolclass=pool.NullPool)
    with engine.connect() as connection:
        run_with_connection(connection)


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
