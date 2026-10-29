// Views (`STATE.game`), ações (`GAME_ACTION.action`) e configs de cada modo.
// Fonte: backend/app/games/PROTOCOL.md (e os docstrings de backend/app/games/*.py).

export type GameMode = 'classic' | 'impostor' | 'whoami' | 'whatdoyouknow';
export const GAME_MODES: readonly GameMode[] = ['classic', 'impostor', 'whoami', 'whatdoyouknow'];
export function isGameMode(v: unknown): v is GameMode {
  return typeof v === 'string' && (GAME_MODES as readonly string[]).includes(v);
}

// ------------------------------------------------------------------ comuns

export interface SeatRef {
  id: string;
  name: string;
}

/** Cronômetro. `deadline` no relógio do servidor; `null` quando pausado (use `remaining`). */
export interface TimerView {
  duration: number;
  deadline: number | null;
  paused: boolean;
  remaining: number;
}

/** Distribuição de cartas do Pass and Play (só local). */
export interface DistributionView {
  order: string[];
  cursor: number;
  /** Assento da vez (`null` quando todos já viram). */
  current: string | null;
  revealed: boolean;
  viewed: string[];
  done: boolean;
}

export interface BaseGameView<M extends GameMode, P extends string> {
  mode: M;
  phase: P;
  /** Cresce a cada troca de fase (útil para animações/reset de UI local). */
  phaseSeq: number;
  local: boolean;
  seats: SeatRef[];
}

export interface QuestionRef {
  text: string;
  themeId: string;
}

/** Ações comuns do cronômetro (líder). */
export type TimerAction =
  | { type: 'TIMER_PAUSE' }
  | { type: 'TIMER_RESUME' }
  | { type: 'TIMER_ADD'; seconds?: number }
  | { type: 'TIMER_RESET' };

/** Ações comuns da distribuição de cartas. Local: com `asSeat`; online: `ACK_CARD`. */
export type CardAction = { type: 'REVEAL_CARD' } | { type: 'HIDE_CARD' } | { type: 'NEXT_CARD' } | { type: 'ACK_CARD' };

// ------------------------------------------------------------------ ITO (classic)

export interface ItoConfig {
  scale: 50 | 100 | 1000;
  lives: number;
  saboteur: boolean;
}
export type ItoPhase = 'init' | 'rolling' | 'numbers' | 'ordering' | 'result' | 'saboteur_voting' | 'saboteur_reveal';
export interface ItoView extends BaseGameView<'classic', ItoPhase> {
  round: number;
  lives: number;
  maxLives: number;
  scale: number;
  saboteurMode: boolean;
  roundSeatIds: string[];
  question: QuestionRef | null;
  order: string[];
  viewed: string[];
  distribution: DistributionView | null;
  you: { seatId: string; number: number | null; isSaboteur: boolean } | null;
  card: { seatId: string; number: number; isSaboteur: boolean } | null;
  numbers: Record<string, number> | null;
  lastResult: { success: boolean; livesLost: number } | null;
  gameOver: boolean;
  voting: { voteCounts: Record<string, number>; votedSeatIds: string[]; myVote: string | null } | null;
  saboteurReveal: { saboteurId: string; suspectId: string | null; groupWon: boolean; voteCounts: Record<string, number> } | null;
}
export type ItoAction =
  | CardAction
  | { type: 'DEAL' }
  | { type: 'START_ORDERING' }
  | { type: 'MOVE'; seatId: string; toIndex: number }
  | { type: 'SET_ORDER'; order: string[] }
  | { type: 'CHECK' }
  | { type: 'NEXT_ROUND' }
  | { type: 'VOTE'; targetId: string }
  | { type: 'REVEAL_SABOTEUR' }
  | { type: 'ACCUSE'; suspectId: string }
  | { type: 'RESTART' };

// ------------------------------------------------------------------ Impostor

export interface ImpostorConfig {
  discussionSeconds: number;
}
export type ImpostorPhase = 'distribution' | 'discussion' | 'reveal';
export type ImpostorOutcome = 'pending' | 'impostor_won' | 'group_won';
export interface ImpostorView extends BaseGameView<'impostor', ImpostorPhase> {
  round: number;
  roundSeatIds: string[];
  viewed: string[];
  distribution: DistributionView | null;
  you: { seatId: string; question: string; isImpostor: boolean } | null;
  card: { seatId: string; question: string; isImpostor: boolean } | null;
  timer: TimerView | null;
  reveal: { impostorId: string; honestQuestion: string; impostorQuestion: string; outcome: ImpostorOutcome } | null;
  history: { round: number; impostorId: string; outcome: ImpostorOutcome }[];
}
export type ImpostorAction =
  | CardAction
  | TimerAction
  | { type: 'START_DISCUSSION' }
  | { type: 'REVEAL' }
  | { type: 'JUDGE'; impostorGuessed: boolean }
  | { type: 'NEW_ROUND' };

// ------------------------------------------------------------------ Quem Sou Eu

export interface WhoAmIConfig {
  roundSeconds: number;
}
export type WhoAmIPhase = 'reveal' | 'playing' | 'match_ended' | 'overall';
export interface WhoAmIView extends BaseGameView<'whoami', WhoAmIPhase> {
  matchNumber: number;
  round: number;
  players: { seatId: string; name: string; personality: string | null; guessed: boolean; roundsToGuess: number | null }[];
  distribution: DistributionView | null;
  card: { seatId: string; personality: string } | null;
  timer: TimerView | null;
  history: {
    matchNumber: number;
    results: { seatId: string; name: string; personality: string | null; guessed: boolean; roundsToGuess: number | null }[];
  }[];
  overall:
    | {
        seatId: string;
        name: string;
        matchesGuessed: number;
        totalRounds: number;
        totalMatches: number;
        history: { matchNumber: number; rounds: number; guessed: boolean; personality: string | null }[];
      }[]
    | null;
}
export type WhoAmIAction =
  | CardAction
  | TimerAction
  | { type: 'REROLL'; seatId: string }
  | { type: 'NEXT_ROUND' }
  | { type: 'TOGGLE_GUESSED'; seatId: string }
  | { type: 'ADJUST_ROUNDS'; seatId: string; delta: number }
  | { type: 'END_MATCH' }
  | { type: 'NEXT_MATCH' }
  | { type: 'SHOW_OVERALL' }
  | { type: 'RESET_ALL' };

// ------------------------------------------------------------------ O Que Você Sabe

export type WhatDoYouKnowConfig = Record<string, never>;
export type WhatDoYouKnowPhase = 'question' | 'scoring' | 'leaderboard';
export interface WhatDoYouKnowView extends BaseGameView<'whatdoyouknow', WhatDoYouKnowPhase> {
  round: number;
  targetId: string | null;
  question: QuestionRef | null;
  winners: string[];
  scores: Record<string, number>;
  ranking: { seatId: string; name: string; score: number }[];
  lastGains: Record<string, number> | null;
}
export type WhatDoYouKnowAction = { type: 'GO_SCORING' } | { type: 'TOGGLE_WINNER'; seatId: string } | { type: 'CONFIRM' } | { type: 'NEXT_ROUND' };

// ------------------------------------------------------------------ mapas

export interface GameViewByMode {
  classic: ItoView;
  impostor: ImpostorView;
  whoami: WhoAmIView;
  whatdoyouknow: WhatDoYouKnowView;
}
export interface GameActionByMode {
  classic: ItoAction;
  impostor: ImpostorAction;
  whoami: WhoAmIAction;
  whatdoyouknow: WhatDoYouKnowAction;
}
export interface GameConfigByMode {
  classic: ItoConfig;
  impostor: ImpostorConfig;
  whoami: WhoAmIConfig;
  whatdoyouknow: WhatDoYouKnowConfig;
}

export type GameView = GameViewByMode[GameMode];
export type GameAction = GameActionByMode[GameMode];
