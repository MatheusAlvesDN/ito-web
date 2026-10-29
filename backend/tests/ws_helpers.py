"""Utilidades dos testes de WebSocket (salas + motores).

Toda espera é limitada: ``sync()`` manda PING e lê até o PONG (o servidor
processa as mensagens de um socket em ordem, e um broadcast termina antes de a
ação de quem o causou responder), e ``wait_for`` repete isso algumas vezes.
"""

from __future__ import annotations

import json
import time

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.models.game import Game, ImpostorScenario, Question, Theme, WhoAmIPersonality
from app.websockets.connection_manager import manager


def seed_content(session_factory) -> None:
    db = session_factory()
    try:
        games = [
            ("classic", "ITO"), ("impostor", "Impostor"), ("whoami", "Quem Sou Eu"),
            ("whatdoyouknow", "O Que Você Sabe"), ("translator", "Tradutor"),
        ]
        for gid, name in games:
            db.add(Game(id=gid, name=name, is_active=True))
        db.flush()

        def theme(gid, orig, active=True):
            db.add(Theme(id=f"{gid}_{orig}", original_theme_id=orig, game_id=gid, name=orig.title(), is_active=active))

        theme("classic", "t1")
        theme("classic", "off", active=False)
        theme("classic", "free")
        theme("impostor", "t1")
        theme("whoami", "t1")
        theme("whatdoyouknow", "t1")
        db.flush()
        for i in range(10):
            db.add(Question(theme_id="classic_t1", content=f"Pergunta ITO {i}"))
            db.add(Question(theme_id="classic_off", content=f"Pergunta inativa {i}"))
            db.add(Question(theme_id="whatdoyouknow_t1", content=f"Pergunta WDYK {i}"))
            db.add(WhoAmIPersonality(theme_id="whoami_t1", name=f"Personalidade {i}"))
        for i in range(3):
            db.add(ImpostorScenario(theme_id="impostor_t1", honest=f"Honesta {i}",
                                    impostor_variations=[f"Variação {i}a", f"Variação {i}b"]))
        db.commit()
    finally:
        db.close()


@pytest.fixture
def client(db_session_factory, monkeypatch):
    seed_content(db_session_factory)
    monkeypatch.setattr(settings, "WS_RECONNECT_GRACE_SECONDS", 0.3)
    monkeypatch.setattr(settings, "WS_LOCAL_RECONNECT_GRACE_SECONDS", 0.3)
    monkeypatch.setattr(manager, "session_factory", db_session_factory)
    manager.rooms.clear()
    with TestClient(app) as c:
        yield c
    manager.rooms.clear()


class WS:
    """Embrulha um websocket do TestClient guardando o último STATE e os eventos."""

    def __init__(self, ws):
        self.ws = ws
        self.state: dict | None = None
        self.raw_state: str = ""
        self.raw_states: list[str] = []
        self.events: list[dict] = []
        self.errors: list[dict] = []

    def send(self, **msg) -> None:
        self.ws.send_json(msg)

    def sync(self) -> None:
        self.ws.send_json({"type": "PING"})
        for _ in range(500):
            raw = self.ws.receive_text()
            msg = json.loads(raw)
            t = msg["type"]
            if t == "PONG":
                return
            if t == "STATE":
                if self.state is None or msg["rev"] >= self.state["rev"]:
                    self.state, self.raw_state = msg, raw
                self.raw_states.append(raw)
            elif t == "EVENT":
                self.events.append(msg)
            elif t == "ERROR":
                self.errors.append(msg)
        raise AssertionError("PONG não recebido")

    def do(self, **msg) -> "WS":
        self.send(**msg)
        self.sync()
        return self

    def error(self, **msg) -> dict:
        """Envia e devolve o ERROR gerado (falha se não houver)."""
        before = len(self.errors)
        self.do(**msg)
        assert len(self.errors) > before, f"esperava ERROR para {msg}"
        return self.errors[-1]

    def act(self, action_type: str, as_seat: str | None = None, **payload) -> "WS":
        msg = {"type": "GAME_ACTION", "action": {"type": action_type, **payload}}
        if as_seat is not None:
            msg["asSeat"] = as_seat
        before = len(self.errors)
        self.do(**msg)
        assert len(self.errors) == before, f"{action_type} falhou: {self.errors[-1]}"
        return self

    def event_names(self) -> list[str]:
        return [e["name"] for e in self.events]

    def pop_events(self, name: str) -> list[dict]:
        found = [e for e in self.events if e["name"] == name]
        self.events = [e for e in self.events if e["name"] != name]
        return found

    @property
    def game(self) -> dict | None:
        return self.state["game"] if self.state else None

    @property
    def room(self) -> dict:
        return self.state["room"]


def wait_for(ws: WS, pred, timeout: float = 3.0) -> None:
    deadline = time.monotonic() + timeout
    while True:
        ws.sync()
        if pred():
            return
        if time.monotonic() > deadline:
            raise AssertionError("condição não atingida a tempo")
        time.sleep(0.02)


def create(ws: WS, player_id="host", name="Ana", **extra) -> str:
    ws.do(type="CREATE_ROOM", playerId=player_id, playerName=name, **extra)
    assert ws.state is not None, ws.errors
    return ws.room["code"]


def join(ws: WS, code: str, player_id: str, name: str, **extra) -> WS:
    return ws.do(type="JOIN_ROOM", roomCode=code, playerId=player_id, playerName=name, **extra)


def setup_game(host: WS, mode: str, themes=("t1",), config: dict | None = None, start=True) -> None:
    host.do(type="SELECT_MODE", mode=mode)
    if config:
        host.do(type="SET_CONFIG", config=config)
    host.do(type="SELECT_THEMES", themeIds=list(themes))
    if start:
        host.do(type="START_GAME")
    assert not host.errors, host.errors


def room_of(ws: WS):
    return manager.get_room(ws.room["code"])
