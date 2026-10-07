import json
import random
import string
from typing import Dict, List, Optional
from fastapi import WebSocket

class Player:
    def __init__(self, player_id: str, name: str, avatar: Optional[str] = None, websocket: Optional[WebSocket] = None):
        self.id = player_id
        self.name = name
        self.avatar = avatar
        self.websocket = websocket

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "avatar": self.avatar
        }

class Room:
    def __init__(self, code: str, host_id: str):
        self.code = code
        self.host_id = host_id
        self.players: Dict[str, Player] = {} # player_id -> Player
        self.game_state: dict = {}

    def add_player(self, player: Player):
        self.players[player.id] = player

    def remove_player(self, player_id: str) -> Optional[str]:
        if player_id in self.players:
            del self.players[player_id]

        # Se o host saiu e ainda há jogadores, promove o primeiro
        if self.host_id == player_id:
            if self.players:
                self.host_id = next(iter(self.players.keys()))
                return self.host_id
            else:
                self.host_id = ""
                return None
        return self.host_id

    def get_player_list(self) -> List[dict]:
        return [p.to_dict() for p in self.players.values()]


class ConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, Room] = {} # room_code -> Room

    def generate_room_code(self, length: int = 4) -> str:
        letters = string.ascii_uppercase
        for _ in range(100):
            code = "".join(random.choices(letters, k=length))
            if code not in self.rooms:
                return code
        return "".join(random.choices(letters, k=6))

    def create_room(self, host_player: Player) -> Room:
        code = self.generate_room_code()
        room = Room(code=code, host_id=host_player.id)
        room.add_player(host_player)
        self.rooms[code] = room
        return room

    def get_room(self, code: str) -> Optional[Room]:
        return self.rooms.get(code.upper())

    async def broadcast(self, room_code: str, message: dict):
        room = self.get_room(room_code)
        if not room:
            return

        dead_connections = []
        payload = json.dumps(message)
        for player_id, player in room.players.items():
            if player.websocket:
                try:
                    await player.websocket.send_text(payload)
                except Exception:
                    dead_connections.append(player_id)

        for pid in dead_connections:
            await self.handle_disconnect(room_code, pid)

    async def send_personal(self, websocket: WebSocket, message: dict):
        try:
            await websocket.send_text(json.dumps(message))
        except Exception:
            pass

    async def handle_disconnect(self, room_code: str, player_id: str):
        room = self.get_room(room_code)
        if not room:
            return

        new_host_id = room.remove_player(player_id)
        if not room.players:
            if room_code in self.rooms:
                del self.rooms[room_code]
        else:
            await self.broadcast(room_code, {
                "type": "PLAYER_LEFT",
                "players": room.get_player_list(),
                "hostId": new_host_id
            })

manager = ConnectionManager()
