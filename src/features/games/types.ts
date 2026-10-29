// Contrato das views de jogo (src/features/games/<modo>/). Ver README.md desta pasta.
import type { GameActionByMode, GameMode, GameViewByMode, RoomState, RoomYou } from '../../lib/room';

/** Assento com dados de exibição (nome do jogo + avatar/conexão da sala, quando houver). */
export interface SeatInfo {
  id: string;
  name: string;
  /** Avatar "estilo:semente" (online); local usa o nome como semente. */
  avatar?: string;
  /** Online: conexão do jogador; local: sempre true. */
  connected: boolean;
  /** Este aparelho controla o assento (online: é você; local: todos). */
  mine: boolean;
}

export interface GameViewProps<M extends GameMode = GameMode> {
  /** STATE completo (sala + you + game). */
  state: RoomState;
  /** `state.game` já tipado para o modo. */
  game: GameViewByMode[M];
  you: RoomYou;
  /** Online: seu assento (= playerId). Local: null (o aparelho controla todos). */
  mySeatId: string | null;
  /** Manda `GAME_ACTION`. `asSeat` só no Pass and Play (ações de assento). */
  send: (action: GameActionByMode[M], asSeat?: string) => void;
  isHost: boolean;
  /** Sala Pass and Play (um aparelho). */
  local: boolean;
  /** Assentos do jogo por id (`game.seats` + dados da sala). */
  seatsById: Record<string, SeatInfo>;
  /** Relógio do servidor agora (segundos) — compare com `timer.deadline`. */
  now: () => number;
}
