import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine
from app.models import game as _models  # Garante registro dos modelos no metadata
from app.api.v1.games import router as games_router
from app.websockets.connection_manager import manager, Player

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Criação das tabelas no banco de dados se não existirem
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro de Rotas REST
app.include_router(games_router, prefix=settings.API_V1_PREFIX)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": settings.VERSION}


# --- WEBSOCKET ENDPOINTS (MULTIPLAYER ONLINE) ---

@app.websocket("/ws")
async def websocket_general(websocket: WebSocket):
    """
    WebSocket endpoint genérico para gerenciamento de salas:
    - CREATE_ROOM: Cria sala e conecta host
    - JOIN_ROOM: Conecta participante a uma sala existente
    """
    await websocket.accept()
    current_room_code = None
    current_player_id = None

    try:
        while True:
            raw_data = await websocket.receive_text()
            try:
                data = json.loads(raw_data)
            except Exception:
                continue

            msg_type = data.get("type")

            if msg_type == "CREATE_ROOM":
                player_id = data.get("playerId")
                player_name = data.get("playerName", "Host")
                avatar = data.get("avatar")

                player = Player(player_id=player_id, name=player_name, avatar=avatar, websocket=websocket)
                room = manager.create_room(player)
                current_room_code = room.code
                current_player_id = player_id

                await manager.send_personal(websocket, {
                    "type": "ROOM_CREATED",
                    "roomCode": room.code,
                    "playerId": player_id,
                    "players": room.get_player_list(),
                    "isHost": True
                })

            elif msg_type == "JOIN_ROOM":
                room_code = data.get("roomCode", "").upper()
                player_id = data.get("playerId")
                player_name = data.get("playerName", "Jogador")
                avatar = data.get("avatar")

                room = manager.get_room(room_code)
                if not room:
                    await manager.send_personal(websocket, {
                        "type": "ERROR",
                        "message": f"Sala {room_code} não encontrada."
                    })
                    continue

                player = Player(player_id=player_id, name=player_name, avatar=avatar, websocket=websocket)
                room.add_player(player)
                current_room_code = room.code
                current_player_id = player_id

                # Confirmação para o jogador que entrou
                await manager.send_personal(websocket, {
                    "type": "ROOM_JOINED",
                    "roomCode": room.code,
                    "playerId": player_id,
                    "players": room.get_player_list(),
                    "gameState": room.game_state,
                    "isHost": room.host_id == player_id
                })

                # Notifica todos os demais na sala
                await manager.broadcast(room.code, {
                    "type": "PLAYER_JOINED",
                    "players": room.get_player_list()
                })

            elif msg_type == "UPDATE_STATE":
                if current_room_code:
                    room = manager.get_room(current_room_code)
                    if room:
                        room.game_state = data.get("state", {})
                        await manager.broadcast(current_room_code, {
                            "type": "STATE_UPDATED",
                            "state": room.game_state
                        })

            elif msg_type == "SEND_REACTION":
                if current_room_code:
                    await manager.broadcast(current_room_code, {
                        "type": "REACTION_RECEIVED",
                        "playerId": current_player_id,
                        "playerName": data.get("playerName"),
                        "reaction": data.get("reaction")
                    })

            elif msg_type == "LEAVE_ROOM":
                if current_room_code and current_player_id:
                    await manager.handle_disconnect(current_room_code, current_player_id)
                    current_room_code = None
                    current_player_id = None

    except WebSocketDisconnect:
        if current_room_code and current_player_id:
            await manager.handle_disconnect(current_room_code, current_player_id)
    except Exception:
        if current_room_code and current_player_id:
            await manager.handle_disconnect(current_room_code, current_player_id)
