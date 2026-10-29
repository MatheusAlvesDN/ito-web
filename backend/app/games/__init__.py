"""Motores de jogo (puros e síncronos). Ver ``PROTOCOL.md``."""

from app.games.base import (
    Actor,
    Cancel,
    Effect,
    Emit,
    GameEngine,
    GameError,
    Schedule,
    Seat,
    Viewer,
)
from app.games.content import ContentPool, ContentProvider, StaticContent
from app.games.impostor import ImpostorEngine
from app.games.ito import ItoEngine
from app.games.whatdoyouknow import WhatDoYouKnowEngine
from app.games.whoami import WhoAmIEngine

ENGINES: dict[str, type[GameEngine]] = {
    "classic": ItoEngine,
    "impostor": ImpostorEngine,
    "whoami": WhoAmIEngine,
    "whatdoyouknow": WhatDoYouKnowEngine,
}

__all__ = [
    "ENGINES",
    "Actor",
    "Cancel",
    "ContentPool",
    "ContentProvider",
    "Effect",
    "Emit",
    "GameEngine",
    "GameError",
    "ImpostorEngine",
    "ItoEngine",
    "Schedule",
    "Seat",
    "StaticContent",
    "Viewer",
    "WhatDoYouKnowEngine",
    "WhoAmIEngine",
]
