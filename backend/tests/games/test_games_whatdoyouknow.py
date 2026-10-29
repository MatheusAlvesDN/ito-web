from app.games.base import Seat
from app.games.content import StaticContent
from app.games.whatdoyouknow import WhatDoYouKnowEngine
from games_helpers import emitted, host, make_engine, make_seats, player, raises_code

QUESTIONS = ["Q1", "Q2", "Q3"]
CONTENT = StaticContent(questions=QUESTIONS).load("whatdoyouknow")


def new(n=4):
    eng, _, _ = make_engine(WhatDoYouKnowEngine, n, content=CONTENT)
    return eng


def play_round(eng, winners=()):
    eng.handle_action(host(), {"type": "GO_SCORING"})
    for w in winners:
        eng.handle_action(host(), {"type": "TOGGLE_WINNER", "seatId": w})
    fx = eng.handle_action(host(), {"type": "CONFIRM"})
    eng.handle_action(host(), {"type": "NEXT_ROUND"}, CONTENT)
    return fx


def test_validate():
    with raises_code("not_enough_players"):
        WhatDoYouKnowEngine.validate_start(make_seats(2), {})
    with raises_code("no_content"):
        make_engine(WhatDoYouKnowEngine, 3, content=None)


def test_scoring():
    eng = new(4)
    assert eng.phase == "question" and eng.round == 1
    target = eng.target_id
    others = [s for s in eng.seat_ids() if s != target]
    eng.handle_action(host(), {"type": "GO_SCORING"})
    with raises_code("invalid_target"):
        eng.handle_action(host(), {"type": "TOGGLE_WINNER", "seatId": target})
    with raises_code("unknown_seat"):
        eng.handle_action(host(), {"type": "TOGGLE_WINNER", "seatId": "zz"})
    for w in others:
        eng.handle_action(host(), {"type": "TOGGLE_WINNER", "seatId": w})
    eng.handle_action(host(), {"type": "TOGGLE_WINNER", "seatId": others[2]})  # desmarca
    assert eng.view_for(None)["winners"] == others[:2]
    fx = eng.handle_action(host(), {"type": "CONFIRM"})
    v = eng.view_for(None)
    assert v["phase"] == "leaderboard"
    assert v["scores"][target] == 2 and v["scores"][others[0]] == 1 and v["scores"][others[2]] == 0
    assert v["ranking"][0]["seatId"] == target
    assert emitted(fx, "round_scored")[0].data["gains"] == {target: 2, others[0]: 1, others[1]: 1}


def test_permissions_and_phases():
    eng = new(3)
    with raises_code("not_allowed"):
        eng.handle_action(player("s2"), {"type": "GO_SCORING"})
    with raises_code("invalid_phase"):
        eng.handle_action(host(), {"type": "CONFIRM"})
    with raises_code("invalid_phase"):
        eng.handle_action(host(), {"type": "TOGGLE_WINNER", "seatId": "s2"})


def test_targets_rotate_without_repeat_and_questions_cycle():
    eng = new(4)
    targets, questions = [eng.target_id], [eng.question.text]
    for _ in range(3):
        play_round(eng)
        targets.append(eng.target_id)
        questions.append(eng.question.text)
    assert sorted(targets) == sorted(eng.seat_ids())
    assert sorted(questions[:3]) == sorted(QUESTIONS)
    play_round(eng)  # refaz a fila
    assert eng.target_id in eng.seat_ids()


def test_target_leaving_redraws_and_join():
    eng = new(4)
    eng.handle_action(host(), {"type": "GO_SCORING"})
    old = eng.target_id if eng.target_id != "s1" else None
    if old is None:  # garante um alvo que não é o líder
        eng.handle_action(host(), {"type": "CONFIRM"})
        eng.handle_action(host(), {"type": "NEXT_ROUND"}, CONTENT)
        eng.handle_action(host(), {"type": "GO_SCORING"})
        old = eng.target_id
    others = [s for s in eng.seat_ids() if s not in (old,)]
    eng.handle_action(host(), {"type": "TOGGLE_WINNER", "seatId": others[0]})
    fx = eng.on_seat_left(old)
    assert emitted(fx, "target_changed")
    assert eng.target_id != old and eng.target_id in eng.seat_ids()
    assert eng.phase == "question" and eng.winners == []
    assert old not in eng.view_for(None)["scores"] and old not in eng.remaining
    eng.on_seat_joined(Seat("s9", "Nova"))
    assert eng.view_for(None)["scores"]["s9"] == 0 and "s9" in eng.remaining


def test_non_target_leaving_removed_from_queue():
    eng = new(5)
    leaver = next(s for s in eng.seat_ids() if s not in (eng.target_id, "s1"))
    eng.handle_action(host(), {"type": "GO_SCORING"})
    eng.handle_action(host(), {"type": "TOGGLE_WINNER", "seatId": leaver})
    eng.on_seat_left(leaver)
    assert leaver not in eng.remaining and leaver not in eng.winners
    assert eng.phase == "scoring"


def test_leave_below_min():
    eng = new(3)
    fx = eng.on_seat_left(next(s for s in eng.seat_ids() if s != eng.target_id))
    assert emitted(fx, "not_enough_players")
