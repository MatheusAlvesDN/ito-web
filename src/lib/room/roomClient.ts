// Cliente do WebSocket de salas (/ws). Ver backend/app/websockets/PROTOCOL.md.
//
// - playerId estável por aba (sessionStorage) → reconexão devolve o mesmo assento/segredos.
// - Sessão salva {roomCode, playerName, avatar, kind} em sessionStorage → reentra após recarregar.
// - Reconexão com backoff, PING periódico, descarte de STATE fora de ordem (`rev`) e
//   offset do relógio do servidor (`serverNow`) para cronômetros.
// - Estado imutável exposto por `getSnapshot()/subscribe()` (useSyncExternalStore em useRoom.ts).
import type { GameAction, GameMode } from './gameTypes';
import type { ClientMessage, RoomError, RoomEvent, RoomKind, RoomState, ServerMessage } from './types';

export type RoomStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface SavedRoomSession {
  roomCode: string;
  playerName: string;
  avatar: string | null;
  kind: RoomKind;
}

export interface RoomSnapshot {
  status: RoomStatus;
  state: RoomState | null;
  /** Último erro fatal (status `error`) — ex.: sala não existe, sessão substituída. */
  error: RoomError | null;
  /** Sessão atual (o que será usado para reconectar). */
  session: SavedRoomSession | null;
}

export interface CreateRoomOptions {
  kind: RoomKind;
  playerName: string;
  avatar?: string | null;
  /** Só `local`: 2..16 nomes distintos. */
  localPlayers?: string[];
}

type EventHandler = (event: RoomEvent) => void;
type ErrorHandler = (error: RoomError) => void;

const PLAYER_ID_KEY = 'pg.playerId';
const SESSION_KEY = 'pg.roomSession';
const PING_INTERVAL_MS = 20_000;
const RECONNECT_DELAYS_MS = [500, 1000, 2000, 3000, 5000, 8000, 10000];
const CONNECT_TIMEOUT_MS = 10_000;

/** Erros que encerram a sessão (não adianta reconectar). */
const FATAL_CODES = new Set(['room_not_found', 'local_room', 'session_replaced']);

export const CONNECTION_FAILED: RoomError = {
  code: 'connection_failed',
  message: 'Não foi possível conectar ao servidor. Ele está rodando?',
};

function randomId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function getOrCreatePlayerId(): string {
  try {
    const saved = sessionStorage.getItem(PLAYER_ID_KEY);
    if (saved) return saved;
  } catch {
    /* sem storage */
  }
  const id = randomId();
  try {
    sessionStorage.setItem(PLAYER_ID_KEY, id);
  } catch {
    /* sem storage */
  }
  return id;
}

function readSession(): SavedRoomSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const s = raw ? (JSON.parse(raw) as Partial<SavedRoomSession>) : null;
    if (s && typeof s.roomCode === 'string' && typeof s.playerName === 'string') {
      return { roomCode: s.roomCode, playerName: s.playerName, avatar: s.avatar ?? null, kind: s.kind === 'local' ? 'local' : 'online' };
    }
  } catch {
    /* corrompido */
  }
  return null;
}

function writeSession(s: SavedRoomSession | null) {
  try {
    if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* sem storage */
  }
}

export function getWebSocketUrl(): string {
  const configured = import.meta.env.VITE_WS_URL as string | undefined;
  if (configured) return configured;
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}/ws`;
}

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase();
}

interface PendingEntry {
  resolve: (s: RoomState) => void;
  reject: (e: RoomError) => void;
}

export class RoomClient {
  readonly playerId: string;

  private socket: WebSocket | null = null;
  private snapshot: RoomSnapshot;
  private listeners = new Set<() => void>();
  private eventHandlers = new Map<string, Set<EventHandler>>();
  private errorHandlers = new Set<ErrorHandler>();

  /** Mensagem a mandar quando o socket abrir (CREATE_ROOM/JOIN_ROOM). */
  private entryMessage: ClientMessage | null = null;
  private pending: PendingEntry | null = null;
  private lastRev = -1;
  private clockOffset = 0;
  private reconnectAttempt = 0;
  /** Reconectar se o socket cair antes do 1º STATE (true ao retomar sessão salva). */
  private retryEntry = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.playerId = getOrCreatePlayerId();
    this.snapshot = { status: 'idle', state: null, error: null, session: readSession() };
    if (typeof window !== 'undefined') {
      const wake = () => {
        if (this.snapshot.status === 'reconnecting' && !this.socket) this.reconnectNow();
      };
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && wake());
      window.addEventListener('online', wake);
    }
  }

  // ------------------------------------------------------------ store

  getSnapshot = (): RoomSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private set(patch: Partial<RoomSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((l) => l());
  }

  /** `EVENT` do servidor por nome (`'*'` = todos). Devolve a função para cancelar. */
  on(name: string, handler: EventHandler): () => void {
    let set = this.eventHandlers.get(name);
    if (!set) this.eventHandlers.set(name, (set = new Set()));
    set.add(handler);
    return () => set.delete(handler);
  }

  /** `ERROR` não fatais (ação recusada etc.) — para toasts. */
  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  /** Relógio do servidor agora (segundos), estimado pelo último STATE/PONG. */
  serverNow = (): number => performance.now() / 1000 + this.clockOffset;

  /** Sessão salva nesta aba (sobrevive ao reload). */
  get session(): SavedRoomSession | null {
    return this.snapshot.session;
  }

  // ------------------------------------------------------------ entrada / saída

  /** Cria uma sala (quem cria é o líder). Resolve com o primeiro STATE. */
  createRoom(opts: CreateRoomOptions): Promise<RoomState> {
    const playerName = opts.playerName.trim();
    const avatar = opts.avatar ?? null;
    const msg: ClientMessage = {
      type: 'CREATE_ROOM',
      playerId: this.playerId,
      playerName,
      avatar,
      kind: opts.kind,
      ...(opts.kind === 'local' && opts.localPlayers ? { localPlayers: opts.localPlayers } : {}),
    };
    // O código só existe depois do STATE; a sessão é gravada em handleState.
    return this.enter(msg, { roomCode: '', playerName, avatar, kind: opts.kind }, false);
  }

  /** Entra (ou reconecta) numa sala. Resolve com o primeiro STATE. */
  joinRoom(roomCode: string, playerName: string, avatar: string | null = null, kind: RoomKind = 'online'): Promise<RoomState> {
    const code = normalizeRoomCode(roomCode);
    const name = playerName.trim();
    const msg: ClientMessage = { type: 'JOIN_ROOM', roomCode: code, playerId: this.playerId, playerName: name, avatar };
    return this.enter(msg, { roomCode: code, playerName: name, avatar, kind }, false);
  }

  /**
   * Volta para a sala salva (após recarregar). `code` opcional restringe a uma sala.
   * Devolve false se não houver sessão salva (para esse código).
   */
  resume(code?: string): boolean {
    const s = this.snapshot.session;
    if (!s || !s.roomCode || (code && normalizeRoomCode(code) !== s.roomCode)) return false;
    const st = this.snapshot.status;
    if (st === 'connecting' || st === 'reconnecting' || (st === 'connected' && this.snapshot.state?.room.code === s.roomCode)) return true;
    const msg: ClientMessage = { type: 'JOIN_ROOM', roomCode: s.roomCode, playerId: this.playerId, playerName: s.playerName, avatar: s.avatar };
    this.enter(msg, s, true).catch(() => {
      /* erro já vai para o snapshot */
    });
    return true;
  }

  /** Sai de vez da sala (LEAVE_ROOM), fecha o socket e apaga a sessão. */
  leave() {
    this.send({ type: 'LEAVE_ROOM' });
    this.teardown();
    writeSession(null);
    this.pending?.reject({ code: 'left', message: 'Você saiu da sala.' });
    this.pending = null;
    this.entryMessage = null;
    this.set({ status: 'idle', state: null, error: null, session: null });
  }

  /** Esquece um erro fatal (volta a `idle`) sem tocar no servidor. */
  clearError() {
    if (this.snapshot.status === 'error') this.set({ status: 'idle', error: null });
  }

  // ------------------------------------------------------------ lobby (líder)

  selectMode(mode: GameMode) {
    this.send({ type: 'SELECT_MODE', mode });
  }
  setConfig(config: Record<string, unknown>) {
    this.send({ type: 'SET_CONFIG', config });
  }
  selectThemes(themeIds: string[]) {
    this.send({ type: 'SELECT_THEMES', themeIds });
  }
  setLocalPlayers(names: string[]) {
    this.send({ type: 'SET_LOCAL_PLAYERS', names });
  }
  startGame() {
    this.send({ type: 'START_GAME' });
  }
  returnToLobby() {
    this.send({ type: 'RETURN_TO_LOBBY' });
  }

  // ------------------------------------------------------------ partida / membros

  /** `GAME_ACTION`. `asSeat` só no Pass and Play (assento `l_xxxx`). */
  sendAction(action: GameAction, asSeat?: string) {
    this.send(asSeat ? { type: 'GAME_ACTION', action, asSeat } : { type: 'GAME_ACTION', action });
  }
  updateAvatar(avatar: string | null) {
    const s = this.snapshot.session;
    if (s) {
      const next = { ...s, avatar };
      writeSession(next);
      this.set({ session: next });
    }
    this.send({ type: 'UPDATE_AVATAR', avatar });
  }
  sendReaction(reaction: string) {
    this.send({ type: 'SEND_REACTION', reaction });
  }

  // ------------------------------------------------------------ internos

  private enter(msg: ClientMessage, session: SavedRoomSession, retry: boolean): Promise<RoomState> {
    this.teardown();
    this.retryEntry = retry;
    this.pending?.reject({ code: 'superseded', message: 'Outra entrada substituiu esta.' });
    this.lastRev = -1;
    this.reconnectAttempt = 0;
    this.entryMessage = msg;
    this.set({ status: 'connecting', state: null, error: null, session });
    return new Promise<RoomState>((resolve, reject) => {
      this.pending = { resolve, reject };
      this.openSocket();
    });
  }

  private send(msg: ClientMessage): boolean {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }

  private openSocket() {
    let socket: WebSocket;
    try {
      socket = new WebSocket(getWebSocketUrl());
    } catch {
      this.handleClose();
      return;
    }
    this.socket = socket;
    this.connectTimer = setTimeout(() => {
      if (socket.readyState !== WebSocket.OPEN) socket.close();
    }, CONNECT_TIMEOUT_MS);

    socket.onopen = () => {
      if (this.socket !== socket) return;
      if (this.connectTimer) clearTimeout(this.connectTimer);
      this.startPing();
      if (this.entryMessage) socket.send(JSON.stringify(this.entryMessage));
    };
    socket.onmessage = (ev) => {
      if (this.socket !== socket) return;
      let msg: ServerMessage;
      try {
        msg = JSON.parse(typeof ev.data === 'string' ? ev.data : '') as ServerMessage;
      } catch {
        return;
      }
      this.handleMessage(msg);
    };
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.stopTimers();
      this.handleClose();
    };
    socket.onerror = () => {
      /* onclose vem em seguida */
    };
  }

  private handleMessage(msg: ServerMessage) {
    switch (msg.type) {
      case 'STATE':
        this.handleState(msg);
        break;
      case 'EVENT': {
        const event: RoomEvent = { name: msg.name, data: msg.data ?? {} };
        this.eventHandlers.get(msg.name)?.forEach((h) => h(event));
        this.eventHandlers.get('*')?.forEach((h) => h(event));
        break;
      }
      case 'ERROR':
        this.handleError({ code: msg.code, message: msg.message });
        break;
      case 'PONG':
        if (typeof msg.serverNow === 'number') this.clockOffset = msg.serverNow - performance.now() / 1000;
        break;
    }
  }

  private handleState(msg: RoomState & { type: 'STATE' }) {
    if (typeof msg.rev === 'number' && msg.rev < this.lastRev) return;
    this.lastRev = msg.rev;
    this.clockOffset = msg.serverNow - performance.now() / 1000;
    const state: RoomState = { rev: msg.rev, serverNow: msg.serverNow, room: msg.room, you: msg.you, game: msg.game ?? null };

    const prev = this.snapshot.session;
    const session: SavedRoomSession = {
      roomCode: state.room.code,
      playerName: prev?.playerName ?? '',
      avatar: prev?.avatar ?? null,
      kind: state.room.kind,
    };
    writeSession(session);
    // Daqui em diante, reconectar = JOIN_ROOM com o mesmo playerId.
    this.entryMessage = { type: 'JOIN_ROOM', roomCode: session.roomCode, playerId: this.playerId, playerName: session.playerName, avatar: session.avatar };
    this.reconnectAttempt = 0;
    this.retryEntry = true;
    this.set({ status: 'connected', state, error: null, session });
    if (this.pending) {
      this.pending.resolve(state);
      this.pending = null;
    }
  }

  private handleError(error: RoomError) {
    const inRoom = this.snapshot.state != null;
    if (this.pending) {
      // Erro na entrada: CREATE_ROOM/JOIN_ROOM recusado.
      const p = this.pending;
      this.pending = null;
      this.endSession(error);
      p.reject(error);
      return;
    }
    if (FATAL_CODES.has(error.code) || (!inRoom && error.code === 'not_in_room')) {
      this.endSession(error);
      return;
    }
    if (error.code === 'not_in_room') {
      // O servidor esqueceu este socket (ex.: reiniciou): tenta reentrar.
      if (this.entryMessage) this.send(this.entryMessage);
      return;
    }
    this.errorHandlers.forEach((h) => h(error));
  }

  private endSession(error: RoomError) {
    this.teardown();
    writeSession(null);
    this.entryMessage = null;
    this.set({ status: 'error', error, state: null, session: null });
  }

  private handleClose() {
    if (!this.entryMessage) return;
    // Nunca chegou a entrar e não há sessão para recuperar → falha imediata.
    if (this.pending && !this.retryEntry) {
      const p = this.pending;
      this.pending = null;
      this.entryMessage = null;
      this.set({ status: 'error', error: CONNECTION_FAILED, state: null, session: null });
      p.reject(CONNECTION_FAILED);
      return;
    }
    this.set({ status: 'reconnecting' });
    const delay = RECONNECT_DELAYS_MS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)];
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, delay);
  }

  private reconnectNow() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.openSocket();
  }

  private startPing() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => this.send({ type: 'PING' }), PING_INTERVAL_MS);
  }

  private stopTimers() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.pingTimer = null;
    this.connectTimer = null;
  }

  /** Fecha o socket atual sem disparar reconexão. */
  private teardown() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.stopTimers();
    const s = this.socket;
    this.socket = null;
    if (s) {
      s.onopen = s.onmessage = s.onclose = s.onerror = null;
      if (s.readyState === WebSocket.OPEN || s.readyState === WebSocket.CONNECTING) s.close();
    }
  }
}

/** Instância única do app (uma sala por aba). */
export const roomClient = new RoomClient();
