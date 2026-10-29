import json
from typing import Optional

import anyio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from app.core.config import settings
from app.games import GameError
from app.websockets.connection_manager import manager
from app.websockets.protocol import CreateRoom, JoinRoom, Ping, client_message_adapter
from app.websockets.room import Room, clock

router = APIRouter()


@router.websocket("/ws")
async def websocket_general(websocket: WebSocket):
    """Salas multiplayer com motores de jogo no servidor. Contrato: app/websockets/PROTOCOL.md."""
    await websocket.accept()
    room: Optional[Room] = None
    player_id: Optional[str] = None

    async def error(code: str, message: str):
        await Room.send_error(websocket, code, message)

    def in_room() -> bool:
        if room is None or player_id is None or room.closed or manager.rooms.get(room.code) is not room:
            return False
        p = room.players.get(player_id)
        return p is not None and p.websocket is websocket

    try:
        while True:
            raw_data = await websocket.receive_text()
            if len(raw_data.encode("utf-8")) > settings.WS_MAX_MESSAGE_BYTES:
                await error("message_too_large", "Mensagem muito grande.")
                continue
            try:
                msg = client_message_adapter.validate_python(json.loads(raw_data))
            except (json.JSONDecodeError, ValidationError):
                await error("invalid_message", "Mensagem inválida.")
                continue

            if isinstance(msg, Ping):
                await Room.send_to(websocket, {"type": "PONG", "serverNow": clock()})
                continue

            if isinstance(msg, (CreateRoom, JoinRoom)):
                # Um socket participa de uma sala por vez
                if in_room():
                    await manager.remove_player(room, player_id)
                room, player_id = None, None

                if isinstance(msg, CreateRoom):
                    try:
                        room = await manager.create_room(msg, websocket)
                    except GameError as exc:
                        await error(exc.code, exc.message)
                        continue
                    player_id = msg.playerId
                    continue

                target = manager.get_room(msg.roomCode)
                if target is None:
                    await error("room_not_found", f"Sala {msg.roomCode.strip().upper()} não encontrada.")
                    continue
                if await manager.join_room(target, msg, websocket):
                    room, player_id = target, msg.playerId
                continue

            # As demais mensagens exigem estar em uma sala
            if not in_room():
                room, player_id = None, None
                await error("not_in_room", "Você não está em uma sala.")
                continue

            await manager.handle_message(room, player_id, websocket, msg)
            if not in_room():  # saiu (LEAVE_ROOM)
                room, player_id = None, None

    except WebSocketDisconnect:
        pass
    finally:
        if room is not None and player_id is not None:
            # Blindado: a limpeza precisa terminar mesmo se a tarefa do handler for cancelada
            with anyio.CancelScope(shield=True):
                await manager.handle_disconnect(room, player_id, websocket)
