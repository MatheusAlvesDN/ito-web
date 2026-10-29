// Quem Sou Eu — fase `playing`: rodada, cronômetro, cartas dos jogadores e marcação de acertos.
import { useState } from 'react';
import { ArrowRight, Check, Eye, EyeOff, Flag, HelpCircle, RefreshCw, Users } from 'lucide-react';
import { Badge, Button, Card, IconButton, Modal, Stepper, cx, focusRing } from '../../../ui';
import { ActionBar, SeatLabel, TimerPanel, WaitingForHost } from '../components';
import { seatOf } from '../seats';
import type { WhoAmIProps } from './WhoAmIView';

type Player = WhoAmIProps['game']['players'][number];

export function PlayingStep({ game, seatsById, isHost, local, mySeatId, send }: WhoAmIProps) {
  // Só UI: quais cartas o aparelho está mostrando agora (Pass and Play).
  const [shown, setShown] = useState<ReadonlySet<string>>(() => new Set());
  const [confirmEnd, setConfirmEnd] = useState(false);

  const amSeated = mySeatId != null && game.players.some((p) => p.seatId === mySeatId);
  // Online: o seu assento primeiro (com a carta "?").
  const players = local || !amSeated ? game.players : [...game.players].sort((a, b) => Number(b.seatId === mySeatId) - Number(a.seatId === mySeatId));
  const guessedCount = game.players.filter((p) => p.guessed).length;
  const pending = game.players.length - guessedCount;

  const toggleShown = (id: string) =>
    setShown((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-4">
      <Card tone="brand" className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Partida {game.matchNumber}</p>
          <p key={game.round} className="animate-fade-in font-display text-3xl font-extrabold">
            Rodada {game.round}
          </p>
        </div>
        <div className="text-right">
          <p className="flex items-center justify-end gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
            <Users aria-hidden className="h-3.5 w-3.5" />
            Acertaram
          </p>
          <p className="font-display text-2xl font-bold tabular-nums">
            {guessedCount}/{game.players.length}
          </p>
        </div>
      </Card>

      {game.timer && <TimerPanel timer={game.timer} canControl={isHost} send={send} label={`Tempo da rodada ${game.round}`} />}

      <Card tone="sunken" padding="sm" className="text-sm leading-relaxed text-muted">
        {local ? (
          <>Na sua vez, faça perguntas de sim ou não para descobrir quem você é. Toque em "Ver carta" para mostrar a personalidade de alguém.</>
        ) : (
          <>Você vê quem os outros são — a sua carta só aparece no fim da partida. Faça perguntas de sim ou não para descobrir quem você é.</>
        )}
      </Card>

      <ul className="space-y-3" aria-label="Jogadores">
        {players.map((p) => (
          <PlayerRow
            key={p.seatId}
            player={p}
            seat={seatOf(seatsById, p.seatId, p.name)}
            local={local}
            mine={!local && p.seatId === mySeatId}
            shown={shown.has(p.seatId)}
            onToggleShown={() => toggleShown(p.seatId)}
            canToggleGuessed={isHost || (!local && amSeated && p.seatId !== mySeatId)}
            isHost={isHost}
            round={game.round}
            send={send}
          />
        ))}
      </ul>

      <ActionBar>
        {isHost ? (
          <>
            <Button fullWidth size="lg" rightIcon={<ArrowRight className="h-5 w-5" />} onClick={() => send({ type: 'NEXT_ROUND' })}>
              Próxima rodada
            </Button>
            <Button fullWidth variant="secondary" leftIcon={<Flag className="h-4 w-4" />} onClick={() => setConfirmEnd(true)}>
              Encerrar partida
            </Button>
          </>
        ) : (
          <WaitingForHost>Aguardando o líder avançar a rodada…</WaitingForHost>
        )}
      </ActionBar>

      <Modal
        open={confirmEnd}
        onClose={() => setConfirmEnd(false)}
        title="Encerrar a partida?"
        description={
          pending > 0
            ? `${pending === 1 ? 'Quem ainda não acertou fica' : `Os ${pending} que ainda não acertaram ficam`} com ${game.round} ${game.round === 1 ? 'rodada' : 'rodadas'} de penalidade.`
            : 'Todos já acertaram. As cartas serão reveladas para todos.'
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmEnd(false)}>
              Continuar jogando
            </Button>
            <Button
              data-autofocus
              leftIcon={<Flag className="h-4 w-4" />}
              onClick={() => {
                setConfirmEnd(false);
                send({ type: 'END_MATCH' });
              }}
            >
              Encerrar
            </Button>
          </>
        }
      />
    </div>
  );
}

// ------------------------------------------------------------------ linha de jogador

interface PlayerRowProps {
  player: Player;
  seat: ReturnType<typeof seatOf>;
  local: boolean;
  mine: boolean;
  shown: boolean;
  onToggleShown: () => void;
  canToggleGuessed: boolean;
  isHost: boolean;
  round: number;
  send: WhoAmIProps['send'];
}

function PlayerRow({ player, seat, local, mine, shown, onToggleShown, canToggleGuessed, isHost, round, send }: PlayerRowProps) {
  const { guessed, roundsToGuess, personality } = player;
  const rounds = roundsToGuess ?? round;

  return (
    <Card as="li" padding="sm" className={cx('space-y-3', guessed && 'border-success/40 bg-success/5', mine && !guessed && 'border-brand/50')}>
      <div className="flex items-center gap-2">
        <SeatLabel
          seat={seat}
          size="md"
          showYou={!local}
          className="flex-1"
          trailing={
            guessed ? (
              <Badge tone="success" icon={<Check className="h-3 w-3" />}>
                Rodada {roundsToGuess}
              </Badge>
            ) : undefined
          }
        />
        {isHost && (
          <IconButton
            aria-label={`Trocar personalidade de ${seat.name}`}
            title="Trocar personalidade"
            icon={<RefreshCw />}
            size="sm"
            variant="ghost"
            onClick={() => send({ type: 'REROLL', seatId: player.seatId })}
          />
        )}
      </div>

      <Personality personality={personality} mine={mine} local={local} shown={shown} onToggleShown={onToggleShown} name={seat.name} />

      <div className="flex flex-wrap items-center gap-2">
        {canToggleGuessed ? (
          <button
            type="button"
            aria-pressed={guessed}
            onClick={() => send({ type: 'TOGGLE_GUESSED', seatId: player.seatId })}
            className={cx(
              'flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-semibold transition-colors',
              guessed ? 'border-success/40 bg-success/10 text-success hover:bg-success/15' : 'border-line bg-surface text-ink hover:bg-surface-2',
              focusRing,
            )}
          >
            <span
              aria-hidden
              className={cx(
                'flex h-6 w-6 items-center justify-center rounded-full border-2',
                guessed ? 'border-success bg-success text-bg' : 'border-line text-transparent',
              )}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            {guessed ? (mine ? 'Acertei!' : 'Acertou!') : mine ? 'Eu acertei' : `${seat.name} acertou`}
          </button>
        ) : (
          <p className={cx('flex-1 text-sm', guessed ? 'font-semibold text-success' : 'text-muted')}>
            {guessed ? `Acertou na rodada ${roundsToGuess}` : mine ? 'Os outros marcam quando você acertar.' : 'Ainda tentando…'}
          </p>
        )}
        {isHost && guessed && (
          <Stepper
            label={`Rodadas de ${seat.name}`}
            value={rounds}
            min={1}
            onChange={(v) => v !== rounds && send({ type: 'ADJUST_ROUNDS', seatId: player.seatId, delta: v - rounds })}
          />
        )}
      </div>
    </Card>
  );
}

function Personality({
  personality,
  mine,
  local,
  shown,
  onToggleShown,
  name,
}: {
  personality: string | null;
  mine: boolean;
  local: boolean;
  shown: boolean;
  onToggleShown: () => void;
  name: string;
}) {
  if (mine) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-brand/40 bg-brand/5 p-3" aria-label="Sua personalidade está escondida">
        <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-ink font-display text-3xl font-extrabold">
          ?
        </span>
        <p className="text-sm text-muted">
          <strong className="block font-display text-base text-ink">Quem sou eu?</strong>
          Sua carta só aparece no fim da partida.
        </p>
      </div>
    );
  }

  if (local) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 p-2 pl-3">
        <p className={cx('min-w-0 flex-1 font-display font-bold', shown ? 'animate-fade-in text-lg text-brand-strong' : 'text-muted')} aria-live="polite">
          {shown ? (personality ?? '—') : '• • • • •'}
        </p>
        <Button
          size="sm"
          variant="ghost"
          aria-pressed={shown}
          aria-label={`${shown ? 'Esconder' : 'Ver'} carta de ${name}`}
          leftIcon={shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} onClick={onToggleShown}>
          {shown ? 'Esconder' : 'Ver carta'}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface-2 px-3 py-2">
      {personality ? (
        <p className="font-display text-lg font-bold text-brand-strong">{personality}</p>
      ) : (
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <HelpCircle aria-hidden className="h-4 w-4" />
          Carta escondida
        </p>
      )}
    </div>
  );
}
