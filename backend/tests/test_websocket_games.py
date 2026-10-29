"""Partidas pelo WebSocket: ITO online, Impostor local, O Que Você Sabe, Quem Sou Eu, timers."""

import json

import pytest

import app.games.ito as ito_module
from ws_helpers import WS, client, create, join, room_of, setup_game, wait_for  # noqa: F401

SMALL_KEYS = {"round", "lives", "maxLives", "scale", "phaseSeq", "cursor"}


def _ints(obj, key=None):
    if isinstance(obj, bool):
        return
    if isinstance(obj, int):
        if key not in SMALL_KEYS:
            yield obj
    elif isinstance(obj, dict):
        for k, v in obj.items():
            yield from _ints(v, k)
    elif isinstance(obj, list):
        for v in obj:
            yield from _ints(v, key)


@pytest.fixture
def three(client):
    """Sala online com host + 2 convidados."""
    with client.websocket_connect("/ws") as a, client.websocket_connect("/ws") as b, \
            client.websocket_connect("/ws") as c:
        host, p2, p3 = WS(a), WS(b), WS(c)
        code = create(host, "p1", "Ana")
        join(p2, code, "p2", "Bia")
        join(p3, code, "p3", "Caio")
        yield client, code, host, p2, p3


def sync_all(*clients):
    for c in clients:
        c.sync()


def test_ito_online_round_keeps_numbers_secret(three, monkeypatch):
    monkeypatch.setattr(ito_module, "ROLLING_SECONDS", 0.05)
    client, code, host, p2, p3 = three
    setup_game(host, "classic", config={"scale": 1000})
    sync_all(p2, p3)
    assert host.room["stage"] == "game" and host.game["phase"] == "init"
    assert "game_started" in p2.event_names()

    rev_before = host.state["rev"]
    host.act("DEAL")
    assert host.game["phase"] == "rolling"
    # o timer do servidor (rolling → numbers) dispara e faz broadcast sozinho
    wait_for(host, lambda: host.game["phase"] == "numbers")
    assert host.state["rev"] >= rev_before + 2
    sync_all(p2, p3)

    numbers = room_of(host).engine.numbers
    players = {"p1": host, "p2": p2, "p3": p3}
    for pid, ws in players.items():
        g = ws.game
        assert g["phase"] == "numbers" and g["numbers"] is None
        assert g["you"]["seatId"] == pid and g["you"]["number"] == numbers[pid]
        others = {n for sid, n in numbers.items() if sid != pid}
        assert not others & set(_ints(g)), f"{pid} recebeu número alheio"
        for raw in ws.raw_states:
            for sid, n in numbers.items():
                if sid != pid:
                    assert f'"number": {n}' not in raw

    # reconexão no meio da partida mantém assento, nome e segredo
    p3.ws.close()
    wait_for(host, lambda: not {p["id"]: p["connected"] for p in host.room["players"]}["p3"])
    with client.websocket_connect("/ws") as c:
        p3 = join(WS(c), code, "p3", "Outro Nome")
        assert p3.game["you"]["number"] == numbers["p3"]
        assert {p["id"]: p["name"] for p in p3.room["players"]}["p3"] == "Caio"
        assert {s["id"] for s in p3.game["seats"]} == {"p1", "p2", "p3"}

        for ws in (host, p2, p3):
            ws.act("ACK_CARD")
        host.sync()
        assert sorted(host.game["viewed"]) == ["p1", "p2", "p3"]
        assert p2.error(type="GAME_ACTION", action={"type": "START_ORDERING"})["code"] == "not_allowed"
        assert p2.error(type="GAME_ACTION", action={"type": "ACK_CARD"}, asSeat="p1")["code"] == "not_allowed"
        host.act("START_ORDERING")
        assert host.game["phase"] == "ordering" and host.game["question"]["text"].startswith("Pergunta ITO")
        host.act("SET_ORDER", order=sorted(numbers, key=numbers.get))
        host.act("CHECK")
        assert host.game["phase"] == "result" and host.game["numbers"] == numbers
        assert host.pop_events("round_result")[0]["data"] == {"success": True, "lives": 3}
        p3.sync()
        assert "round_result" in p3.event_names()


def test_return_to_lobby_cancels_timers(three, monkeypatch):
    monkeypatch.setattr(ito_module, "ROLLING_SECONDS", 5)
    _, _, host, p2, _ = three
    setup_game(host, "classic")
    host.act("DEAL")
    room = room_of(host)
    assert set(room.timers) == {"rolling"}
    assert p2.error(type="RETURN_TO_LOBBY")["code"] == "not_allowed"
    host.do(type="RETURN_TO_LOBBY")
    assert room.timers == {} and room.engine is None
    assert host.room["stage"] == "lobby" and host.game is None
    assert host.pop_events("returned_to_lobby")[0]["data"] == {"reason": "host"}


def test_impostor_local_round(client):
    with client.websocket_connect("/ws") as d:
        device = WS(d)
        create(device, "dev", "Ana", kind="local", localPlayers=["Ana", "Bia", "Caio"])
        setup_game(device, "impostor", config={"discussionSeconds": 60})
        g = device.game
        assert g["phase"] == "distribution" and g["local"] is True and g["you"] is None
        seat_ids = [s["id"] for s in device.room["localSeats"]]
        assert sorted(s["id"] for s in g["seats"]) == sorted(seat_ids)
        order = g["distribution"]["order"]

        for i, sid in enumerate(order):
            assert device.game["distribution"]["current"] == sid and device.game["card"] is None
            wrong = order[(i + 1) % len(order)]
            assert device.error(type="GAME_ACTION", action={"type": "REVEAL_CARD"}, asSeat=wrong)["code"] == "not_your_turn"
            assert device.error(type="GAME_ACTION", action={"type": "REVEAL_CARD"}, asSeat="l_nope")["code"] == "unknown_seat"
            assert device.error(type="GAME_ACTION", action={"type": "NEXT_CARD"})["code"] == "card_not_seen"
            device.act("REVEAL_CARD", as_seat=sid)
            card = device.game["card"]
            assert card["seatId"] == sid and card["question"]
            # só a carta da vez aparece
            raw = json.dumps(device.game)
            assert raw.count('"question":') == 1
            device.act("HIDE_CARD", as_seat=sid)
            assert device.game["card"] is None
            device.act("NEXT_CARD", as_seat=sid)

        g = device.game
        assert g["phase"] == "discussion" and g["reveal"] is None
        timer = g["timer"]
        assert timer["paused"] is False and timer["duration"] == 60
        remaining = timer["deadline"] - device.state["serverNow"]
        assert 0 < remaining <= 60
        assert set(room_of(device).timers) == {"countdown"}

        device.act("TIMER_PAUSE")
        assert device.game["timer"]["paused"] is True and device.game["timer"]["deadline"] is None
        assert room_of(device).timers == {}
        device.act("REVEAL")
        rv = device.game["reveal"]
        engine = room_of(device).engine
        assert device.game["phase"] == "reveal" and rv["impostorId"] == engine.impostor_id
        assert rv["outcome"] == "pending" and rv["honestQuestion"].startswith("Honesta")
        device.act("JUDGE", impostorGuessed=False)
        assert device.game["reveal"]["outcome"] == "group_won"
        assert device.game["history"] == [{"round": 1, "impostorId": engine.impostor_id, "outcome": "group_won"}]

        device.act("NEW_ROUND")
        assert device.game["phase"] == "distribution" and device.game["round"] == 2


def test_whatdoyouknow_scoring(three):
    _, _, host, p2, p3 = three
    setup_game(host, "whatdoyouknow")
    g = host.game
    assert g["phase"] == "question" and g["question"]["text"].startswith("Pergunta WDYK")
    target = g["targetId"]
    others = [s for s in ("p1", "p2", "p3") if s != target]
    assert p2.error(type="GAME_ACTION", action={"type": "GO_SCORING"})["code"] == "not_allowed"
    host.act("GO_SCORING")
    assert host.error(type="GAME_ACTION", action={"type": "TOGGLE_WINNER", "seatId": target})["code"] == "invalid_target"
    for sid in others:
        host.act("TOGGLE_WINNER", seatId=sid)
    host.act("CONFIRM")
    expected = {target: 2, **{sid: 1 for sid in others}}
    assert host.game["phase"] == "leaderboard" and host.game["scores"] == expected
    p3.sync()
    ev = p3.pop_events("round_scored")[0]["data"]
    assert ev["targetId"] == target and ev["gains"] == expected
    assert p3.game["ranking"][0]["seatId"] == target
    host.act("NEXT_ROUND")
    assert host.game["phase"] == "question" and host.game["round"] == 2
    assert host.game["targetId"] != target  # sem repetir até todos irem


def test_join_during_game_gets_a_seat(three):
    client, code, host, p2, p3 = three
    setup_game(host, "whatdoyouknow")
    with client.websocket_connect("/ws") as d:
        p4 = join(WS(d), code, "p4", "Ana")
        assert {p["id"]: p["name"] for p in p4.room["players"]}["p4"] == "Ana 2"
        assert p4.game["scores"]["p4"] == 0
        assert "p4" in [s["id"] for s in p4.game["seats"]]
        assert p4.state["you"] == {"playerId": "p4", "isHost": False, "controls": ["p4"]}


def test_not_enough_players_returns_to_lobby(three):
    _, _, host, p2, p3 = three
    setup_game(host, "whatdoyouknow")
    p3.do(type="LEAVE_ROOM")
    host.sync()
    names = host.event_names()
    assert "player_left" in names and "not_enough_players" in names
    assert host.pop_events("returned_to_lobby")[0]["data"] == {"reason": "not_enough_players"}
    assert host.room["stage"] == "lobby" and host.game is None
    assert room_of(host).engine is None and room_of(host).timers == {}
    assert [p["id"] for p in host.room["players"]] == ["p1", "p2"]


def test_host_leaving_mid_game_migrates_host(three):
    _, _, host, p2, p3 = three
    setup_game(host, "classic")
    host.do(type="LEAVE_ROOM")
    p2.sync()
    assert p2.room["hostId"] == "p2" and p2.state["you"]["isHost"] is True
    assert "host_changed" in p2.event_names()
    assert p2.room["stage"] == "game"  # ITO continua com 2
    p2.act("DEAL")
    assert p2.game["phase"] == "rolling"


def test_whoami_online_hides_own_personality(three):
    _, _, host, p2, p3 = three
    setup_game(host, "whoami")
    sync_all(p2, p3)
    personalities = {sid: p["personality"] for sid, p in room_of(host).engine.players.items()}
    for pid, ws in {"p1": host, "p2": p2, "p3": p3}.items():
        view = {p["seatId"]: p["personality"] for p in ws.game["players"]}
        assert view[pid] is None
        assert all(view[s] == personalities[s] for s in view if s != pid)
        assert personalities[pid] not in ws.raw_state
    # p2 marca o acerto de p3 (não o próprio)
    assert p2.error(type="GAME_ACTION", action={"type": "TOGGLE_GUESSED", "seatId": "p2"})["code"] == "not_allowed"
    p2.act("TOGGLE_GUESSED", seatId="p3")
    host.sync()
    assert host.pop_events("guessed")[0]["data"] == {"seatId": "p3", "guessed": True}
    host.act("END_MATCH")
    assert {p["seatId"]: p["personality"] for p in host.game["players"]}["p1"] == personalities["p1"]
