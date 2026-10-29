// View do modo `whatdoyouknow` (O Que Você Sabe?). Sem segredos: a view é igual para todos.
// Fases: question → scoring → leaderboard → question… (todas as ações são do líder).
import { ArrowRight, Check, Crown, MessageCircleQuestion, SkipForward, Target, Trophy } from 'lucide-react';
import { Badge, Button, Card, PlayerAvatar, cx, focusRing } from '../../../ui';
import { ActionBar, SeatLabel, WaitingForHost } from '../components';
import { seatOf } from '../seats';
import type { GameViewProps, SeatInfo } from '../types';

type Props = GameViewProps<'whatdoyouknow'>;

export default function WhatDoYouKnowView(props: Props) {
  const { game } = props;
  if (game.phase === 'scoring') return <ScoringStep {...props} />;
  if (game.phase === 'leaderboard') return <LeaderboardStep {...props} />;
  return <QuestionStep {...props} />;
}

// ------------------------------------------------------------------ question

function QuestionStep({ game, seatsById, isHost, local, mySeatId, send }: Props) {
  const target = seatOf(seatsById, game.targetId);
  const youAreTarget = !local && mySeatId != null && mySeatId === game.targetId;

  return (
    <div className="space-y-4">
      <Card tone="brand" className="flex items-center gap-4">
        <PlayerAvatar name={target.name} avatar={target.avatar} size="lg" highlight decorative />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
            <Target aria-hidden className="h-3.5 w-3.5" />
            Alvo da rodada
          </p>
          <p className="truncate font-display text-2xl font-extrabold">{youAreTarget ? 'Você!' : target.name}</p>
        </div>
      </Card>

      <Card padding="lg" className="space-y-3" aria-live="polite">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-strong">
          <MessageCircleQuestion aria-hidden className="h-4 w-4" />
          Pergunta
        </p>
        <p key={game.phaseSeq} className="animate-fade-in font-display text-2xl font-bold leading-snug">
          {game.question?.text ?? 'Sem pergunta — peça ao líder para pular.'}
        </p>
      </Card>

      <Card tone="sunken" padding="sm" className="text-sm leading-relaxed text-muted">
        {youAreTarget ? (
          <>Pense na sua resposta. Os outros vão tentar adivinhar o que você responderia — depois revele em voz alta.</>
        ) : (
          <>
            Todos dão um palpite sobre o que <strong className="text-ink">{target.name}</strong> responderia. Depois {target.name} revela a
            resposta e o líder marca quem acertou.
          </>
        )}
      </Card>

      <MiniScoreboard game={game} seatsById={seatsById} />

      <ActionBar>
        {isHost ? (
          <>
            <Button fullWidth size="lg" rightIcon={<ArrowRight className="h-5 w-5" />} onClick={() => send({ type: 'GO_SCORING' })}>
              Marcar quem acertou
            </Button>
            <Button fullWidth variant="secondary" leftIcon={<SkipForward className="h-4 w-4" />} onClick={() => send({ type: 'NEXT_ROUND' })}>
              Pular pergunta
            </Button>
          </>
        ) : (
          <WaitingForHost>Quando todos responderem, o líder marca quem acertou.</WaitingForHost>
        )}
      </ActionBar>
    </div>
  );
}

// ------------------------------------------------------------------ scoring

function ScoringStep({ game, seatsById, isHost, send }: Props) {
  const target = seatOf(seatsById, game.targetId);
  const winners = new Set(game.winners);
  const guessers = game.seats.filter((s) => s.id !== game.targetId).map((s) => seatOf(seatsById, s.id));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">Quem acertou?</h2>
        <p className="text-sm text-muted">
          {isHost ? (
            <>
              Toque em quem acertou a resposta de <strong className="text-ink">{target.name}</strong>.
            </>
          ) : (
            <>O líder está marcando quem acertou a resposta de {target.name}.</>
          )}
        </p>
      </div>

      {game.question && (
        <Card tone="sunken" padding="sm" className="text-sm">
          <span className="text-muted">Pergunta: </span>
          {game.question.text}
        </Card>
      )}

      <ul className="space-y-2" aria-label="Jogadores">
        {guessers.map((seat) => {
          const on = winners.has(seat.id);
          const row = (
            <>
              <SeatLabel seat={seat} size="md" className="flex-1" />
              <span
                aria-hidden
                className={cx(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  on ? 'border-brand bg-brand text-brand-ink' : 'border-line text-transparent',
                )}
              >
                <Check className="h-4 w-4" strokeWidth={3} />
              </span>
            </>
          );
          const base = cx(
            'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors',
            on ? 'border-brand/50 bg-brand/10' : 'border-line bg-surface',
          );
          return (
            <li key={seat.id}>
              {isHost ? (
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  aria-label={`${seat.name} acertou`}
                  className={cx(base, 'hover:bg-surface-2', focusRing)}
                  onClick={() => send({ type: 'TOGGLE_WINNER', seatId: seat.id })}
                >
                  {row}
                </button>
              ) : (
                <div className={base} aria-label={`${seat.name}: ${on ? 'acertou' : 'não marcado'}`}>
                  {row}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Card tone="sunken" padding="sm" className="text-sm text-muted">
        {winners.size === 0
          ? 'Ninguém marcado ainda.'
          : `${target.name} ganha +${winners.size} e cada acertador ganha +1.`}
      </Card>

      <ActionBar>
        {isHost ? (
          <Button fullWidth size="lg" leftIcon={<Check className="h-5 w-5" />} onClick={() => send({ type: 'CONFIRM' })}>
            {winners.size === 0 ? 'Confirmar (ninguém acertou)' : 'Confirmar pontos'}
          </Button>
        ) : (
          <WaitingForHost />
        )}
      </ActionBar>
    </div>
  );
}

// ------------------------------------------------------------------ leaderboard

function LeaderboardStep({ game, seatsById, isHost, local, send }: Props) {
  const gains = game.lastGains ?? {};
  const top = game.ranking[0]?.score ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand-strong">
          <Trophy className="h-6 w-6" />
        </span>
        <div>
          <h2 className="font-display text-xl font-bold">Placar</h2>
          <p className="text-sm text-muted">Depois da rodada {game.round}</p>
        </div>
      </div>

      <ol className="space-y-2" aria-label="Ranking">
        {game.ranking.map((r, i) => {
          const seat = seatOf(seatsById, r.seatId, r.name);
          const gain = gains[r.seatId] ?? 0;
          const leader = r.score > 0 && r.score === top;
          return (
            <li
              key={r.seatId}
              className={cx('flex items-center gap-3 rounded-2xl border p-3', leader ? 'border-brand/50 bg-brand/10' : 'border-line bg-surface')}
            >
              <span className="w-6 text-center font-display text-lg font-bold text-muted">{i + 1}</span>
              <SeatLabel
                seat={seat}
                size="md"
                showYou={!local}
                className="flex-1"
                trailing={leader ? <Crown aria-label="Liderando" className="h-4 w-4 text-brand-strong" /> : undefined}
              />
              {gain > 0 && (
                <Badge tone="success" className="animate-fade-in">
                  +{gain}
                </Badge>
              )}
              <span className="w-10 text-right font-display text-2xl font-extrabold tabular-nums">{r.score}</span>
            </li>
          );
        })}
      </ol>

      <ActionBar>
        {isHost ? (
          <Button fullWidth size="lg" rightIcon={<ArrowRight className="h-5 w-5" />} onClick={() => send({ type: 'NEXT_ROUND' })}>
            Próxima rodada
          </Button>
        ) : (
          <WaitingForHost>Aguardando o líder iniciar a próxima rodada…</WaitingForHost>
        )}
      </ActionBar>
    </div>
  );
}

// ------------------------------------------------------------------ placar compacto

function MiniScoreboard({ game, seatsById }: { game: Props['game']; seatsById: Record<string, SeatInfo> }) {
  const rows = game.ranking;
  if (rows.every((r) => r.score === 0)) return null;
  return (
    <section aria-label="Placar">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Placar</h3>
      <ul className="flex flex-wrap gap-2">
        {rows.map((r) => {
          const seat = seatOf(seatsById, r.seatId, r.name);
          return (
            <li key={r.seatId} className="flex items-center gap-1.5 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-sm">
              <PlayerAvatar name={seat.name} avatar={seat.avatar} size="xs" decorative />
              <span className="max-w-[8rem] truncate">{seat.name}</span>
              <span className="font-display font-bold tabular-nums">{r.score}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
