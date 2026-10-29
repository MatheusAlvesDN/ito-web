from app.games.base import Seat
from app.games.content import StaticContent
from app.games.impostor import ImpostorEngine
from games_helpers import (
    assert_secrets_absent, device, emitted, host, local_viewer, make_engine, make_seats,
    online_viewer, player, raises_code, scheduled,
)

SCENARIOS = [("Qual sua comida favorita?", ["Qual comida você odeia?", "Qual sua bebida favorita?"]),
             ("Onde você passaria férias?", ["Onde você nunca iria?"])]
CONTENT = StaticContent(scenarios=SCENARIOS).load("impostor")


def new(n=4, local=False, **cfg):
    return make_engine(ImpostorEngine, n, local=local, config=cfg or None, content=CONTENT)


def test_validate_and_no_content():
    with raises_code("not_enough_players"):
        ImpostorEngine.validate_start(make_seats(2), {})
    ImpostorEngine.validate_start(make_seats(3), {})
    with raises_code("no_content"):
        make_engine(ImpostorEngine, 3, content=None)


def test_round_setup():
    eng, _, _ = new()
    assert eng.phase == "distribution"
    assert eng.impostor_id in eng.round_seats
    honest = {h: v for h, v in SCENARIOS}
    assert eng.impostor_question in honest[eng.honest_question]


def test_online_flow_with_timer():
    eng, clock, _ = new()
    eng.handle_action(player("s2"), {"type": "ACK_CARD"})
    assert eng.view_for(None)["viewed"] == ["s2"]
    with raises_code("not_allowed"):
        eng.handle_action(player("s2"), {"type": "START_DISCUSSION"})
    fx = eng.handle_action(host(), {"type": "START_DISCUSSION"})
    sch = scheduled(fx, "countdown")
    assert eng.phase == "discussion" and sch.delay == 120
    t = eng.view_for(None)["timer"]
    assert t["paused"] is False and t["deadline"] == clock.now + 120

    clock.advance(20)
    with raises_code("not_allowed"):
        eng.handle_action(player("s3"), {"type": "TIMER_PAUSE"})
    eng.handle_action(host(), {"type": "TIMER_PAUSE"})
    assert eng.view_for(None)["timer"]["remaining"] == 100
    assert eng.on_timer("countdown", sch.token) == []  # timer velho
    fx = eng.handle_action(host(), {"type": "TIMER_ADD"})
    assert eng.view_for(None)["timer"]["remaining"] == 130 and scheduled(fx, "countdown") is None
    fx = eng.handle_action(host(), {"type": "TIMER_RESUME"})
    sch2 = scheduled(fx, "countdown")
    assert sch2.delay == 130
    fx = eng.handle_action(host(), {"type": "TIMER_RESET"})
    sch3 = scheduled(fx, "countdown")
    assert sch3.delay == 120
    assert eng.on_timer("countdown", sch2.token) == []
    clock.advance(120)
    fx = eng.on_timer("countdown", sch3.token)
    assert emitted(fx, "time_up")
    assert eng.phase == "discussion"  # não avança sozinho
    assert eng.view_for(None)["timer"]["remaining"] == 0
    with raises_code("time_over"):
        eng.handle_action(host(), {"type": "TIMER_RESUME"})

    eng.handle_action(host(), {"type": "REVEAL"})
    r = eng.view_for(online_viewer("s2"))["reveal"]
    assert r["impostorId"] == eng.impostor_id and r["outcome"] == "pending"
    eng.handle_action(host(), {"type": "JUDGE", "impostorGuessed": True})
    assert eng.view_for(None)["reveal"]["outcome"] == "impostor_won"
    eng.handle_action(host(), {"type": "JUDGE", "impostorGuessed": False})
    v = eng.view_for(None)
    assert v["reveal"]["outcome"] == "group_won"
    assert v["history"] == [{"round": 1, "impostorId": eng.impostor_id, "outcome": "group_won"}]
    fx = eng.handle_action(host(), {"type": "NEW_ROUND"}, CONTENT)
    assert eng.phase == "distribution" and eng.round == 2


def test_timer_actions_only_in_discussion():
    eng, _, _ = new()
    with raises_code("invalid_phase"):
        eng.handle_action(host(), {"type": "TIMER_PAUSE"})
    with raises_code("invalid_phase"):
        eng.handle_action(host(), {"type": "JUDGE", "impostorGuessed": True})


def test_secrecy_online():
    eng, _, _ = new(5)
    imp = eng.impostor_id
    for sid in eng.round_seats:
        view = eng.view_for(online_viewer(sid))
        assert view["you"]["isImpostor"] is (sid == imp)
        if sid == imp:
            assert view["you"]["question"] == eng.impostor_question
            assert_secrets_absent(view, strings=[eng.honest_question], keys=("reveal", "impostorId"))
        else:
            assert view["you"]["question"] == eng.honest_question
            assert_secrets_absent(view, strings=[eng.impostor_question], keys=("reveal", "impostorId"))
            assert '"isImpostor": true' not in __import__("json").dumps(view)
    spect = eng.view_for(None)
    assert_secrets_absent(spect, strings=[eng.impostor_question, eng.honest_question], keys=("reveal",))
    eng.handle_action(host(), {"type": "START_DISCUSSION"})
    honest_seat = next(s for s in eng.round_seats if s != imp)
    assert_secrets_absent(eng.view_for(online_viewer(honest_seat)), strings=[eng.impostor_question])


def test_local_distribution():
    eng, _, _ = new(3, local=True)
    lv = local_viewer(eng)
    v = eng.view_for(lv)
    assert v["card"] is None and v["you"] is None
    assert_secrets_absent(v, strings=[eng.honest_question, eng.impostor_question], keys=("reveal",))
    with raises_code("not_your_turn"):
        eng.handle_action(device("s2"), {"type": "REVEAL_CARD"})
    order = []
    for sid in ("s1", "s2", "s3"):
        eng.handle_action(device(sid), {"type": "REVEAL_CARD"})
        card = eng.view_for(lv)["card"]
        order.append(card["seatId"])
        assert card["isImpostor"] is (sid == eng.impostor_id)
        hidden = eng.honest_question if sid == eng.impostor_id else eng.impostor_question
        assert_secrets_absent(eng.view_for(lv), strings=[hidden])
        fx = eng.handle_action(device(sid), {"type": "NEXT_CARD"})
    assert order == ["s1", "s2", "s3"]
    assert eng.phase == "discussion" and scheduled(fx, "countdown")


def test_impostor_leaving_restarts_round():
    eng, _, _ = new(5)
    imp = eng.impostor_id
    fx = eng.on_seat_left(imp)
    assert emitted(fx, "round_aborted")
    assert eng.round == 2 and eng.phase == "distribution" and imp not in eng.round_seats
    assert eng.impostor_id != imp


def test_honest_leaving_keeps_round_and_join_waits():
    eng, _, _ = new(5)
    honest = next(s for s in eng.round_seats if s not in (eng.impostor_id, "s1"))
    fx = eng.on_seat_left(honest)
    assert not emitted(fx, "round_aborted") and eng.round == 1
    eng.on_seat_joined(Seat("s9", "Nova"))
    assert eng.view_for(online_viewer("s9"))["you"] is None
    eng.handle_action(host(), {"type": "NEW_ROUND"}, CONTENT)
    assert "s9" in eng.round_seats


def test_impostor_leaving_with_too_few_players():
    eng, _, _ = new(3)
    fx = eng.on_seat_left(eng.impostor_id)
    assert emitted(fx, "round_aborted") and emitted(fx, "not_enough_players")
    assert eng.round == 1
