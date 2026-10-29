// Mapeia EVENT/ERROR do servidor para sons e toasts (efêmeros; nada de estado de jogo aqui).
import { toast } from 'sonner';
import { useRoomError, useRoomEvent, type RoomState } from '../../lib/room';
import { audioService } from '../../utils/audioService';

function seatName(state: RoomState | null, id: string | undefined): string {
  if (!id || !state) return 'Alguém';
  return (
    state.game?.seats.find((s) => s.id === id)?.name ??
    state.room.players.find((p) => p.id === id)?.name ??
    state.room.localSeats.find((s) => s.id === id)?.name ??
    'Alguém'
  );
}

export function useRoomFeedback(state: RoomState | null) {
  const me = state?.you.playerId;
  const online = state?.room.kind === 'online';

  useRoomError((e) => {
    audioService.playFail();
    toast.error(e.message || 'Não foi possível fazer isso.');
  });

  useRoomEvent('player_joined', (d) => {
    if (!online || d.playerId === me) return;
    audioService.playPop();
    toast(`${d.name} entrou na sala`);
  });
  useRoomEvent('player_reconnected', (d) => {
    if (online && d.playerId !== me) toast(`${d.name} voltou`);
  });
  useRoomEvent('player_disconnected', (d) => {
    if (online && d.playerId !== me) toast(`${d.name} caiu da conexão…`, { description: 'O lugar fica guardado por alguns segundos.' });
  });
  useRoomEvent('player_left', (d) => {
    if (online && d.playerId !== me) toast(`${d.name} saiu da sala`);
  });
  useRoomEvent('host_changed', (d) => {
    if (d.hostId === me) toast.success('Agora você é o líder da sala');
    else toast(`${seatName(state, d.hostId)} agora é o líder`);
  });
  useRoomEvent('game_started', () => audioService.playSuspense());
  useRoomEvent('returned_to_lobby', (d) => {
    if (d.reason === 'not_enough_players') toast.warning('Jogadores insuficientes — de volta ao lobby.');
    else if (state?.you.isHost === false) toast('O líder voltou para o lobby.');
  });
  useRoomEvent('not_enough_players', (d) => toast.warning(`Este jogo precisa de pelo menos ${d.minPlayers} jogadores.`));
  useRoomEvent('time_up', () => {
    audioService.playFail();
    toast('Tempo esgotado!');
  });
  useRoomEvent('round_result', (d) => (d.success ? audioService.playSuccess() : audioService.playFail()));
  useRoomEvent('saboteur_result', (d) => (d.groupWon ? audioService.playSuccess() : audioService.playFail()));
  useRoomEvent('round_scored', (d) => (d.winners.length > 0 ? audioService.playSuccess() : audioService.playPop()));
  useRoomEvent('target_changed', (d) => toast(`O alvo saiu. Novo alvo: ${seatName(state, d.targetId)}`));
  useRoomEvent('round_aborted', () => toast.warning('O impostor saiu — começando uma nova rodada.'));
  useRoomEvent('guessed', (d) => d.guessed && audioService.playSuccess());
}
