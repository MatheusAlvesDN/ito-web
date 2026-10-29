// Partida em andamento: cabeçalho comum + view do modo (registro em src/features/games).
import { Component, Suspense, useMemo, useState, type ReactNode } from 'react';
import { DoorOpen, MoreVertical, Undo2 } from 'lucide-react';
import { useGames } from '../../lib/useGames';
import { roomClient, type GameAction, type RoomState } from '../../lib/room';
import { useWakeLock } from '../../utils/wakeLockService';
import { Button, EmptyState, IconButton, Modal, Screen, Spinner, ThemeToggle } from '../../ui';
import { buildSeatsById, gameEntry, type GameViewProps } from '../games';
import { MuteButton } from './components/MuteButton';
import { ReactionsTray } from './components/Reactions';

export function GameScreen({ state, onLeave }: { state: RoomState; onLeave: () => void }) {
  const game = state.game;
  const { data } = useGames();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLobby, setConfirmLobby] = useState(false);
  useWakeLock(true);

  const seatsById = useMemo(() => buildSeatsById(state), [state]);
  const local = state.room.kind === 'local';
  const modeName = data?.find((g) => g.id === state.room.mode)?.name ?? 'Partida';

  if (!game) {
    return (
      <Screen title={modeName}>
        <div className="flex justify-center py-16">
          <Spinner size="lg" label="Carregando partida…" />
        </div>
      </Screen>
    );
  }

  const entry = gameEntry(game.mode);
  const props: GameViewProps = {
    state,
    game,
    you: state.you,
    mySeatId: local ? null : state.you.playerId,
    send: (action: GameAction, asSeat?: string) => roomClient.sendAction(action, asSeat),
    isHost: state.you.isHost,
    local,
    seatsById,
    now: roomClient.serverNow,
  };

  return (
    <Screen
      title={modeName}
      subtitle={entry.headerInfo?.(game) ?? undefined}
      right={
        <>
          <MuteButton />
          <ThemeToggle />
          <IconButton aria-label="Opções da partida" icon={<MoreVertical />} onClick={() => setMenuOpen(true)} />
        </>
      }
      footer={local ? undefined : <ReactionsTray />}
    >
      <ViewBoundary key={game.mode}>
        <Suspense
          fallback={
            <div className="flex justify-center py-16">
              <Spinner size="lg" label="Carregando…" />
            </div>
          }
        >
          <entry.View {...props} />
        </Suspense>
      </ViewBoundary>

      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title="Opções da partida" size="sm">
        <div className="space-y-2 pb-2">
          {state.you.isHost && (
            <Button
              fullWidth
              variant="secondary"
              leftIcon={<Undo2 className="h-4 w-4" />}
              onClick={() => {
                setMenuOpen(false);
                setConfirmLobby(true);
              }}
            >
              Voltar ao lobby
            </Button>
          )}
          <Button
            fullWidth
            variant="danger"
            leftIcon={<DoorOpen className="h-4 w-4" />}
            onClick={() => {
              setMenuOpen(false);
              onLeave();
            }}
          >
            Sair da sala
          </Button>
        </div>
      </Modal>
      <Modal
        open={confirmLobby}
        onClose={() => setConfirmLobby(false)}
        title="Voltar ao lobby?"
        description="A partida atual será encerrada. Jogo, temas e configurações continuam escolhidos."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmLobby(false)}>
              Continuar jogando
            </Button>
            <Button
              onClick={() => {
                setConfirmLobby(false);
                roomClient.returnToLobby();
              }}
            >
              Voltar ao lobby
            </Button>
          </>
        }
      />
    </Screen>
  );
}

/** Erro inesperado numa view de jogo não derruba a sala inteira. */
class ViewBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <EmptyState
          tone="danger"
          title="A tela do jogo teve um problema"
          description={this.state.error.message}
          action={<Button onClick={() => this.setState({ error: null })}>Tentar de novo</Button>}
        />
      );
    }
    return this.props.children;
  }
}
