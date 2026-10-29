from app.games.base import Cancel, Seat
from app.games.content import FREE_MODE_QUESTION, StaticContent
from app.games.ito import ItoEngine
from games_helpers import (
    assert_secrets_absent, device, emitted, host, local_viewer, make_engine, make_seats,
    online_viewer, player, raises_code, scheduled,
)

QUESTIONS = [f"Pergunta {i}" for i in range(5)]
CONTENT = StaticContent(questions=QUESTIONS).load("classic")


def new(n=4, local=False, **cfg):
    eng, clock, _ = make_engine(ItoEngine, n, local=local, config=cfg or None, content=CONTENT)
    return eng, clock


def deal(eng, actor=None):
    fx = eng.handle_action(actor or host(local=eng.local), {"type": "DEAL"})
    sch = scheduled(fx, "rolling")
    assert sch and sch.delay == 2.5
    eng.on_timer("rolling", sch.token)
    assert eng.phase == "numbers"


def to_ordering(eng):
    deal(eng)
    eng.handle_action(host(), {"type": "START_ORDERING"}, CONTENT)
    assert eng.phase == "ordering"


def sorted_order(eng):
    return sorted(eng.round_seats, key=eng.numbers.__getitem__)


def wrong_order(eng):
    return list(reversed(sorted_order(eng)))


# ---------------------------------------------------------------- validação

def test_validate_start():
    ItoEngine.validate_start(make_seats(2), {})
    with raises_code("not_enough_players"):
        ItoEngine.validate_start(make_seats(1), {})
    with raises_code("not_enough_players"):
        ItoEngine.validate_start(make_seats(2), {"saboteur": True})
    with raises_code("too_many_players"):
        ItoEngine.validate_start(make_seats(51), {"scale": 50})
    with raises_code("invalid_config"):
        ItoEngine.validate_start(make_seats(3), {"scale": 70})
    with raises_code("invalid_config"):
        ItoEngine.validate_start(make_seats(3), {"lives": 6})


def test_start_without_content_fails():
    with raises_code("no_content"):
        make_engine(ItoEngine, 3, content=None)


# ---------------------------------------------------------------- fluxo

def test_full_round_success():
    eng, _ = new(4, scale=1000)
    assert eng.phase == "init"
    deal(eng)
    assert len(set(eng.numbers.values())) == 4
    assert all(1 <= n <= 1000 for n in eng.numbers.values())
    eng.handle_action(host(), {"type": "START_ORDERING"}, CONTENT)
    assert eng.question.text in QUESTIONS
    eng.handle_action(host(), {"type": "SET_ORDER", "order": sorted_order(eng)})
    fx = eng.handle_action(host(), {"type": "CHECK"})
    assert emitted(fx, "round_result")[0].data == {"success": True, "lives": 3}
    v = eng.view_for(None)
    assert v["phase"] == "result" and v["lastResult"] == {"success": True, "livesLost": 0}
    assert v["numbers"] == eng.numbers
    eng.handle_action(host(), {"type": "NEXT_ROUND"})
    assert eng.phase == "init" and eng.round == 2 and eng.numbers == {}


def test_failure_costs_life_and_game_over_without_saboteur():
    eng, _ = new(3, lives=1)
    to_ordering(eng)
    eng.handle_action(host(), {"type": "SET_ORDER", "order": wrong_order(eng)})
    eng.handle_action(host(), {"type": "CHECK"})
    assert eng.lives == 0 and eng.phase == "result" and eng.view_for(None)["gameOver"]
    with raises_code("game_over"):
        eng.handle_action(host(), {"type": "NEXT_ROUND"})
    eng.handle_action(host(), {"type": "RESTART"})
    assert eng.phase == "init" and eng.lives == 1 and eng.round == 1


def test_move_action():
    eng, _ = new(3)
    to_ordering(eng)
    a, b, c = eng.order
    eng.handle_action(host(), {"type": "MOVE", "seatId": c, "toIndex": 0})
    assert eng.order == [c, a, b]
    eng.handle_action(host(), {"type": "MOVE", "seatId": a, "toIndex": 99})
    assert eng.order == [c, b, a]
    with raises_code("unknown_seat"):
        eng.handle_action(host(), {"type": "MOVE", "seatId": "zz", "toIndex": 0})
    with raises_code("invalid_order"):
        eng.handle_action(host(), {"type": "SET_ORDER", "order": [a, a, b]})


def test_questions_do_not_repeat_until_exhausted():
    eng, _ = new(2)
    seen = []
    for _ in range(len(QUESTIONS)):
        to_ordering(eng)
        seen.append(eng.question.text)
        eng.handle_action(host(), {"type": "SET_ORDER", "order": sorted_order(eng)})
        eng.handle_action(host(), {"type": "CHECK"})
        eng.handle_action(host(), {"type": "NEXT_ROUND"})
    assert sorted(seen) == sorted(QUESTIONS)
    to_ordering(eng)  # esgotou: recomeça
    assert eng.question.text in QUESTIONS


def test_free_mode():
    free = StaticContent().load("classic", ["free"])
    eng, _, _ = make_engine(ItoEngine, 2, content=free)
    deal(eng)
    eng.handle_action(host(), {"type": "START_ORDERING"})
    assert eng.view_for(None)["question"] == {"text": FREE_MODE_QUESTION, "themeId": "free"}


# ---------------------------------------------------------------- permissões / fases

def test_permissions_and_phases():
    eng, _ = new(3)
    with raises_code("not_allowed") as e:
        eng.handle_action(player("s2"), {"type": "DEAL"})
    assert e.value.message == "Só o líder pode fazer isso."
    with raises_code("invalid_phase"):
        eng.handle_action(host(), {"type": "CHECK"})
    with raises_code("invalid_action"):
        eng.handle_action(host(), {"type": "NOPE"})
    with raises_code("invalid_action"):
        eng.handle_action(host(), {"type": "MOVE"})
    with raises_code("unknown_seat"):
        eng.handle_action(player("ghost"), {"type": "ACK_CARD"})
    deal(eng)
    eng.handle_action(player("s2"), {"type": "ACK_CARD"})
    assert eng.view_for(None)["viewed"] == ["s2"]
    with raises_code("not_allowed"):
        eng.handle_action(player("s2"), {"type": "START_ORDERING"}, CONTENT)


def test_stale_rolling_timer_is_ignored():
    eng, _ = new(3)
    fx = eng.handle_action(host(), {"type": "DEAL"})
    token = scheduled(fx, "rolling").token
    fx = eng.handle_action(host(), {"type": "RESTART"})
    assert Cancel("rolling") in fx
    assert eng.phase == "init"
    assert eng.on_timer("rolling", token) == []
    assert eng.phase == "init"
    # token errado também não muda nada
    fx = eng.handle_action(host(), {"type": "DEAL"})
    assert eng.on_timer("rolling", 999) == [] and eng.phase == "rolling"
    seq = eng.phase_seq
    eng.on_timer("rolling", scheduled(fx, "rolling").token)
    assert eng.phase == "numbers" and eng.phase_seq == seq + 1
    # mesmo token duas vezes: segunda vez ignorada
    assert eng.on_timer("rolling", scheduled(fx, "rolling").token) == []


# ---------------------------------------------------------------- sigilo

def test_secrecy_online_numbers_and_saboteur():
    eng, _ = new(4, scale=1000, saboteur=True)
    deal(eng)
    for sid in eng.round_seats:
        view = eng.view_for(online_viewer(sid))
        assert view["you"]["number"] == eng.numbers[sid]
        others = [n for s, n in eng.numbers.items() if s != sid]
        keys = ("numbers", "saboteurReveal")
        assert_secrets_absent(view, ints=others, keys=keys)
        if sid != eng.saboteur_id:
            assert view["you"]["isSaboteur"] is False
            assert '"isSaboteur": true' not in __import__("json").dumps(view)
        else:
            assert view["you"]["isSaboteur"] is True
    # espectador não vê nenhum número
    assert_secrets_absent(eng.view_for(None), ints=list(eng.numbers.values()), keys=("numbers",))
    # ordenação ainda é segredo
    eng.handle_action(host(), {"type": "START_ORDERING"}, CONTENT)
    sid = eng.round_seats[0]
    others = [n for s, n in eng.numbers.items() if s != sid]
    assert_secrets_absent(eng.view_for(online_viewer(sid)), ints=others, keys=("numbers",))


def test_numbers_hidden_during_rolling():
    eng, _ = new(3, scale=1000)
    eng.handle_action(host(), {"type": "DEAL"})
    v = eng.view_for(online_viewer("s1"))
    assert v["you"]["number"] is None
    assert_secrets_absent(v, ints=list(eng.numbers.values()))


# ---------------------------------------------------------------- pass and play

def test_local_distribution_order_and_auto_ordering():
    eng, _ = new(3, local=True, scale=1000)
    deal(eng, device())
    with raises_code("invalid_action"):
        eng.handle_action(device("s1"), {"type": "ACK_CARD"})
    lv = local_viewer(eng)
    v = eng.view_for(lv)
    assert v["distribution"]["current"] == "s1" and v["card"] is None
    assert_secrets_absent(v, ints=list(eng.numbers.values()))
    with raises_code("not_your_turn"):
        eng.handle_action(device("s2"), {"type": "REVEAL_CARD"})
    with raises_code("card_not_seen"):
        eng.handle_action(device("s1"), {"type": "NEXT_CARD"}, CONTENT)
    eng.handle_action(device("s1"), {"type": "REVEAL_CARD"})
    v = eng.view_for(lv)
    assert v["card"]["seatId"] == "s1" and v["card"]["number"] == eng.numbers["s1"]
    others = [eng.numbers["s2"], eng.numbers["s3"]]
    assert_secrets_absent(v, ints=others)
    eng.handle_action(device("s1"), {"type": "HIDE_CARD"})
    assert eng.view_for(lv)["card"] is None
    eng.handle_action(device("s1"), {"type": "NEXT_CARD"}, CONTENT)
    for sid in ("s2", "s3"):
        eng.handle_action(device(sid), {"type": "REVEAL_CARD"})
        eng.handle_action(device(sid), {"type": "NEXT_CARD"}, CONTENT)
    assert eng.phase == "ordering" and eng.question is not None
    with raises_code("invalid_phase"):
        eng.handle_action(device("s1"), {"type": "REVEAL_CARD"})


# ---------------------------------------------------------------- sabotador

def saboteur_game(local=False, n=4):
    eng, clock = new(n, local=local, saboteur=True, lives=1)
    sab = eng.saboteur_id
    assert sab in eng.seat_ids()
    if local:
        deal(eng, device())
        for sid in list(eng.round_seats):
            eng.handle_action(device(sid), {"type": "REVEAL_CARD"})
            eng.handle_action(device(sid), {"type": "NEXT_CARD"}, CONTENT)
    else:
        to_ordering(eng)
    return eng, sab


def test_saboteur_vote_only_when_lives_reach_zero():
    eng, _ = new(4, saboteur=True, lives=2)
    to_ordering(eng)
    eng.handle_action(host(), {"type": "SET_ORDER", "order": wrong_order(eng)})
    eng.handle_action(host(), {"type": "CHECK"})
    assert eng.phase == "result" and eng.lives == 1 and not eng.game_over
    sab = eng.saboteur_id
    eng.handle_action(host(), {"type": "NEXT_ROUND"})
    assert eng.saboteur_id == sab  # mesmo sabotador entre rodadas
    to_ordering(eng)
    eng.handle_action(host(), {"type": "SET_ORDER", "order": wrong_order(eng)})
    eng.handle_action(host(), {"type": "CHECK"})
    assert eng.phase == "saboteur_voting"


def fail(eng, actor=None):
    actor = actor or host(local=eng.local)
    eng.handle_action(actor, {"type": "SET_ORDER", "order": wrong_order(eng)})
    eng.handle_action(actor, {"type": "CHECK"})
    assert eng.phase == "saboteur_voting"


def test_online_vote_group_finds_saboteur():
    eng, sab = saboteur_game()
    fail(eng)
    voters = [s for s in eng.round_seats if s != sab]
    with raises_code("self_vote"):
        eng.handle_action(player(voters[0]), {"type": "VOTE", "targetId": voters[0]})
    with raises_code("unknown_seat"):
        eng.handle_action(player(voters[0]), {"type": "VOTE", "targetId": "zz"})
    eng.handle_action(player(voters[0]), {"type": "VOTE", "targetId": voters[1]})
    eng.handle_action(player(voters[0]), {"type": "VOTE", "targetId": sab})  # troca o voto
    for v in voters[1:]:
        eng.handle_action(player(v), {"type": "VOTE", "targetId": sab})
    eng.handle_action(player(sab), {"type": "VOTE", "targetId": voters[0]})
    view = eng.view_for(online_viewer(voters[0]))
    assert view["voting"]["voteCounts"] == {sab: 3, voters[0]: 1}
    assert view["voting"]["myVote"] == sab
    assert view["saboteurReveal"] is None
    with raises_code("not_allowed"):
        eng.handle_action(player(voters[1]), {"type": "REVEAL_SABOTEUR"})
    fx = eng.handle_action(host(), {"type": "REVEAL_SABOTEUR"})
    assert emitted(fx, "saboteur_result")[0].data == {"groupWon": True}
    r = eng.view_for(None)["saboteurReveal"]
    assert r["saboteurId"] == sab and r["suspectId"] == sab and r["groupWon"] is True


def test_online_vote_tie_means_saboteur_wins():
    eng, sab = saboteur_game()
    fail(eng)
    others = [s for s in eng.round_seats if s != sab]
    a, b, c = others
    eng.handle_action(player(a), {"type": "VOTE", "targetId": sab})
    eng.handle_action(player(b), {"type": "VOTE", "targetId": c})
    eng.handle_action(player(sab), {"type": "VOTE", "targetId": a})
    eng.handle_action(player(c), {"type": "VOTE", "targetId": a})
    # contagem: sab=1, c=1, a=2 -> a é o mais votado (não é o sabotador)
    eng.handle_action(host(), {"type": "REVEAL_SABOTEUR"})
    assert eng.view_for(None)["saboteurReveal"]["groupWon"] is False

    eng2, sab2 = saboteur_game()
    fail(eng2)
    x, y, z = [s for s in eng2.round_seats if s != sab2]
    eng2.handle_action(player(x), {"type": "VOTE", "targetId": sab2})
    eng2.handle_action(player(y), {"type": "VOTE", "targetId": z})
    eng2.handle_action(host(), {"type": "REVEAL_SABOTEUR"})
    r = eng2.view_for(None)["saboteurReveal"]
    assert r["suspectId"] is None and r["groupWon"] is False  # empate 1x1


def test_no_votes_saboteur_wins():
    eng, _ = saboteur_game()
    fail(eng)
    eng.handle_action(host(), {"type": "REVEAL_SABOTEUR"})
    assert eng.view_for(None)["saboteurReveal"]["groupWon"] is False


def test_local_accuse():
    eng, sab = saboteur_game(local=True)
    fail(eng, device())
    with raises_code("invalid_action"):
        eng.handle_action(device("s1"), {"type": "VOTE", "targetId": "s2"})
    eng.handle_action(device(), {"type": "ACCUSE", "suspectId": sab})
    assert eng.phase == "saboteur_reveal" and eng.group_won is True
    eng.handle_action(device(), {"type": "RESTART"})
    assert eng.phase == "init" and eng.lives == 1


def test_saboteur_secret_until_reveal():
    eng, sab = saboteur_game()
    fail(eng)
    for sid in eng.round_seats:
        view = eng.view_for(online_viewer(sid))
        assert_secrets_absent(view, keys=("saboteurId", "saboteurReveal"))
        assert view["you"]["isSaboteur"] is (sid == sab)


def test_saboteur_redrawn_on_restart():
    eng, _ = new(6, saboteur=True)
    drawn = set()
    for _ in range(20):
        drawn.add(eng.saboteur_id)
        eng.handle_action(host(), {"type": "RESTART"})
    assert len(drawn) > 1


# ---------------------------------------------------------------- entrada/saída

def test_leave_during_round_and_join():
    eng, _ = new(4)
    to_ordering(eng)
    fx = eng.on_seat_left("s3")
    assert "s3" not in eng.order and "s3" not in eng.numbers
    assert not emitted(fx, "not_enough_players")
    eng.on_seat_joined(Seat("s9", "Nova"))
    assert "s9" not in eng.round_seats
    assert eng.view_for(online_viewer("s9"))["you"]["number"] is None
    eng.handle_action(host(), {"type": "SET_ORDER", "order": sorted_order(eng)})
    eng.handle_action(host(), {"type": "CHECK"})
    eng.handle_action(host(), {"type": "NEXT_ROUND"})
    deal(eng)
    assert "s9" in eng.round_seats


def test_leave_below_min_emits():
    eng, _ = new(2)
    fx = eng.on_seat_left("s2")
    assert emitted(fx, "not_enough_players")
    assert eng.on_seat_left("nobody") == []


def test_saboteur_leaving_ends_vote():
    eng, sab = saboteur_game(n=5)
    fail(eng)
    eng.on_seat_left(sab)
    assert eng.phase == "result" and eng.game_over
