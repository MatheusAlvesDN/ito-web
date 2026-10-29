"""Registro de salas, entrada/reconexão/saída de jogadores e despacho de mensagens.

Toda mudança de estado passa por ``Room.transact`` (lock da sala). Ver
``PROTOCOL.md`` nesta pasta.
"""

from __future__ import annotations

import asyncio
import secrets
import string
from typing import Callable, Optional

from fastapi import WebSocket

from app.core.config import settings
from app.games import Emit, GameError
from app.websockets.catalog import Catalog
from app.websockets.protocol import (
    ClientMessage,
    CreateRoom,
    GameAction,
    JoinRoom,
    LeaveRoom,
    ReturnToLobby,
    SelectMode,
    SelectThemes,
    SendReaction,
    SetConfig,
    SetLocalPlayers,
    StartGame,
    UpdateAvatar,
)
from app.websockets.room import Player, Room, clean_local_names

__all__ = ["ConnectionManager", "Player", "Room", "manager"]


class ConnectionManager:
    def __init__(self):
        self.rooms: dict[str, Room] = {}  # room_code -> Room
        # Fábrica de sessões do banco (None = app.core.database.SessionLocal). Os testes trocam.
        self.session_factory: Optional[Callable] = None
        self.catalog = Catalog(self._session_factory)

    def _session_factory(self) -> Callable:
        if self.session_factory is not None:
            return self.session_factory
        from app.core.database import SessionLocal

        return SessionLocal

    # ----- salas -----------------------------------------------------------

    def generate_room_code(self, length: int = 4) -> str:
        letters = string.ascii_uppercase
        for _ in range(100):
            code = "".join(secrets.choice(letters) for _ in range(length))
            if code not in self.rooms:
                return code
        while True:
            code = "".join(secrets.choice(letters) for _ in range(length + 2))
            if code not in self.rooms:
                return code

    def get_room(self, code: str) -> Optional[Room]:
        return self.rooms.get(code.strip().upper())

    def _close_room(self, room: Room) -> None:
        room.close()
        if self.rooms.get(room.code) is room:
            del self.rooms[room.code]

    def grace_seconds(self, room: Room) -> float:
        return settings.WS_LOCAL_RECONNECT_GRACE_SECONDS if room.local else settings.WS_RECONNECT_GRACE_SECONDS

    async def create_room(self, msg: CreateRoom, websocket: WebSocket) -> Room:
        """Cria a sala e manda o primeiro STATE. Levanta GameError se ``localPlayers`` for inválido."""
        seats = []
        if msg.kind == "local" and msg.localPlayers:
            seats = clean_local_names(msg.localPlayers)
        room = Room(
            self.generate_room_code(), msg.kind, msg.playerId,
            catalog=self.catalog, on_send_failed=self._send_failed,
        )
        room.local_seats = seats
        room.players[msg.playerId] = Player(msg.playerId, msg.playerName, msg.avatar, websocket)
        self.rooms[room.code] = room
        await room.transact(lambda: [])
        return room

    async def join_room(self, room: Room, msg: JoinRoom, websocket: WebSocket) -> bool:
        """Entra (ou reconecta, se o playerId já estiver na sala). True se entrou."""

        def run():
            if room.closed:
                raise GameError("room_not_found", f"Sala {room.code} não encontrada.")
            existing = room.players.get(msg.playerId)
            if room.local and existing is None:
                raise GameError("local_room", "Esta sala é de jogo local (um aparelho só) e não aceita outros jogadores.")
            if existing is not None:
                existing.cancel_removal()
                old_ws = existing.websocket
                existing.websocket = websocket
                if not room.seated(existing.id):  # nome congelado durante a partida
                    existing.name = room.unique_name(msg.playerName, existing.id)
                existing.avatar = msg.avatar or existing.avatar
                if old_ws is not None and old_ws is not websocket:
                    asyncio.create_task(Room.send_error(
                        old_ws, "session_replaced", "Você entrou nesta sala por outra conexão."))
                return [Emit("player_reconnected", {"playerId": existing.id, "name": existing.name})]
            player = Player(msg.playerId, room.unique_name(msg.playerName, msg.playerId), msg.avatar, websocket)
            room.players[player.id] = player
            if not room.host_id:
                room.host_id = player.id
            events = [Emit("player_joined", {"playerId": player.id, "name": player.name})]
            events.extend(room.seat_joined(player))
            return events

        return await room.transact(run, reply_to=websocket)

    # ----- saída -----------------------------------------------------------

    async def handle_disconnect(self, room: Room, player_id: str, websocket: Optional[WebSocket] = None) -> None:
        """Conexão caiu: mantém o jogador por um período de graça para permitir reconexão."""

        def run():
            player = room.players.get(player_id)
            if player is None or not player.connected:
                return None
            # Ignora o fechamento de um socket antigo quando o jogador já reconectou em outro
            if websocket is not None and player.websocket is not websocket:
                return None
            player.websocket = None
            player.cancel_removal()
            player.removal_task = asyncio.create_task(self._remove_after_grace(room, player_id))
            return [Emit("player_disconnected", {"playerId": player.id, "name": player.name})]

        await room.transact(run)

    async def _send_failed(self, room: Room, player_id: str, websocket: WebSocket) -> None:
        await self.handle_disconnect(room, player_id, websocket)

    async def _remove_after_grace(self, room: Room, player_id: str) -> None:
        try:
            await asyncio.sleep(self.grace_seconds(room))
        except asyncio.CancelledError:
            return
        await self.remove_player(room, player_id, only_if_disconnected=True)

    async def remove_player(self, room: Room, player_id: str, *, only_if_disconnected: bool = False) -> None:
        """Saída definitiva (LEAVE_ROOM ou fim do período de graça)."""

        def run():
            player = room.players.get(player_id)
            if player is None or (only_if_disconnected and player.connected):
                return None
            if player.removal_task is asyncio.current_task():
                player.removal_task = None
            player.cancel_removal()
            del room.players[player_id]
            if not room.players:
                self._close_room(room)
                return None
            events = [Emit("player_left", {"playerId": player.id, "name": player.name})]
            events.extend(room.seat_left(player_id))
            if room.host_id == player_id:
                room.promote_new_host()
                events.append(Emit("host_changed", {"hostId": room.host_id}))
            return events

        await room.transact(run)

    # ----- mensagens dentro da sala ----------------------------------------

    async def handle_message(self, room: Room, player_id: str, websocket: WebSocket, msg: ClientMessage) -> None:
        def member() -> Player:
            return room.member(player_id, websocket)

        if isinstance(msg, SendReaction):
            async def reaction():
                p = member()
                await room.send_events([Emit("reaction", {"playerId": p.id, "name": p.name, "reaction": msg.reaction})])
                return None

            await room.transact(reaction, reply_to=websocket)
        elif isinstance(msg, UpdateAvatar):
            def avatar():
                member().avatar = msg.avatar
                return []

            await room.transact(avatar, reply_to=websocket)
        elif isinstance(msg, SelectMode):
            await room.transact(lambda: room.select_mode(member(), msg.mode), reply_to=websocket)
        elif isinstance(msg, SetConfig):
            await room.transact(lambda: room.set_config(member(), msg.config), reply_to=websocket)
        elif isinstance(msg, SelectThemes):
            await room.transact(lambda: room.select_themes(member(), msg.themeIds), reply_to=websocket)
        elif isinstance(msg, SetLocalPlayers):
            await room.transact(lambda: room.set_local_players(member(), msg.names), reply_to=websocket)
        elif isinstance(msg, StartGame):
            await room.transact(lambda: room.start_game(member()), reply_to=websocket)
        elif isinstance(msg, ReturnToLobby):
            await room.transact(lambda: room.return_to_lobby(member()), reply_to=websocket)
        elif isinstance(msg, GameAction):
            await room.transact(lambda: room.game_action(member(), msg.action, msg.asSeat), reply_to=websocket)
        elif isinstance(msg, LeaveRoom):
            await self.remove_player(room, player_id)
        else:  # pragma: no cover
            await Room.send_error(websocket, "invalid_message", "Mensagem inválida.")


manager = ConnectionManager()
