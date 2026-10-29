// Registro das views de jogo: modo → componente (lazy) + info do cabeçalho.
// Para um modo novo: crie src/features/games/<modo>/<Modo>View.tsx (export default) e registre aqui.
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { GameMode, GameViewByMode } from '../../lib/room';
import type { GameViewProps } from './types';

export interface GameModeEntry<M extends GameMode> {
  View: LazyExoticComponent<ComponentType<GameViewProps<M>>>;
  /** Texto curto do cabeçalho (rodada, vidas…). */
  headerInfo?: (game: GameViewByMode[M]) => string | null;
}

export const GAME_VIEWS: { [M in GameMode]: GameModeEntry<M> } = {
  classic: {
    View: lazy(() => import('./ito/ItoView')),
    headerInfo: (g) => `Rodada ${g.round} · ${g.lives}/${g.maxLives} vidas`,
  },
  impostor: {
    View: lazy(() => import('./impostor/ImpostorView')),
    headerInfo: (g) => `Rodada ${g.round}`,
  },
  whoami: {
    View: lazy(() => import('./whoami/WhoAmIView')),
    headerInfo: (g) => `Partida ${g.matchNumber} · Rodada ${g.round}`,
  },
  whatdoyouknow: {
    View: lazy(() => import('./whatdoyouknow/WhatDoYouKnowView')),
    headerInfo: (g) => `Rodada ${g.round}`,
  },
};

/** Entrada do registro para um modo (tipada de forma genérica para o RoomPage). */
export function gameEntry(mode: GameMode): GameModeEntry<GameMode> {
  return GAME_VIEWS[mode] as unknown as GameModeEntry<GameMode>;
}

export { MODE_META, isFreeTheme, configValue, type ConfigField, type ModeMeta } from './modes';
export { buildSeatsById, seatOf } from './seats';
export type { GameViewProps, SeatInfo } from './types';
