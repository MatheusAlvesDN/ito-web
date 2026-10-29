import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.games.base import GameError
from app.games.content import FREE_MODE_QUESTION, ContentProvider, StaticContent, build_pool
from app.models.game import Game, ImpostorScenario, Question, Theme, WhoAmIPersonality


@pytest.fixture
def session_factory():
    engine = create_engine("sqlite://")
    tables = [m.__table__ for m in (Game, Theme, Question, ImpostorScenario, WhoAmIPersonality)]
    Base.metadata.create_all(engine, tables=tables)
    factory = sessionmaker(bind=engine)
    s = factory()
    for gid in ("classic", "impostor", "whoami", "whatdoyouknow"):
        s.add(Game(id=gid, name=gid))
    s.add_all([
        Theme(id="classic_anime", original_theme_id="anime", game_id="classic", name="Anime", is_active=True),
        Theme(id="classic_off", original_theme_id="off", game_id="classic", name="Off", is_active=False),
        Theme(id="whatdoyouknow_anime", original_theme_id="anime", game_id="whatdoyouknow", name="A", is_active=True),
        Theme(id="impostor_x", original_theme_id="x", game_id="impostor", name="X", is_active=True),
        Theme(id="whoami_a", original_theme_id="a", game_id="whoami", name="A", is_active=True),
        Theme(id="whoami_b", original_theme_id="b", game_id="whoami", name="B", is_active=True),
    ])
    s.add_all([
        Question(theme_id="classic_anime", content="Q1"),
        Question(theme_id="classic_anime", content="  "),
        Question(theme_id="classic_off", content="Q-off"),
        Question(theme_id="whatdoyouknow_anime", content="W1"),
        ImpostorScenario(theme_id="impostor_x", honest="H", impostor_variations=["V1", "", "V2"]),
        ImpostorScenario(theme_id="impostor_x", honest="H2", impostor_variations=[]),
        WhoAmIPersonality(theme_id="whoami_a", name="Pelé"),
        WhoAmIPersonality(theme_id="whoami_b", name="pelé"),
        WhoAmIPersonality(theme_id="whoami_b", name="Einstein"),
    ])
    s.commit()
    s.close()
    return factory


def test_loads_by_global_or_original_id(session_factory):
    p = ContentProvider(session_factory)
    for tid in ("classic_anime", "anime"):
        pool = p.load("classic", [tid])
        assert [q.text for q in pool.questions] == ["Q1"]
        assert pool.questions[0].theme_id == "classic_anime"
    # mesmo id original em outro jogo não mistura
    assert [q.text for q in p.load("whatdoyouknow", ["anime"]).questions] == ["W1"]


def test_inactive_theme_is_ignored(session_factory):
    p = ContentProvider(session_factory)
    with pytest.raises(GameError) as e:
        p.load("classic", ["classic_off"])
    assert e.value.code == "no_content"
    assert e.value.message == "Os temas escolhidos não têm conteúdo."


def test_scenarios_and_personalities(session_factory):
    p = ContentProvider(session_factory)
    pool = p.load("impostor", ["x"])
    assert len(pool.scenarios) == 1 and pool.scenarios[0].variations == ("V1", "V2")
    pers = p.load("whoami", ["a", "whoami_b"]).personalities
    assert pers == ["Pelé", "Einstein"]  # deduplicado entre temas


def test_free_mode_needs_no_content(session_factory):
    p = ContentProvider(session_factory)
    for tid in ("free", "classic_free"):
        pool = p.load("classic", [tid])
        assert pool.free_mode
    assert FREE_MODE_QUESTION.startswith("MODO LIVRE")
    assert StaticContent().load("classic", ["free"]).free_mode


def test_empty_static_pool_raises():
    with pytest.raises(GameError):
        StaticContent().load("whoami")
    with pytest.raises(GameError):
        build_pool("impostor", scenarios=[("H", [])])
