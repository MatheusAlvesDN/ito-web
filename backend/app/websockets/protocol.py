"""Mensagens enviadas pelos clientes no WebSocket ``/ws`` (validadas pelo campo ``type``).

Contrato completo (cliente ↔ servidor): ``app/websockets/PROTOCOL.md``.
"""

from typing import Annotated, Any, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, TypeAdapter

PlayerId = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=64)]
PlayerName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]
Avatar = Annotated[Optional[str], Field(default=None, max_length=200)]
ShortId = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=64)]

MAX_LOCAL_PLAYERS = 16
MIN_LOCAL_PLAYERS = 2
MAX_THEMES = 30


class _Msg(BaseModel):
    model_config = ConfigDict(extra="ignore")


class CreateRoom(_Msg):
    type: Literal["CREATE_ROOM"]
    playerId: PlayerId
    playerName: PlayerName
    avatar: Avatar = None
    kind: Literal["online", "local"] = "online"
    # Pass and Play: nomes de quem vai jogar no aparelho (2..16, sem repetir)
    localPlayers: Optional[list[PlayerName]] = Field(default=None, max_length=MAX_LOCAL_PLAYERS)


class JoinRoom(_Msg):
    type: Literal["JOIN_ROOM"]
    roomCode: Annotated[str, StringConstraints(strip_whitespace=True, min_length=4, max_length=8)]
    playerId: PlayerId
    playerName: PlayerName
    avatar: Avatar = None


class SelectMode(_Msg):
    type: Literal["SELECT_MODE"]
    mode: ShortId


class SetConfig(_Msg):
    type: Literal["SET_CONFIG"]
    config: dict[str, Any]


class SelectThemes(_Msg):
    type: Literal["SELECT_THEMES"]
    themeIds: list[ShortId] = Field(max_length=MAX_THEMES)


class SetLocalPlayers(_Msg):
    type: Literal["SET_LOCAL_PLAYERS"]
    names: list[PlayerName] = Field(min_length=MIN_LOCAL_PLAYERS, max_length=MAX_LOCAL_PLAYERS)


class StartGame(_Msg):
    type: Literal["START_GAME"]


class ReturnToLobby(_Msg):
    type: Literal["RETURN_TO_LOBBY"]


class GameAction(_Msg):
    type: Literal["GAME_ACTION"]
    action: dict[str, Any]
    asSeat: Optional[ShortId] = None


class UpdateAvatar(_Msg):
    type: Literal["UPDATE_AVATAR"]
    avatar: Avatar = None


class SendReaction(_Msg):
    type: Literal["SEND_REACTION"]
    reaction: Annotated[str, Field(min_length=1, max_length=32)]


class LeaveRoom(_Msg):
    type: Literal["LEAVE_ROOM"]


class Ping(_Msg):
    type: Literal["PING"]


ClientMessage = Annotated[
    Union[
        CreateRoom, JoinRoom, SelectMode, SetConfig, SelectThemes, SetLocalPlayers, StartGame,
        ReturnToLobby, GameAction, UpdateAvatar, SendReaction, LeaveRoom, Ping,
    ],
    Field(discriminator="type"),
]

client_message_adapter: TypeAdapter[ClientMessage] = TypeAdapter(ClientMessage)
