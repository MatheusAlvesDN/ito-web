from app.games.common.countdown import Countdown


def test_starts_paused_with_full_time():
    c = Countdown(120)
    assert c.paused
    assert c.view(0) == {"duration": 120.0, "deadline": None, "paused": True, "remaining": 120.0}


def test_start_pause_resume():
    c = Countdown(120)
    c.start(1000)
    assert c.deadline == 1120
    assert c.remaining(1030) == 90
    c.pause(1030)
    assert c.paused and c.remaining(5000) == 90
    c.resume(2000)
    assert c.deadline == 2090
    assert not c.view(2000)["paused"]


def test_add_running_and_paused():
    c = Countdown(60)
    c.add(30, 0)
    assert c.remaining(0) == 90
    c.start(0)
    c.add(30, 10)
    assert c.remaining(10) == 110


def test_reset_goes_back_paused_and_finish():
    c = Countdown(60)
    c.start(0)
    c.reset()
    assert c.paused and c.remaining(100) == 60
    c.reset(90)
    assert c.duration == 90 and c.remaining(0) == 90
    c.start(0)
    c.finish()
    assert c.paused and c.expired(0)


def test_remaining_never_negative():
    c = Countdown(10)
    c.start(0)
    assert c.remaining(50) == 0
    assert c.expired(50)
