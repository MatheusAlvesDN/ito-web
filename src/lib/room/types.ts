// Tipos do protocolo do WebSocket /ws (ver backend/app/websockets/PROTOCOL.md).
// O servidor é autoritativo: estes tipos só descrevem o que chega e o que pode ser enviado.
import type { GameAction, GameConfigByMode, GameMode, GameView } from './gameTypes';

export type RoomKind = 'online' | 'local';
export type RoomStage = 'lobby' | 'game';

export interface RoomPlayer {
  id: string;
  name: string;
  avatar: string | null;
  connected: boolean;
}

/** Assento do Pass and Play (`l_xxxxxxxx`). */
export interface LocalSeat {
  id: string;
  name: string;
}

export interface RoomInfo {
  code: string;
  kind: RoomKind;
  hostId: string;
  stage: RoomStage;
  mode: GameMode | null;
  /** Config completa e normalizada do modo (`{}` sem modo). */
  config: Partial<GameConfigByMode[GameMode]> & Record<string, unknown>;
  themeIds: string[];
  /** Ordem de entrada. Local: só o aparelho. */
  players: RoomPlayer[];
  /** `[]` online. */
  localSeats: LocalSeat[];
}

export interface RoomYou {
  playerId: string;
  isHost: boolean;
  /** Assentos que este socket controla (online: [playerId]; local: todos). */
  controls: string[];
}

/** Instantâneo completo, personalizado por socket. */
export interface RoomState {
  rev: number;
  /** Relógio do servidor (segundos, monotônico) — mesma base dos `deadline`. */
  serverNow: number;
  room: RoomInfo;
  you: RoomYou;
  game: GameView | null;
}

export interface RoomError {
  code: string;
  message: string;
}

export interface RoomEvent<D = Record<string, unknown>> {
  name: string;
  data: D;
}

/** Dados dos eventos conhecidos (sala + motores). */
export interface RoomEventDataMap {
  player_joined: { playerId: string; name: string };
  player_reconnected: { playerId: string; name: string };
  player_disconnected: { playerId: string; name: string };
  player_left: { playerId: string; name: string };
  host_changed: { hostId: string };
  reaction: { playerId: string; name: string; reaction: string };
  game_started: { mode: GameMode };
  returned_to_lobby: { reason: 'host' | 'not_enough_players' };
  not_enough_players: { minPlayers: number };
  time_up: Record<string, never>;
  round_result: { success: boolean; lives: number };
  saboteur_result: { groupWon: boolean };
  round_scored: { targetId: string; winners: string[]; gains: Record<string, number> };
  target_changed: { targetId: string };
  round_aborted: { reason: string };
  guessed: { seatId: string; guessed: boolean };
}
export type RoomEventName = keyof RoomEventDataMap;

export type ServerMessage =
  | ({ type: 'STATE' } & RoomState)
  | { type: 'EVENT'; name: string; data?: Record<string, unknown> }
  | { type: 'ERROR'; code: string; message: string }
  | { type: 'PONG'; serverNow: number };

export type ClientMessage =
  | { type: 'CREATE_ROOM'; playerId: string; playerName: string; avatar: string | null; kind: RoomKind; localPlayers?: string[] }
  | { type: 'JOIN_ROOM'; roomCode: string; playerId: string; playerName: string; avatar: string | null }
  | { type: 'SELECT_MODE'; mode: GameMode }
  | { type: 'SET_CONFIG'; config: Record<string, unknown> }
  | { type: 'SELECT_THEMES'; themeIds: string[] }
  | { type: 'SET_LOCAL_PLAYERS'; names: string[] }
  | { type: 'START_GAME' }
  | { type: 'RETURN_TO_LOBBY' }
  | { type: 'GAME_ACTION'; action: GameAction; asSeat?: string }
  | { type: 'UPDATE_AVATAR'; avatar: string | null }
  | { type: 'SEND_REACTION'; reaction: string }
  | { type: 'LEAVE_ROOM' }
  | { type: 'PING' };

export type { GameAction, GameMode, GameView } from './gameTypes';
