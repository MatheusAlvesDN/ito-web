// /sala/:codigo — entra (ou retoma) a sala e mostra o lobby ou a partida.
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DoorOpen, Home, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { normalizeRoomCode, useRoom, type RoomError } from '../../lib/room';
import { Button, Card, EmptyState, Modal, Screen, Spinner, ThemeToggle } from '../../ui';
import { ConnectionOverlay } from './components/ConnectionOverlay';
import { ProfileForm } from './components/ProfileForm';
import { ReactionsOverlay } from './components/Reactions';
import { GameScreen } from './GameScreen';
import { LobbyScreen } from './LobbyScreen';
import { loadProfile, saveProfile } from './profile';
import { useRoomFeedback } from './useRoomFeedback';

/** Erros de entrada que mandam de volta ao início. */
const BACK_HOME = new Set(['room_not_found', 'local_room']);

export default function RoomPage() {
  const { codigo = '' } = useParams();
  const code = normalizeRoomCode(codigo);
  const navigate = useNavigate();
  const { status, state, error, session, client } = useRoom();
  const inThisRoom = state?.room.code === code;
  const hasSession = session?.roomCode === code;
  const [confirmLeave, setConfirmLeave] = useState(false);

  useRoomFeedback(inThisRoom ? state : null);

  // Recarregou a página: reentra com a sessão salva desta aba.
  useEffect(() => {
    client.resume(code);
  }, [client, code]);

  // Sala não existe / é local de outro aparelho → volta ao início.
  useEffect(() => {
    if (status === 'error' && error && BACK_HOME.has(error.code)) {
      toast.error(error.message);
      client.clearError();
      navigate('/', { replace: true });
    }
  }, [status, error, client, navigate]);

  const leave = () => {
    client.leave();
    navigate('/');
  };

  if (inThisRoom && state) {
    const online = state.room.kind === 'online';
    return (
      <div className="relative h-full">
        {state.room.stage === 'game' ? (
          <GameScreen state={state} onLeave={() => setConfirmLeave(true)} />
        ) : (
          <LobbyScreen state={state} onLeave={() => setConfirmLeave(true)} />
        )}
        {online && <ReactionsOverlay />}
        {status === 'reconnecting' && <ConnectionOverlay onLeave={leave} />}
        <Modal
          open={confirmLeave}
          onClose={() => setConfirmLeave(false)}
          title="Sair da sala?"
          description={
            state.you.isHost && online && state.room.players.length > 1
              ? 'Outro jogador vira o líder. Você pode voltar com o código enquanto a sala existir.'
              : state.room.kind === 'local'
                ? 'A partida neste celular será encerrada.'
                : 'Você pode voltar com o código enquanto a sala existir.'
          }
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmLeave(false)}>
                Ficar
              </Button>
              <Button variant="danger" leftIcon={<DoorOpen className="h-4 w-4" />} onClick={leave}>
                Sair
              </Button>
            </>
          }
        />
      </div>
    );
  }

  if (hasSession && (status === 'connecting' || status === 'reconnecting')) {
    return (
      <Screen title={`Sala ${code}`} back="/" right={<ThemeToggle />}>
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Spinner size="lg" label="Entrando na sala…" />
          <p className="text-sm text-muted">{status === 'reconnecting' ? 'Reconectando ao servidor…' : 'Entrando na sala…'}</p>
          <Button variant="ghost" onClick={leave}>
            Cancelar
          </Button>
        </div>
      </Screen>
    );
  }

  if (status === 'error' && error && !BACK_HOME.has(error.code)) {
    return (
      <Screen title={`Sala ${code}`} back="/" right={<ThemeToggle />}>
        <EmptyState
          tone="danger"
          title={error.code === 'session_replaced' ? 'Sala aberta em outra aba' : 'Não deu para entrar'}
          description={error.message}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="secondary" leftIcon={<Home className="h-4 w-4" />} to="/" onClick={() => client.clearError()}>
                Início
              </Button>
              <Button leftIcon={<LogIn className="h-4 w-4" />} onClick={() => client.clearError()}>
                Entrar de novo
              </Button>
            </div>
          }
        />
      </Screen>
    );
  }

  return <JoinRoom code={code} />;
}

function JoinRoom({ code }: { code: string }) {
  const { client } = useRoom();
  const [profile, setProfile] = useState(loadProfile);
  const [busy, setBusy] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const name = profile.name.trim();
    if (!name) {
      setNameError('Digite seu nome.');
      return;
    }
    saveProfile({ ...profile, name });
    setBusy(true);
    try {
      await client.joinRoom(code, name, profile.avatar);
    } catch (err) {
      const re = err as RoomError;
      if (re?.code === 'invalid_message') setNameError('Nome inválido.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={`Sala ${code}`} subtitle="Entrar na sala" back="/" right={<ThemeToggle />}>
      <form onSubmit={submit} noValidate className="space-y-5">
        <Card tone="brand" className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Você vai entrar na sala</p>
          <p className="font-display text-4xl font-extrabold tracking-[0.2em] text-brand-strong">{code}</p>
        </Card>
        <Card>
          <ProfileForm
            value={profile}
            onChange={(p) => {
              setProfile(p);
              setNameError(null);
            }}
            error={nameError}
            autoFocus={!profile.name}
          />
        </Card>
        <Button type="submit" fullWidth size="lg" loading={busy} leftIcon={<LogIn className="h-5 w-5" />}>
          Entrar
        </Button>
      </form>
    </Screen>
  );
}
