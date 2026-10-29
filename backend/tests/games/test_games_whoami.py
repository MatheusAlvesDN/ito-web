import json

from app.games.base import Seat
from app.games.content import StaticContent
from app.games.whoami import WhoAmIEngine
from games_helpers import (
    assert_secrets_absent, device, emitted, host, local_viewer, make_engine, make_seats,
    online_viewer, player, raises_code, scheduled,
)

PEOPLE = ["Pelé", "Einstein", "Cleópatra", "Frida Kahlo", "Santos Dumont", "Tiradentes"]
CONTENT = StaticContent(personalities=PEOPLE + ["pelé"]).load("whoami")


def new(n=3, local=False, people=None):
    content = CONTENT if people is None else StaticContent(personalities=people).load("whoami")
    eng, clock, _ = make_engine(WhoAmIEngine, n, local=local, content=content)
    return eng, clock


def pers(eng, sid):
    return eng.players[sid]["personality"]


def test_pool_dedup_and_validate():
    assert CONTENT.personalities == PEOPLE
    with raises_code("not_enough_players"):
        WhoAmIEngine.validate_start(make_seats(1), {})


def test_online_starts_playing_with_distinct_personalities():
    eng, _ = new(5)
    assert eng.phase == "playing"
    assigned = [pers(eng, s) for s in eng.seat_ids()]
    assert len(set(assigned)) == 5


def test_more_players_than_pool_repeats():
    eng, _ = new(4, people=["A", "B"])
    assert sorted(pers(eng, s) for s in eng.seat_ids()) == ["A", "A", "B", "B"]


def test_online_secrecy_own_card_hidden_until_match_end():
    eng, _ = new(3)
    for sid in eng.seat_ids():
        v = eng.view_for(online_viewer(sid))
        mine = next(p for p in v["players"] if p["seatId"] == sid)
        assert mine["personality"] is None
        assert_secrets_absent(v, strings=[pers(eng, sid)])
        others = [p["personality"] for p in v["players"] if p["seatId"] != sid]
        assert others == [pers(eng, s) for s in eng.seat_ids() if s != sid]
    eng.handle_action(host(), {"type": "END_MATCH"})
    v = eng.view_for(online_viewer("s2"))
    assert next(p for p in v["players"] if p["seatId"] == "s2")["personality"] == pers(eng, "s2")
    # partida seguinte: histórico antigo pode mostrar a carta antiga, mas não a nova
    eng.handle_action(host(), {"type": "NEXT_MATCH"}, CONTENT)
    v = eng.view_for(online_viewer("s2"))
    current = json.dumps(v["players"], ensure_ascii=False)
    assert pers(eng, "s2") not in current or any(
        p["personality"] == pers(eng, "s2") for p in v["players"] if p["seatId"] != "s2")
    assert all(m["matchNumber"] == 1 for m in v["history"])
    assert next(p for p in v["players"] if p["seatId"] == "s2")["personality"] is None


def test_local_all_cards_visible_and_reveal_distribution():
    eng, _ = new(3, local=True)
    assert eng.phase == "reveal"
    lv = local_viewer(eng)
    v = eng.view_for(lv)
    assert all(p["personality"] for p in v["players"])
    assert v["distribution"]["current"] == "s1" and v["card"] is None
    with raises_code("not_your_turn"):
        eng.handle_action(device("s2"), {"type": "REVEAL_CARD"})
    eng.handle_action(device("s1"), {"type": "REVEAL_CARD"})
    assert eng.view_for(lv)["card"] == {"seatId": "s1", "personality": pers(eng, "s1")}
    # reroll só da carta revelada
    with raises_code("not_your_turn"):
        eng.handle_action(device("s2"), {"type": "REROLL", "seatId": "s2"}, CONTENT)
    before = pers(eng, "s1")
    eng.handle_action(device("s1"), {"type": "REROLL", "seatId": "s1"}, CONTENT)
    after = pers(eng, "s1")
    assert after != before and after not in (pers(eng, "s2"), pers(eng, "s3"))
    for sid in ("s1", "s2", "s3"):
        if sid != "s1":
            eng.handle_action(device(sid), {"type": "REVEAL_CARD"})
        eng.handle_action(device(sid), {"type": "NEXT_CARD"})
    assert eng.phase == "playing"


def test_rounds_timer_and_scoring():
    eng, clock = new(3)
    t = eng.view_for(None)["timer"]
    assert t["paused"] is True and t["remaining"] == 120
    with raises_code("not_allowed"):
        eng.handle_action(player("s2"), {"type": "TIMER_RESUME"})
    fx = eng.handle_action(host(), {"type": "TIMER_RESUME"})
    sch = scheduled(fx, "countdown")
    clock.advance(30)
    fx = eng.handle_action(host(), {"type": "NEXT_ROUND"})
    assert eng.round == 2 and eng.view_for(None)["timer"]["paused"] is True
    assert eng.on_timer("countdown", sch.token) == []

    # online: qualquer um menos o próprio alvo marca o acerto
    with raises_code("not_allowed"):
        eng.handle_action(player("s2"), {"type": "TOGGLE_GUESSED", "seatId": "s2"})
    fx = eng.handle_action(player("s3"), {"type": "TOGGLE_GUESSED", "seatId": "s2"})
    assert emitted(fx, "guessed")[0].data == {"seatId": "s2", "guessed": True}
    assert eng.players["s2"]["roundsToGuess"] == 2
    eng.handle_action(host(), {"type": "TOGGLE_GUESSED", "seatId": "s1"})
    eng.handle_action(host(), {"type": "TOGGLE_GUESSED", "seatId": "s1"})
    assert eng.players["s1"] == {"personality": pers(eng, "s1"), "guessed": False, "roundsToGuess": None}
    eng.handle_action(host(), {"type": "ADJUST_ROUNDS", "seatId": "s2", "delta": -5})
    assert eng.players["s2"]["roundsToGuess"] == 1
    with raises_code("not_allowed"):
        eng.handle_action(player("s3"), {"type": "ADJUST_ROUNDS", "seatId": "s2", "delta": 1})
    eng.handle_action(host(), {"type": "NEXT_ROUND"})
    eng.handle_action(host(), {"type": "NEXT_ROUND"})  # rodada 4
    eng.handle_action(host(), {"type": "END_MATCH"})
    assert eng.phase == "match_ended"
    res = {r["seatId"]: r for r in eng.history[0]["results"]}
    assert res["s2"]["guessed"] and res["s2"]["roundsToGuess"] == 1
    assert not res["s1"]["guessed"] and res["s1"]["roundsToGuess"] == 4
    # ajuste depois do fim atualiza o histórico
    eng.handle_action(host(), {"type": "ADJUST_ROUNDS", "seatId": "s1", "delta": 1})
    assert {r["seatId"]: r for r in eng.history[0]["results"]}["s1"]["roundsToGuess"] == 5

    eng.handle_action(host(), {"type": "NEXT_MATCH"}, CONTENT)
    assert eng.match_number == 2 and eng.phase == "playing" and eng.round == 1
    eng.handle_action(host(), {"type": "TOGGLE_GUESSED", "seatId": "s1"})
    eng.handle_action(host(), {"type": "TOGGLE_GUESSED", "seatId": "s3"})
    eng.handle_action(host(), {"type": "NEXT_ROUND"})
    eng.handle_action(host(), {"type": "TOGGLE_GUESSED", "seatId": "s2"})
    eng.handle_action(host(), {"type": "END_MATCH"})
    eng.handle_action(host(), {"type": "SHOW_OVERALL"})
    overall = eng.view_for(None)["overall"]
    # s2: 2 acertos, 1+2=3 rodadas; s3: 1 acerto, 4+1=5; s1: 1 acerto, 5+1=6
    assert [(o["seatId"], o["matchesGuessed"], o["totalRounds"]) for o in overall] == [
        ("s2", 2, 3), ("s3", 1, 5), ("s1", 1, 6)]
    assert overall[0]["totalMatches"] == 2 and len(overall[0]["history"]) == 2

    eng.handle_action(host(), {"type": "RESET_ALL"}, CONTENT)
    assert eng.history == [] and eng.match_number == 1 and eng.phase == "playing"


def test_local_host_only_toggle():
    eng, _ = new(3, local=True)
    for sid in eng.seat_ids():
        eng.handle_action(device(sid), {"type": "REVEAL_CARD"})
        eng.handle_action(device(sid), {"type": "NEXT_CARD"})
    eng.handle_action(device("s1"), {"type": "TOGGLE_GUESSED", "seatId": "s1"})
    assert eng.players["s1"]["guessed"]


def test_phase_guards():
    eng, _ = new(3)
    with raises_code("invalid_phase"):
        eng.handle_action(host(), {"type": "SHOW_OVERALL"})
    with raises_code("invalid_phase"):
        eng.handle_action(host(), {"type": "NEXT_MATCH"}, CONTENT)
    with raises_code("unknown_seat"):
        eng.handle_action(host(), {"type": "TOGGLE_GUESSED", "seatId": "zz"})


def test_join_and_leave():
    eng, _ = new(3)
    eng.on_seat_joined(Seat("s9", "Nova"))
    assert pers(eng, "s9") and pers(eng, "s9") not in [pers(eng, s) for s in ("s1", "s2", "s3")]
    eng.on_seat_left("s2")
    assert "s2" not in eng.players
    fx = eng.on_seat_left("s3")
    assert not emitted(fx, "not_enough_players")  # s1 e s9
    fx = eng.on_seat_left("s9")
    assert emitted(fx, "not_enough_players")
