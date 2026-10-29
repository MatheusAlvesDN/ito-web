import sqlite3
from datetime import timedelta

import pytest
from sqlalchemy import create_engine, inspect, text

from app.core.migrations import run_migrations
from app.core.security import hash_password, hash_token, verify_password
from app.games.base import GameError
from app.games.content import ContentProvider
from app.models.admin import AdminSession, AdminUser
from app.models.game import Game, ImpostorScenario, Question, Theme, WhoAmIPersonality

API = "/api/v1"
ADMIN = f"{API}/admin"
PASSWORD = "senha-forte-123"


@pytest.fixture
def seeded(db_session_factory):
    db = db_session_factory()
    db.add_all([
        Game(id="classic", name="ITO", icon="Sparkles"),
        Game(id="impostor", name="Impostor", icon="Ghost"),
        Game(id="whoami", name="Quem Sou Eu", icon="User"),
        Game(id="whatdoyouknow", name="O Que Você Sabe", icon="Brain"),
        Game(id="translator", name="Tradutor", icon="Languages"),
    ])
    db.add_all([
        Theme(id="classic_anime", original_theme_id="anime", game_id="classic", name="Anime", is_active=True),
        Theme(id="impostor_free", original_theme_id="free", game_id="impostor", name="Livre", is_active=True),
        Theme(id="whoami_famosos", original_theme_id="famosos", game_id="whoami", name="Famosos", is_active=True),
    ])
    db.add_all([
        Question(theme_id="classic_anime", content="Força de um personagem"),
        Question(theme_id="classic_anime", content="Quão fofo é"),
        ImpostorScenario(theme_id="impostor_free", honest="Comida favorita?", impostor_variations=["Comida que odeia?"]),
        WhoAmIPersonality(theme_id="whoami_famosos", name="Pelé"),
    ])
    db.commit()
    db.close()


@pytest.fixture
def admin_user(db_session_factory):
    db = db_session_factory()
    admin = AdminUser(username="ana", password_hash=hash_password(PASSWORD), is_active=True)
    db.add(admin)
    db.commit()
    db.refresh(admin)
    db.close()
    return admin


def login(client, username="ana", password=PASSWORD):
    return client.post(f"{ADMIN}/auth/login", json={"username": username, "password": password})


@pytest.fixture
def auth(api_client, admin_user, seeded):
    res = login(api_client)
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['token']}"}


# --- Segurança ---

def test_password_hash_roundtrip():
    stored = hash_password("abc12345")
    assert stored.startswith("scrypt$")
    assert "abc12345" not in stored
    assert verify_password("abc12345", stored)
    assert not verify_password("errada", stored)
    assert not verify_password("abc12345", "lixo")
    assert hash_password("abc12345") != stored  # salt aleatório


def test_login_ok_and_me(api_client, admin_user, db_session_factory):
    res = login(api_client, username="  ANA ")
    assert res.status_code == 200
    body = res.json()
    assert body["admin"] == {"id": admin_user.id, "username": "ana"}

    # Só o hash do token fica no banco
    db = db_session_factory()
    session = db.query(AdminSession).one()
    assert session.token_hash == hash_token(body["token"])
    assert session.expires_at - session.created_at == timedelta(days=7)
    db.close()

    me = api_client.get(f"{ADMIN}/auth/me", headers={"Authorization": f"Bearer {body['token']}"})
    assert me.status_code == 200 and me.json()["username"] == "ana"


def test_login_failures_do_not_reveal_user(api_client, admin_user):
    wrong = login(api_client, password="errada!!")
    missing = login(api_client, username="ninguem")
    assert wrong.status_code == missing.status_code == 401
    assert wrong.json() == missing.json()


def test_logout_invalidates_token(api_client, auth):
    assert api_client.post(f"{ADMIN}/auth/logout", headers=auth).status_code == 204
    assert api_client.get(f"{ADMIN}/auth/me", headers=auth).status_code == 401


def test_expired_session_is_rejected(api_client, auth, db_session_factory):
    db = db_session_factory()
    session = db.query(AdminSession).one()
    session.expires_at = session.created_at - timedelta(seconds=1)
    db.commit()
    db.close()
    assert api_client.get(f"{ADMIN}/auth/me", headers=auth).status_code == 401


@pytest.mark.parametrize("method,path", [
    ("get", "/auth/me"),
    ("post", "/auth/logout"),
    ("get", "/games"),
    ("patch", "/games/classic"),
    ("get", "/games/classic/themes"),
    ("post", "/games/classic/themes"),
    ("patch", "/themes/classic_anime"),
    ("delete", "/themes/classic_anime"),
    ("get", "/themes/classic_anime/items"),
    ("post", "/themes/classic_anime/items"),
    ("post", "/themes/classic_anime/items/bulk"),
    ("patch", "/items/questions/1"),
    ("delete", "/items/questions/1"),
    ("get", "/admins"),
    ("post", "/admins"),
    ("patch", "/admins/1"),
])
def test_protected_routes_require_token(api_client, seeded, method, path):
    res = getattr(api_client, method)(f"{ADMIN}{path}")
    assert res.status_code == 401
    bad = getattr(api_client, method)(f"{ADMIN}{path}", headers={"Authorization": "Bearer invalido"})
    assert bad.status_code == 401
    assert "WWW-Authenticate" in bad.headers


# --- Jogos e temas ---

def test_list_and_update_games(api_client, auth):
    games = {g["id"]: g for g in api_client.get(f"{ADMIN}/games", headers=auth).json()}
    assert games["classic"]["theme_count"] == 1
    assert games["impostor"]["item_type"] == "scenarios"
    assert games["translator"]["item_type"] is None

    res = api_client.patch(f"{ADMIN}/games/whoami", json={"name": "Quem Sou?", "is_active": False}, headers=auth)
    assert res.status_code == 200
    assert res.json()["name"] == "Quem Sou?" and res.json()["is_active"] is False
    assert api_client.patch(f"{ADMIN}/games/nope", json={"name": "x"}, headers=auth).status_code == 404
    assert api_client.patch(f"{ADMIN}/games/classic", json={"name": ""}, headers=auth).status_code == 422


def test_theme_crud(api_client, auth, db_session_factory):
    res = api_client.post(f"{ADMIN}/games/classic/themes", json={"name": "Séries de TV"}, headers=auth)
    assert res.status_code == 201
    theme = res.json()
    assert theme["id"] == "classic_series_de_tv"
    assert theme["original_theme_id"] == "series_de_tv"
    assert theme["is_active"] is True and theme["item_count"] == 0

    # Mesmo nome gera id único
    again = api_client.post(f"{ADMIN}/games/classic/themes", json={"name": "Séries de TV"}, headers=auth).json()
    assert again["id"] == "classic_series_de_tv_2"

    patched = api_client.patch(
        f"{ADMIN}/themes/{theme['id']}", json={"description": "Novas", "is_active": False}, headers=auth
    ).json()
    assert patched["description"] == "Novas" and patched["is_active"] is False

    listed = api_client.get(f"{ADMIN}/games/classic/themes", headers=auth).json()
    by_id = {t["id"]: t for t in listed}
    assert by_id[theme["id"]]["is_active"] is False  # inativos aparecem no admin
    assert by_id["classic_anime"]["item_count"] == 2

    # Apagar tema apaga os itens
    assert api_client.delete(f"{ADMIN}/themes/classic_anime", headers=auth).status_code == 204
    db = db_session_factory()
    assert db.query(Question).filter(Question.theme_id == "classic_anime").count() == 0
    db.close()
    assert api_client.delete(f"{ADMIN}/themes/classic_anime", headers=auth).status_code == 404


# --- Conteúdo ---

@pytest.mark.parametrize("theme_id,item_type,body,patch,field", [
    ("classic_anime", "questions", {"content": "Nova pergunta"}, {"content": "Editada"}, "content"),
    ("impostor_free", "scenarios",
     {"honest": "Bebida favorita?", "impostor_variations": ["Bebida que odeia?", " Bebida quente? "]},
     {"honest": "Editada?"}, "honest"),
    ("whoami_famosos", "personalities", {"name": "Ayrton Senna"}, {"name": "Editado"}, "name"),
])
def test_item_crud(api_client, auth, theme_id, item_type, body, patch, field):
    before = api_client.get(f"{ADMIN}/themes/{theme_id}/items", headers=auth).json()["total"]
    created = api_client.post(f"{ADMIN}/themes/{theme_id}/items", json=body, headers=auth)
    assert created.status_code == 201, created.text
    item = created.json()
    assert item["is_active"] is True
    if item_type == "scenarios":
        assert item["impostor_variations"] == ["Bebida que odeia?", "Bebida quente?"]

    page = api_client.get(f"{ADMIN}/themes/{theme_id}/items", headers=auth).json()
    assert page["type"] == item_type and page["total"] == before + 1
    assert page["items"][-1]["id"] == item["id"]

    edited = api_client.patch(f"{ADMIN}/items/{item_type}/{item['id']}", json=patch, headers=auth).json()
    assert edited[field] == patch[field]

    assert api_client.delete(f"{ADMIN}/items/{item_type}/{item['id']}", headers=auth).status_code == 204
    assert api_client.delete(f"{ADMIN}/items/{item_type}/{item['id']}", headers=auth).status_code == 404


def test_item_validation(api_client, auth):
    # Campos do tipo errado / vazios / longos demais
    assert api_client.post(f"{ADMIN}/themes/classic_anime/items", json={"name": "x"}, headers=auth).status_code == 422
    assert api_client.post(f"{ADMIN}/themes/classic_anime/items", json={"content": "  "}, headers=auth).status_code == 422
    assert api_client.post(
        f"{ADMIN}/themes/classic_anime/items", json={"content": "x" * 501}, headers=auth
    ).status_code == 422
    assert api_client.post(
        f"{ADMIN}/themes/impostor_free/items", json={"honest": "a", "impostor_variations": []}, headers=auth
    ).status_code == 422
    assert api_client.patch(f"{ADMIN}/items/outro/1", json={}, headers=auth).status_code == 422
    # Jogo sem conteúdo
    api_client.post(f"{ADMIN}/games/translator/themes", json={"name": "X"}, headers=auth)
    assert api_client.get(f"{ADMIN}/themes/translator_x/items", headers=auth).status_code == 400


def test_items_search_and_pagination(api_client, auth):
    api_client.post(
        f"{ADMIN}/themes/classic_anime/items/bulk",
        json={"lines": [f"Pergunta {i}" for i in range(10)]},
        headers=auth,
    )
    page = api_client.get(f"{ADMIN}/themes/classic_anime/items?limit=5&offset=5", headers=auth).json()
    assert page["total"] == 12 and len(page["items"]) == 5 and page["offset"] == 5
    found = api_client.get(f"{ADMIN}/themes/classic_anime/items?search=fofo", headers=auth).json()
    assert [i["content"] for i in found["items"]] == ["Quão fofo é"]
    # Curinga do LIKE é tratado como texto
    assert api_client.get(f"{ADMIN}/themes/classic_anime/items?search=%25", headers=auth).json()["total"] == 0


def test_bulk_import_questions(api_client, auth):
    res = api_client.post(
        f"{ADMIN}/themes/classic_anime/items/bulk",
        json={"lines": ["Nova A", "", "   ", "nova a", "Força de um personagem", "Nova B", "x" * 600]},
        headers=auth,
    ).json()
    assert res == {
        "type": "questions", "created": 2, "skipped_blank": 2, "skipped_duplicate": 2,
        "invalid": [{"line": 7, "error": "Texto muito longo (máx. 500 caracteres)."}],
    }


def test_bulk_import_impostor_line_format(api_client, auth, db_session_factory):
    res = api_client.post(
        f"{ADMIN}/themes/impostor_free/items/bulk",
        json={"lines": [
            "Qual seu filme favorito? | Qual filme você odeia?; Qual o pior filme?",
            "Comida favorita? | repetida",
            "sem separador",
            "Só honesta |  ;  ",
            "Esporte favorito?|Esporte chato?",
        ]},
        headers=auth,
    ).json()
    assert res["created"] == 2 and res["skipped_duplicate"] == 1
    assert [e["line"] for e in res["invalid"]] == [3, 4]

    db = db_session_factory()
    filme = db.query(ImpostorScenario).filter(ImpostorScenario.honest == "Qual seu filme favorito?").one()
    assert filme.impostor_variations == ["Qual filme você odeia?", "Qual o pior filme?"]
    db.close()


def test_bulk_import_personalities(api_client, auth):
    res = api_client.post(
        f"{ADMIN}/themes/whoami_famosos/items/bulk", json={"lines": ["Pelé", "Xuxa", "Xuxa"]}, headers=auth
    ).json()
    assert res["created"] == 1 and res["skipped_duplicate"] == 2


# --- API pública ---

def test_deactivation_hides_content_from_public_api_and_games(api_client, auth, db_session_factory):
    provider = ContentProvider(db_session_factory)

    def public_theme(theme_id):
        games = api_client.get(f"{API}/games").json()
        return next((t for g in games for t in g["themes"] if t["id"] == theme_id), None)

    assert public_theme("classic_anime")["item_count"] == 2

    item_id = api_client.get(f"{ADMIN}/themes/classic_anime/items", headers=auth).json()["items"][0]["id"]
    api_client.patch(f"{ADMIN}/items/questions/{item_id}", json={"is_active": False}, headers=auth)
    assert public_theme("classic_anime")["item_count"] == 1
    # Os motores de jogo só sorteiam itens ativos
    assert [q.text for q in provider.load("classic", ["classic_anime"]).questions] == ["Quão fofo é"]

    api_client.patch(f"{ADMIN}/themes/classic_anime", json={"is_active": False}, headers=auth)
    assert public_theme("classic_anime") is None
    with pytest.raises(GameError):
        provider.load("classic", ["classic_anime"])

    api_client.patch(f"{ADMIN}/games/impostor", json={"is_active": False}, headers=auth)
    assert "impostor" not in [g["id"] for g in api_client.get(f"{API}/games").json()]
    assert api_client.get(f"{API}/games/impostor").status_code == 404


# --- Admins ---

def test_admin_management(api_client, auth):
    res = api_client.post(f"{ADMIN}/admins", json={"username": "Bia", "password": "outra-senha"}, headers=auth)
    assert res.status_code == 201 and res.json()["username"] == "bia"
    assert api_client.post(
        f"{ADMIN}/admins", json={"username": "bia", "password": "outra-senha"}, headers=auth
    ).status_code == 409
    assert api_client.post(
        f"{ADMIN}/admins", json={"username": "caio", "password": "curta"}, headers=auth
    ).status_code == 422
    bia_id = res.json()["id"]
    assert login(api_client, "bia", "outra-senha").status_code == 200

    # Desativar derruba as sessões e impede login
    bia_token = login(api_client, "bia", "outra-senha").json()["token"]
    off = api_client.patch(f"{ADMIN}/admins/{bia_id}", json={"is_active": False}, headers=auth)
    assert off.status_code == 200 and off.json()["is_active"] is False
    assert api_client.get(f"{ADMIN}/auth/me", headers={"Authorization": f"Bearer {bia_token}"}).status_code == 401
    assert login(api_client, "bia", "outra-senha").status_code == 401

    # Troca de senha
    api_client.patch(f"{ADMIN}/admins/{bia_id}", json={"is_active": True, "password": "nova-senha-1"}, headers=auth)
    assert login(api_client, "bia", "nova-senha-1").status_code == 200
    assert [a["username"] for a in api_client.get(f"{ADMIN}/admins", headers=auth).json()] == ["ana", "bia"]


def test_last_admin_protection(api_client, auth, admin_user, db_session_factory):
    # Não pode desativar a si mesmo
    res = api_client.patch(f"{ADMIN}/admins/{admin_user.id}", json={"is_active": False}, headers=auth)
    assert res.status_code == 400

    # Outro admin também não pode desativar o último ativo
    bia = api_client.post(f"{ADMIN}/admins", json={"username": "bia", "password": "outra-senha"}, headers=auth).json()
    bia_auth = {"Authorization": f"Bearer {login(api_client, 'bia', 'outra-senha').json()['token']}"}
    assert api_client.patch(f"{ADMIN}/admins/{admin_user.id}", json={"is_active": False}, headers=bia_auth).status_code == 200
    # Agora só a Bia está ativa: ninguém consegue desativá-la
    assert api_client.patch(f"{ADMIN}/admins/{bia['id']}", json={"is_active": False}, headers=bia_auth).status_code == 400
    db = db_session_factory()
    assert db.query(AdminUser).filter(AdminUser.is_active.is_(True)).count() == 1
    db.close()


def test_own_password_change_keeps_current_session(api_client, auth):
    other = {"Authorization": f"Bearer {login(api_client).json()['token']}"}
    me = api_client.get(f"{ADMIN}/auth/me", headers=auth).json()
    assert api_client.patch(f"{ADMIN}/admins/{me['id']}", json={"password": "trocada-123"}, headers=auth).status_code == 200
    assert api_client.get(f"{ADMIN}/auth/me", headers=auth).status_code == 200
    assert api_client.get(f"{ADMIN}/auth/me", headers=other).status_code == 401


# --- Migrações ---

OLD_SCHEMA = """
CREATE TABLE games (id VARCHAR(50) NOT NULL, name VARCHAR(100) NOT NULL, description TEXT, icon VARCHAR(50), PRIMARY KEY (id));
CREATE TABLE themes (id VARCHAR(50) NOT NULL, original_theme_id VARCHAR(50) NOT NULL, game_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL, description TEXT, color VARCHAR(50), text_color VARCHAR(50), button_color VARCHAR(100),
    icon VARCHAR(50), is_active BOOLEAN, PRIMARY KEY (id), FOREIGN KEY(game_id) REFERENCES games (id));
CREATE TABLE questions (id INTEGER NOT NULL, theme_id VARCHAR(50) NOT NULL, content TEXT NOT NULL, PRIMARY KEY (id),
    FOREIGN KEY(theme_id) REFERENCES themes (id));
CREATE TABLE impostor_scenarios (id INTEGER NOT NULL, theme_id VARCHAR(50) NOT NULL, honest VARCHAR(255) NOT NULL,
    impostor_variations JSON NOT NULL, PRIMARY KEY (id), FOREIGN KEY(theme_id) REFERENCES themes (id));
CREATE TABLE whoami_personalities (id INTEGER NOT NULL, theme_id VARCHAR(50) NOT NULL, name VARCHAR(255) NOT NULL,
    PRIMARY KEY (id), FOREIGN KEY(theme_id) REFERENCES themes (id));
INSERT INTO games VALUES ('classic', 'ITO', NULL, 'Sparkles');
INSERT INTO themes VALUES ('classic_anime', 'anime', 'classic', 'Anime', NULL, NULL, NULL, NULL, 'Star', 1);
INSERT INTO questions VALUES (1, 'classic_anime', 'Pergunta antiga');
"""


def _migrate_file(path):
    engine = create_engine(f"sqlite:///{path.as_posix()}")
    try:
        run_migrations(engine)
        run_migrations(engine)  # idempotente
        with engine.connect() as conn:
            version = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
            tables = set(inspect(conn).get_table_names())
            game_active = conn.execute(text("SELECT is_active FROM games WHERE id='classic'")).scalar()
            question = conn.execute(text("SELECT content, is_active FROM questions WHERE id=1")).one()
        return version, tables, game_active, tuple(question)
    finally:
        engine.dispose()


def test_migrates_db_created_by_old_create_all(tmp_path):
    path = tmp_path / "old.db"
    with sqlite3.connect(path) as conn:
        conn.executescript(OLD_SCHEMA)

    version, tables, game_active, question = _migrate_file(path)
    assert version == "0002"
    assert {"admin_users", "admin_sessions"} <= tables
    assert game_active == 1
    assert question == ("Pergunta antiga", 1)  # dados preservados


def test_migrates_old_db_with_partial_admin_tables(tmp_path):
    # Banco em que um create_all intermediário já criou as tabelas de admin
    path = tmp_path / "partial.db"
    with sqlite3.connect(path) as conn:
        conn.executescript(OLD_SCHEMA)
        conn.executescript("""
            CREATE TABLE admin_users (id INTEGER NOT NULL, username VARCHAR(50) NOT NULL, password_hash VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT 1 NOT NULL, created_at DATETIME NOT NULL, PRIMARY KEY (id), UNIQUE (username));
            CREATE TABLE admin_sessions (id INTEGER NOT NULL, token_hash VARCHAR(64) NOT NULL, admin_id INTEGER NOT NULL,
                created_at DATETIME NOT NULL, expires_at DATETIME NOT NULL, PRIMARY KEY (id), UNIQUE (token_hash),
                FOREIGN KEY(admin_id) REFERENCES admin_users (id));
        """)

    version, tables, game_active, _ = _migrate_file(path)
    assert version == "0002" and game_active == 1


def test_fresh_db_matches_models(db_engine):
    # Banco criado só pelas migrações não tem diferenças em relação aos modelos
    from alembic.autogenerate import compare_metadata
    from alembic.migration import MigrationContext

    from app.core.database import Base

    with db_engine.connect() as conn:
        diff = compare_metadata(MigrationContext.configure(conn, opts={"render_as_batch": True}), Base.metadata)
    assert diff == []


def test_get_theme_and_portuguese_validation(api_client, auth):
    theme = api_client.get(f"{ADMIN}/themes/classic_anime", headers=auth)
    assert theme.status_code == 200 and theme.json()["item_count"] == 2
    assert api_client.get(f"{ADMIN}/themes/nao_existe", headers=auth).status_code == 404

    res = api_client.post(f"{ADMIN}/admins", json={"username": "novo", "password": "123"}, headers=auth)
    assert res.status_code == 422
    assert res.json()["detail"][0]["msg"] == "O campo senha precisa ter pelo menos 8 caractere(s)."

    admins = api_client.get(f"{ADMIN}/admins", headers=auth).json()
    assert admins[0]["created_at"].endswith("+00:00")
