"""Utilidades compartilhadas pelos testes dos motores."""

from __future__ import annotations

import json
import random

import pytest

from app.games.base import Actor, Emit, GameError, Schedule, Seat, Viewer


class FakeClock:
    def __init__(self, now: float = 1000.0):
        self.now = now

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


def make_seats(n: int) -> list[Seat]:
    return [Seat(f"s{i}", f"Jogador {i}") for i in range(1, n + 1)]


def make_engine(cls, n=4, *, local=False, config=None, content=None, seed=7, clock=None):
    clock = clock or FakeClock()
    eng = cls(config, make_seats(n), local=local, rng=random.Random(seed), clock=clock)
    fx = eng.start(content)
    return eng, clock, fx


def host(seat_id="s1", local=False) -> Actor:
    return Actor("p-" + (seat_id or "host"), seat_id, True, local)


def player(seat_id: str) -> Actor:
    return Actor("p-" + seat_id, seat_id, False, False)


def device(seat_id: str | None = None) -> Actor:
    """Aparelho do Pass and Play agindo por ``seat_id``."""
    return Actor("device", seat_id, True, True)


def online_viewer(seat_id: str, is_host=False) -> Viewer:
    return Viewer(frozenset({seat_id}), is_host, False)


def local_viewer(engine) -> Viewer:
    return Viewer(frozenset(engine.seat_ids()), True, True)


def emitted(fx, name: str) -> list[Emit]:
    return [e for e in fx if isinstance(e, Emit) and e.name == name]


def scheduled(fx, key: str) -> Schedule | None:
    found = [e for e in fx if isinstance(e, Schedule) and e.key == key]
    return found[-1] if found else None


def raises_code(code: str):
    class _Ctx:
        def __enter__(self):
            self._cm = pytest.raises(GameError)
            self.excinfo = self._cm.__enter__()
            return self.excinfo

        def __exit__(self, *exc):
            ok = self._cm.__exit__(*exc)
            assert self.excinfo.value.code == code, f"esperava {code}, veio {self.excinfo.value.code}"
            return ok

    return _Ctx()


def _walk(obj, key=None):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from _walk(v, k)
            yield ("__key__", k)
    elif isinstance(obj, list):
        for v in obj:
            yield from _walk(v, key)
    else:
        yield (key, obj)


def assert_secrets_absent(
    view: dict,
    *,
    strings=(),
    ints=(),
    keys=(),
    int_keys_allowed=("phaseSeq", "round", "lives", "maxLives", "scale", "cursor", "matchNumber", "duration",
                      "remaining", "deadline"),
):
    """Serializa a view em JSON e garante que nenhum segredo aparece.

    * ``strings``: textos que não podem aparecer em lugar nenhum do JSON;
    * ``ints``: inteiros secretos (ex.: números de outros jogadores) — ignorados
      só em chaves de contadores públicos (``int_keys_allowed``);
    * ``keys``: chaves que não podem existir com valor não nulo.
    """
    text = json.dumps(view, ensure_ascii=False)
    for s in strings:
        assert s not in text, f"segredo {s!r} vazou na view"
    data = json.loads(text)
    secret_ints = set(ints)
    for k, v in _walk(data):
        if k == "__key__":
            continue
        if isinstance(v, bool) or not isinstance(v, int):
            continue
        if k in int_keys_allowed:
            continue
        assert v not in secret_ints, f"inteiro secreto {v} vazou em {k!r}"
    forbidden = set(keys)

    def check_keys(obj):
        if isinstance(obj, dict):
            for k, v in obj.items():
                assert not (k in forbidden and v is not None), f"chave secreta {k!r} presente"
                check_keys(v)
        elif isinstance(obj, list):
            for v in obj:
                check_keys(v)

    check_keys(data)
