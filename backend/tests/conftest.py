import os
import shutil
import tempfile
from pathlib import Path

# Antes de importar o app: toda a suíte usa um banco temporário, nunca o partygames.db
_TMP_DIR = Path(tempfile.mkdtemp(prefix="partygames-tests-"))
os.environ["DATABASE_URL"] = f"sqlite:///{(_TMP_DIR / 'session.db').as_posix()}"

import pytest  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app.core.config import settings  # noqa: E402

assert "partygames.db" not in settings.DATABASE_URL, "os testes não podem usar o banco real"


def pytest_sessionfinish(session, exitstatus):
    shutil.rmtree(_TMP_DIR, ignore_errors=True)


@pytest.fixture
def db_engine(tmp_path):
    """Banco novo por teste, já migrado até a última revisão."""
    from app.core.migrations import run_migrations

    engine = create_engine(
        f"sqlite:///{(tmp_path / 'test.db').as_posix()}",
        connect_args={"check_same_thread": False},
    )
    run_migrations(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def db_session_factory(db_engine):
    return sessionmaker(autocommit=False, autoflush=False, bind=db_engine)


@pytest.fixture
def api_client(db_session_factory):
    """TestClient com get_db apontando para o banco do teste."""
    from fastapi.testclient import TestClient

    from app.core.database import get_db
    from app.main import app

    def override_get_db():
        db = db_session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.pop(get_db, None)
