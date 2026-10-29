import pytest

from app.games.base import GameError
from app.games.common.distribution import SecretDistribution


def test_local_sequential_order():
    d = SecretDistribution(["a", "b", "c"], local=True)
    assert d.current == "a"
    assert not d.visible_to("a")
    with pytest.raises(GameError) as e:
        d.reveal("b")
    assert e.value.code == "not_your_turn"
    with pytest.raises(GameError) as e:
        d.next()
    assert e.value.code == "card_not_seen"
    assert d.reveal("a") == "a"
    assert d.visible_to("a") and not d.visible_to("b")
    d.hide()
    assert not d.visible_to("a")
    assert d.next() is False
    assert d.current == "b" and not d.revealed
    d.reveal(None)  # aparelho sem asSeat revela a carta da vez
    d.next()
    d.reveal("c")
    assert d.next() is True
    assert d.done and d.current is None
    assert d.view()["viewed"] == ["a", "b", "c"]


def test_online_ack_and_visibility():
    d = SecretDistribution(["a", "b"], local=False)
    assert d.visible_to("a") and d.visible_to("b") and not d.visible_to("z")
    assert d.current is None
    with pytest.raises(GameError):
        d.reveal("a")
    d.ack("a")
    assert not d.done
    d.ack("b")
    assert d.done
    with pytest.raises(GameError):
        d.ack("z")


def test_remove_adjusts_cursor():
    d = SecretDistribution(["a", "b", "c", "d"], local=True)
    d.reveal("a"); d.next()
    d.reveal("b")
    d.remove("a")  # antes do cursor
    assert d.current == "b" and d.revealed
    d.remove("b")  # o da vez: esconde e o próximo assume
    assert d.current == "c" and not d.revealed
    d.remove("d")
    d.reveal("c")
    assert d.next() is True
