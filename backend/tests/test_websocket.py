"""Salas: criar/entrar, nomes, reconexão, host, sala local, validação do lobby."""

import time

from app.websockets.connection_manager import manager
from ws_helpers import WS, client, create, join, room_of, wait_for  # noqa: F401


def test_create_and_join(client):
    with client.websocket_connect("/ws") as h, client.websocket_connect("/ws") as g:
        host, guest = WS(h), WS(g)
        code = create(host)
        s = host.state
        assert len(code) == 4 and s["rev"] == 1 and isinstance(s["serverNow"], float)
        assert s["room"]["hostId"] == "host" and s["room"]["kind"] == "online" and s["room"]["stage"] == "lobby"
        assert s["you"] == {"playerId": "host", "isHost": True, "controls": ["host"]}
        assert s["game"] is None

        join(guest, code.lower(), "guest", "Bia")
        assert [p["id"] for p in guest.room["players"]] == ["host", "guest"]
        assert guest.state["you"]["isHost"] is False
        host.sync()
        assert host.state["rev"] == 2
        assert host.pop_events("player_joined")[0]["data"] == {"playerId": "guest", "name": "Bia"}


def test_duplicate_names_get_suffix(client):
    with client.websocket_connect("/ws") as h, client.websocket_connect("/ws") as g:
        host, guest = WS(h), WS(g)
        code = create(host, name="Ana")
        join(guest, code, "guest", "ana")
        assert {p["id"]: p["name"] for p in guest.room["players"]}["guest"] == "ana 2"


def test_reconnect_keeps_identity(client):
    with client.websocket_connect("/ws") as h:
        host = WS(h)
        code = create(host)
        with client.websocket_connect("/ws") as g:
            join(WS(g), code, "guest", "Bia")
        wait_for(host, lambda: "player_disconnected" in host.event_names())
        assert {p["id"]: p["connected"] for p in host.room["players"]} == {"host": True, "guest": False}

        with client.websocket_connect("/ws") as g:
            guest = join(WS(g), code, "guest", "Bia")
            assert [p["id"] for p in guest.room["players"]] == ["host", "guest"]
            host.sync()
            assert "player_reconnected" in host.event_names()
            assert all(p["connected"] for p in host.room["players"])


def test_host_migrates_after_grace_period(client):
    with client.websocket_connect("/ws") as g:
        guest = WS(g)
        with client.websocket_connect("/ws") as h:
            code = create(WS(h))
            join(guest, code, "guest", "Bia")
        wait_for(guest, lambda: "host_changed" in guest.event_names())
        assert guest.room["hostId"] == "guest" and guest.state["you"]["isHost"] is True
        assert [p["id"] for p in guest.room["players"]] == ["guest"]
        assert "player_left" in guest.event_names()


def test_room_is_deleted_when_last_player_leaves(client):
    with client.websocket_connect("/ws") as h:
        host = WS(h)
        code = create(host)
        host.do(type="LEAVE_ROOM")
        assert manager.get_room(code) is None
        assert host.error(type="SEND_REACTION", reaction="x")["code"] == "not_in_room"


def test_disconnected_room_expires(client):
    with client.websocket_connect("/ws") as h:
        code = create(WS(h))
    deadline = time.monotonic() + 3
    while manager.get_room(code) is not None and time.monotonic() < deadline:
        time.sleep(0.05)
    assert manager.get_room(code) is None


def test_invalid_messages(client, monkeypatch):
    from app.core.config import settings

    with client.websocket_connect("/ws") as w:
        ws = WS(w)
        ws.ws.send_text("not json")
        ws.sync()
        assert ws.errors[-1] == {"type": "ERROR", "code": "invalid_message", "message": "Mensagem inválida."}
        assert ws.error(type="UPDATE_STATE", patch={})["code"] == "invalid_message"  # protocolo antigo
        assert ws.error(type="GAME_ACTION", action={"type": "DEAL"})["code"] == "not_in_room"
        err = ws.error(type="JOIN_ROOM", roomCode="ZZZZ", playerId="x", playerName="X")
        assert err["code"] == "room_not_found" and "ZZZZ" in err["message"]
        assert ws.error(type="SELECT_THEMES", themeIds=["a"] * 31)["code"] == "invalid_message"
        monkeypatch.setattr(settings, "WS_MAX_MESSAGE_BYTES", 50)
        assert ws.error(type="SEND_REACTION", reaction="x" * 30, pad="y" * 60)["code"] == "message_too_large"


def test_reaction_and_avatar(client):
    with client.websocket_connect("/ws") as h, client.websocket_connect("/ws") as g:
        host, guest = WS(h), WS(g)
        code = create(host)
        join(guest, code, "guest", "Bia")
        rev = guest.state["rev"]
        guest.do(type="SEND_REACTION", reaction="🔥")
        host.sync()
        assert host.pop_events("reaction")[0]["data"] == {"playerId": "guest", "name": "Bia", "reaction": "🔥"}
        assert host.state["rev"] == rev  # reação não muda o estado
        guest.do(type="UPDATE_AVATAR", avatar="cat")
        host.sync()
        assert {p["id"]: p["avatar"] for p in host.room["players"]}["guest"] == "cat"


def test_local_room(client):
    with client.websocket_connect("/ws") as d:
        device = WS(d)
        err = device.error(type="CREATE_ROOM", playerId="dev", playerName="Ana", kind="local",
                           localPlayers=["Ana", "ana", "Bia"])
        assert err["code"] == "duplicate_names" and device.state is None

        code = create(device, "dev", "Ana", kind="local", localPlayers=["Ana", "Bia", "Caio"])
        seats = device.room["localSeats"]
        assert device.room["kind"] == "local" and [s["name"] for s in seats] == ["Ana", "Bia", "Caio"]
        assert all(s["id"].startswith("l_") and len(s["id"]) == 10 for s in seats)
        assert device.state["you"]["controls"] == [s["id"] for s in seats]

        # renomear mantém o id de quem continua
        device.do(type="SET_LOCAL_PLAYERS", names=["Ana", "Duda"])
        new = device.room["localSeats"]
        assert new[0]["id"] == seats[0]["id"] and new[1]["id"] not in {s["id"] for s in seats}
        assert device.error(type="SET_LOCAL_PLAYERS", names=["Só"])["code"] == "invalid_message"

        with client.websocket_connect("/ws") as o:
            other = WS(o)
            assert other.error(type="JOIN_ROOM", roomCode=code, playerId="intruso", playerName="X")["code"] == "local_room"
            # o mesmo aparelho pode reconectar
            join(other, code, "dev", "Ana")
            assert other.state["you"]["isHost"] is True
            device.sync()
            assert device.errors[-1]["code"] == "session_replaced"
            assert device.error(type="SEND_REACTION", reaction="x")["code"] == "not_in_room"


def test_lobby_validation(client):
    with client.websocket_connect("/ws") as h, client.websocket_connect("/ws") as g:
        host, guest = WS(h), WS(g)
        code = create(host)
        join(guest, code, "guest", "Bia")

        assert guest.error(type="SELECT_MODE", mode="classic")["code"] == "not_allowed"
        assert host.error(type="SELECT_MODE", mode="xyz")["code"] == "unknown_mode"
        assert host.error(type="SELECT_MODE", mode="translator")["code"] == "unknown_mode"
        assert host.error(type="SELECT_THEMES", themeIds=["t1"])["code"] == "no_mode"
        assert host.error(type="SET_CONFIG", config={})["code"] == "no_mode"
        assert host.error(type="START_GAME")["code"] == "no_mode"
        assert host.error(type="SET_LOCAL_PLAYERS", names=["A", "B"])["code"] == "invalid_action"

        host.do(type="SELECT_MODE", mode="classic")
        assert host.room["mode"] == "classic"
        assert host.room["config"] == {"scale": 100, "lives": 3, "saboteur": False}
        assert host.error(type="SET_CONFIG", config={"scale": 7})["code"] == "invalid_config"
        host.do(type="SET_CONFIG", config={"scale": 1000, "lives": 2})
        assert host.room["config"] == {"scale": 1000, "lives": 2, "saboteur": False}

        assert host.error(type="SELECT_THEMES", themeIds=["nope"])["code"] == "unknown_theme"
        assert host.error(type="SELECT_THEMES", themeIds=["off"])["code"] == "unknown_theme"  # inativo
        assert host.error(type="SELECT_THEMES", themeIds=["impostor_t1"])["code"] == "unknown_theme"  # outro jogo
        host.do(type="SELECT_THEMES", themeIds=["t1", "classic_t1", "free"])
        assert host.room["themeIds"] == ["classic_t1", "classic_free"]  # ids globais, sem duplicar

        # trocar de modo zera config e temas
        host.do(type="SELECT_MODE", mode="whatdoyouknow")
        assert host.room["themeIds"] == [] and host.room["config"] == {}
        host.do(type="SELECT_THEMES", themeIds=["whatdoyouknow_t1"])
        err = host.error(type="START_GAME")
        assert err["code"] == "not_enough_players"
        assert host.error(type="RETURN_TO_LOBBY")["code"] == "invalid_phase"
        assert host.error(type="GAME_ACTION", action={"type": "GO_SCORING"})["code"] == "invalid_phase"


def test_start_without_content_fails(client):
    with client.websocket_connect("/ws") as h, client.websocket_connect("/ws") as g:
        host, guest = WS(h), WS(g)
        code = create(host)
        join(guest, code, "guest", "Bia")
        host.do(type="SELECT_MODE", mode="classic")
        assert host.error(type="START_GAME")["code"] == "no_content"  # nenhum tema
        assert host.room["stage"] == "lobby" and room_of(host).engine is None
