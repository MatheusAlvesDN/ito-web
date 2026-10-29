// /jogar/:modo?tipo=local|online — prepara a partida e cria a sala (o lobby escolhe temas/config).
import { useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { DoorOpen, Play, SearchX, Smartphone, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import type { ApiGame } from '../../lib/api';
import { isGameMode, roomClient, type GameMode, type RoomError } from '../../lib/room';
import { useGame } from '../../lib/useGames';
import { AppIcon, Button, Card, EmptyState, Input, Screen, SegmentedControl, Spinner, ThemeToggle } from '../../ui';
import { MODE_META } from '../games/modes';
import { PlayerNamesEditor } from './components/PlayerNamesEditor';
import { ProfileForm } from './components/ProfileForm';
import { defaultThemeIds } from './lobbyHelpers';
import { MIN_LOCAL_PLAYERS, loadLocalPlayers, loadProfile, saveLocalPlayers, saveProfile } from './profile';

type Kind = 'local' | 'online';

export default function PreparePage() {
  const { modo } = useParams();
  const [params, setParams] = useSearchParams();
  const kind: Kind = params.get('tipo') === 'online' ? 'online' : 'local';
  const { game, loading, error, reload } = useGame(modo);

  return (
    <Screen title={game?.name ?? 'Preparar partida'} subtitle="Preparar partida" back="/" right={<ThemeToggle />}>
      {loading && !game ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" label="Carregando modo…" />
        </div>
      ) : error && !game ? (
        <EmptyState tone="danger" title="Sem conexão" description={error} action={<Button onClick={reload}>Tentar de novo</Button>} />
      ) : !game || !isGameMode(game.id) ? (
        <EmptyState
          icon={<SearchX />}
          title="Modo não encontrado"
          description={`Não existe um modo ativo chamado “${modo}”.`}
          action={<Button to="/">Voltar ao início</Button>}
        />
      ) : (
        <div className="space-y-5">
          <Card className="flex gap-4">
            <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand-strong">
              <AppIcon name={game.icon} className="h-6 w-6" />
            </span>
            <p className="text-sm leading-relaxed text-muted">{MODE_META[game.id].howTo}</p>
          </Card>
          <SegmentedControl
            aria-label="Como jogar"
            value={kind}
            onChange={(v: Kind) => setParams({ tipo: v }, { replace: true })}
            options={[
              { value: 'local', label: 'Mesmo celular', icon: <Smartphone className="h-4 w-4" /> },
              { value: 'online', label: 'Online', icon: <Wifi className="h-4 w-4" /> },
            ]}
          />
          {kind === 'local' ? <LocalSetup game={game} mode={game.id} /> : <OnlineSetup game={game} mode={game.id} />}
        </div>
      )}
    </Screen>
  );
}

/** Depois de criar: escolhe o modo e os temas padrão; o lobby permite trocar. */
function setupRoom(game: ApiGame, mode: GameMode) {
  roomClient.selectMode(mode);
  const ids = defaultThemeIds(game, mode);
  if (ids.length) roomClient.selectThemes(ids);
}

function LocalSetup({ game, mode }: { game: ApiGame; mode: GameMode }) {
  const navigate = useNavigate();
  const [names, setNames] = useState(loadLocalPlayers);
  const [busy, setBusy] = useState(false);
  const min = Math.max(MIN_LOCAL_PLAYERS, MODE_META[mode].minPlayers({}));
  const missing = min - names.length;

  const create = async () => {
    saveLocalPlayers(names);
    setBusy(true);
    try {
      const st = await roomClient.createRoom({ kind: 'local', playerName: loadProfile().name.trim() || 'Este celular', localPlayers: names });
      setupRoom(game, mode);
      navigate(`/sala/${st.room.code}`);
    } catch (e) {
      toast.error((e as RoomError).message ?? 'Não foi possível criar a partida.');
      roomClient.clearError();
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4" aria-labelledby="local-title">
      <div>
        <h2 id="local-title" className="font-display text-lg font-bold">
          Quem vai jogar?
        </h2>
        <p className="text-sm text-muted">Um celular só, passando de mão em mão. {game.name} precisa de pelo menos {min} jogadores.</p>
      </div>
      <PlayerNamesEditor
        names={names}
        onChange={(n) => {
          setNames(n);
          saveLocalPlayers(n);
        }}
      />
      <div className="space-y-2 pt-1">
        {missing > 0 && (
          <p className="text-center text-sm text-muted">
            Adicione mais {missing} {missing === 1 ? 'jogador' : 'jogadores'}.
          </p>
        )}
        <Button fullWidth size="lg" leftIcon={<Play className="h-5 w-5" />} disabled={missing > 0} loading={busy} onClick={create}>
          Criar partida
        </Button>
      </div>
    </section>
  );
}

function OnlineSetup({ game, mode }: { game: ApiGame; mode: GameMode }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(loadProfile);
  const [nameError, setNameError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  const checkName = () => {
    const name = profile.name.trim();
    if (!name) {
      setNameError('Digite seu nome.');
      return null;
    }
    saveProfile({ ...profile, name });
    return name;
  };

  const fail = (e: unknown) => {
    const err = e as RoomError;
    if (err.code === 'room_not_found' || err.code === 'local_room') setCodeError(err.message);
    else toast.error(err.message ?? 'Não foi possível conectar.');
    roomClient.clearError();
    setBusy(null);
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const name = checkName();
    if (!name) return;
    setBusy('create');
    try {
      const st = await roomClient.createRoom({ kind: 'online', playerName: name, avatar: profile.avatar });
      setupRoom(game, mode);
      navigate(`/sala/${st.room.code}`);
    } catch (err) {
      fail(err);
    }
  };

  const join = async (e: FormEvent) => {
    e.preventDefault();
    const name = checkName();
    if (!name) return;
    if (!/^[A-Z]{4,8}$/.test(code)) {
      setCodeError('O código tem 4 letras.');
      return;
    }
    setBusy('join');
    try {
      const st = await roomClient.joinRoom(code, name, profile.avatar);
      navigate(`/sala/${st.room.code}`);
    } catch (err) {
      fail(err);
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={create} noValidate className="space-y-4">
        <Card>
          <ProfileForm
            value={profile}
            onChange={(p) => {
              setProfile(p);
              setNameError(null);
            }}
            error={nameError}
          />
        </Card>
        <Button type="submit" fullWidth size="lg" leftIcon={<Wifi className="h-5 w-5" />} loading={busy === 'create'} disabled={busy != null}>
          Criar sala online
        </Button>
        <p className="text-center text-xs text-muted">Você será o líder: escolhe temas, configurações e começa a partida.</p>
      </form>

      <Card as="section" aria-labelledby="join-code-title">
        <form onSubmit={join} noValidate>
          <h2 id="join-code-title" className="mb-3 flex items-center gap-2 font-display text-base font-bold">
            <DoorOpen aria-hidden className="h-5 w-5 text-wood" />
            Já tem um código?
          </h2>
          <div className="flex items-start gap-2">
            <Input
              label="Código da sala"
              hideLabel
              placeholder="ABCD"
              value={code}
              error={codeError}
              maxLength={8}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8));
                setCodeError(null);
              }}
              wrapperClassName="flex-1"
              className="text-center font-display text-lg font-bold uppercase tracking-[0.4em] placeholder:tracking-[0.4em]"
            />
            <Button type="submit" variant="secondary" loading={busy === 'join'} disabled={busy != null || code.length < 4}>
              Entrar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
