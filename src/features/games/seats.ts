// Helpers de assentos para as views de jogo.
import type { RoomState } from '../../lib/room';
import type { SeatInfo } from './types';

/** Monta `seatsById` a partir de `game.seats` + jogadores da sala (avatar/conexão). */
export function buildSeatsById(state: RoomState): Record<string, SeatInfo> {
  const players = new Map(state.room.players.map((p) => [p.id, p]));
  const controls = new Set(state.you.controls);
  const out: Record<string, SeatInfo> = {};
  for (const seat of state.game?.seats ?? []) {
    const p = players.get(seat.id);
    out[seat.id] = {
      id: seat.id,
      name: seat.name,
      avatar: p?.avatar ?? undefined,
      connected: state.room.kind === 'local' ? true : (p?.connected ?? false),
      mine: controls.has(seat.id),
    };
  }
  return out;
}

/** Assento por id com fallback (assento que saiu da mesa). */
export function seatOf(seatsById: Record<string, SeatInfo>, id: string | null | undefined, fallbackName = 'Jogador'): SeatInfo {
  return (id && seatsById[id]) || { id: id ?? '', name: fallbackName, connected: false, mine: false };
}
