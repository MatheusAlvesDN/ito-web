// Helpers do lobby (só apresentação; o servidor valida tudo de novo).
import type { ApiGame, ApiTheme } from '../../lib/api';
import { isGameMode, type GameMode, type RoomState } from '../../lib/room';
import { MODE_META, isFreeTheme } from '../games/modes';

/** Jogos de sala (exclui o Tradutor e ids desconhecidos). */
export function roomGames(games: ApiGame[] | null): (ApiGame & { id: GameMode })[] {
  return (games ?? []).filter((g): g is ApiGame & { id: GameMode } => isGameMode(g.id));
}

/** Tema pode ser escolhido? (tem itens, ou é o modo livre do ITO). */
export function themeSelectable(mode: GameMode, t: ApiTheme): boolean {
  return isFreeTheme(mode, t.id) || t.item_count == null || t.item_count > 0;
}

/** Temas pré-selecionados ao escolher um modo: todos com conteúdo (sem o modo livre). */
export function defaultThemeIds(game: ApiGame | undefined, mode: GameMode): string[] {
  return (game?.themes ?? []).filter((t) => !isFreeTheme(mode, t.id) && themeSelectable(mode, t)).map((t) => t.id);
}

/** Quantos jogadores a partida teria agora. */
export function playerCount(state: RoomState): number {
  return state.room.kind === 'local' ? state.room.localSeats.length : state.room.players.length;
}

/** Motivo para não poder começar (null = pode). */
export function startBlocker(state: RoomState): string | null {
  const { mode, themeIds, config } = state.room;
  if (!mode) return 'Escolha um jogo.';
  if (themeIds.length === 0) return 'Escolha pelo menos um tema.';
  const min = MODE_META[mode].minPlayers(config);
  const n = playerCount(state);
  if (n < min) return `Este jogo precisa de pelo menos ${min} jogadores (faltam ${min - n}).`;
  return null;
}
