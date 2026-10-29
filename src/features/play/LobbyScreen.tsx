// Lobby da sala: código/QR (online), jogadores, e (líder) jogo, temas, config e "Começar".
import { useState, type ReactNode } from 'react';
import { Crown, Pencil, Play, Smartphone, Users } from 'lucide-react';
import { useGames } from '../../lib/useGames';
import { roomClient, type GameMode, type RoomState } from '../../lib/room';
import { Badge, Button, Card, Modal, PlayerAvatar, Screen, Skeleton, ThemeToggle } from '../../ui';
import { MODE_META } from '../games/modes';
import { ConfigForm } from './components/ConfigForm';
import { ModePicker } from './components/ModePicker';
import { MuteButton } from './components/MuteButton';
import { PlayerNamesEditor } from './components/PlayerNamesEditor';
import { ReactionsTray } from './components/Reactions';
import { RoomCodePanel } from './components/RoomCodePanel';
import { ThemePicker } from './components/ThemePicker';
import { defaultThemeIds, playerCount, roomGames, startBlocker } from './lobbyHelpers';
import { MIN_LOCAL_PLAYERS, saveLocalPlayers } from './profile';

export function LobbyScreen({ state, onLeave }: { state: RoomState; onLeave: () => void }) {
  const { room, you } = state;
  const isHost = you.isHost;
  const local = room.kind === 'local';
  const { data, loading } = useGames();
  const games = roomGames(data);
  const game = games.find((g) => g.id === room.mode);
  const blocker = startBlocker(state);
  const [editingPlayers, setEditingPlayers] = useState(false);

  const chooseMode = (mode: GameMode) => {
    roomClient.selectMode(mode);
    const ids = defaultThemeIds(games.find((g) => g.id === mode), mode);
    if (ids.length) roomClient.selectThemes(ids);
  };

  const footer = isHost ? (
    <div className="space-y-2">
      {blocker && <p className="text-center text-sm text-muted">{blocker}</p>}
      <Button fullWidth size="lg" leftIcon={<Play className="h-5 w-5" />} disabled={!!blocker} onClick={() => roomClient.startGame()}>
        Começar
      </Button>
    </div>
  ) : (
    <div className="space-y-2">
      {!local && <ReactionsTray />}
      <p className="flex items-center justify-center gap-2 py-1 text-sm text-muted" role="status">
        <span aria-hidden className="h-2 w-2 animate-pulse-soft rounded-full bg-brand" />
        Aguardando o líder começar…
      </p>
    </div>
  );

  return (
    <Screen
      title={local ? 'Mesmo celular' : `Sala ${room.code}`}
      subtitle={game ? `Lobby · ${game.name}` : 'Lobby'}
      back={onLeave}
      backLabel="Sair da sala"
      right={
        <>
          <MuteButton />
          <ThemeToggle />
        </>
      }
      footer={footer}
    >
      <div className="space-y-5">
        {!local && <RoomCodePanel code={room.code} />}

        <Section
          title={local ? 'Jogadores' : 'Na sala'}
          icon={<Users className="h-4 w-4" />}
          aside={
            <span className="flex items-center gap-2">
              <Badge tone="neutral">{playerCount(state)}</Badge>
              {local && isHost && (
                <Button variant="ghost" size="sm" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditingPlayers(true)}>
                  Editar
                </Button>
              )}
            </span>
          }
        >
          {local ? (
            <ul className="flex flex-wrap gap-2">
              {room.localSeats.map((s) => (
                <li key={s.id} className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3">
                  <PlayerAvatar name={s.name} size="sm" decorative />
                  <span className="max-w-[10rem] truncate text-sm font-semibold">{s.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-2">
              {room.players.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-2.5">
                  <PlayerAvatar name={p.name} avatar={p.avatar ?? undefined} size="md" highlight={p.id === room.hostId} decorative className={p.connected ? '' : 'opacity-50'} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {p.name}
                      {p.id === you.playerId && <span className="ml-1 text-xs font-medium text-muted">(você)</span>}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted">
                      <span aria-hidden className={p.connected ? 'h-2 w-2 rounded-full bg-success' : 'h-2 w-2 rounded-full bg-warning'} />
                      {p.connected ? 'Conectado' : 'Reconectando…'}
                    </span>
                  </span>
                  {p.id === room.hostId && (
                    <Badge tone="brand" icon={<Crown />}>
                      Líder
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!local && room.players.length < 2 && <p className="mt-2 text-sm text-muted">Compartilhe o código para os outros entrarem.</p>}
        </Section>

        <Section title="Jogo">
          {loading && !data ? (
            <Skeleton className="h-16 w-full rounded-2xl" />
          ) : (
            <ModePicker games={games} value={room.mode} editable={isHost} onChange={chooseMode} />
          )}
          {room.mode && <p className="mt-2 text-sm leading-relaxed text-muted">{MODE_META[room.mode].howTo}</p>}
        </Section>

        {room.mode && (
          <>
            <Section title="Temas">
              <ThemePicker mode={room.mode} game={game} selected={room.themeIds} editable={isHost} onChange={(ids) => roomClient.selectThemes(ids)} />
            </Section>
            {MODE_META[room.mode].config.length > 0 && (
              <Section title="Configurações">
                <Card>
                  <ConfigForm mode={room.mode} config={room.config} editable={isHost} onChange={(c) => roomClient.setConfig(c)} />
                </Card>
              </Section>
            )}
          </>
        )}

        {local && (
          <Card tone="sunken" padding="sm" className="flex items-start gap-2 text-sm text-muted">
            <Smartphone aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            Um celular só, passando de mão em mão. Cartas secretas aparecem uma de cada vez.
          </Card>
        )}
      </div>

      {local && editingPlayers && (
        <EditLocalPlayers
          initial={room.localSeats.map((s) => s.name)}
          onClose={() => setEditingPlayers(false)}
          onSave={(names) => {
            roomClient.setLocalPlayers(names);
            saveLocalPlayers(names);
            setEditingPlayers(false);
          }}
        />
      )}
    </Screen>
  );
}

function Section({ title, icon, aside, children }: { title: string; icon?: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex min-h-9 items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 font-display text-base font-bold">
          {icon && (
            <span aria-hidden className="text-wood">
              {icon}
            </span>
          )}
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function EditLocalPlayers({ initial, onClose, onSave }: { initial: string[]; onClose: () => void; onSave: (names: string[]) => void }) {
  const [names, setNames] = useState(initial);
  const ok = names.length >= MIN_LOCAL_PLAYERS;
  return (
    <Modal
      open
      onClose={onClose}
      title="Jogadores"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!ok} onClick={() => onSave(names)}>
            Salvar
          </Button>
        </>
      }
    >
      <PlayerNamesEditor names={names} onChange={setNames} />
      {!ok && <p className="mt-2 text-sm text-danger">Pelo menos {MIN_LOCAL_PLAYERS} jogadores.</p>}
    </Modal>
  );
}
