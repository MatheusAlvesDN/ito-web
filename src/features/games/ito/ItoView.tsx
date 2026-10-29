// View do modo `classic` (ITO). Puramente de apresentação — regras no backend (app/games/ito.py).
// Fases: init → rolling → numbers → ordering → result → init…
// Sabotador com vidas = 0: ordering → saboteur_voting → saboteur_reveal.
import { useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Dices,
  Eye,
  ListOrdered,
  RotateCcw,
  Search,
  ShieldCheck,
  Skull,
  Trophy,
  Users,
  Vote,
  XCircle,
} from 'lucide-react';
import { Badge, Button, Card, PlayerAvatar, cx, focusRing } from '../../../ui';
import { ActionBar, OnlineSecretCard, SecretCardDistribution, SeatLabel, WaitingForHost } from '../components';
import { seatOf } from '../seats';
import type { GameViewProps } from '../types';
import { Banner, Lives, NumberFace, NumberTimeline, QuestionCard, RevealedOrder, SaboteurBadge } from './parts';
import { SortableOrder } from './SortableOrder';

type Props = GameViewProps<'classic'>;

export default function ItoView(props: Props) {
  const { game } = props;
  switch (game.phase) {
    case 'rolling':
      return <RollingStep {...props} />;
    case 'numbers':
      return <NumbersStep {...props} />;
    case 'ordering':
      return <OrderingStep key={game.phaseSeq} {...props} />;
    case 'result':
      return <ResultStep {...props} />;
    case 'saboteur_voting':
      return <SaboteurVotingStep key={game.phaseSeq} {...props} />;
    case 'saboteur_reveal':
      return <SaboteurRevealStep {...props} />;
    default:
      return <InitStep {...props} />;
  }
}

/** Online: este aparelho joga a rodada atual? (local: sempre) */
function inRound({ game, local, mySeatId }: Props): boolean {
  return local || (mySeatId != null && game.roundSeatIds.includes(mySeatId));
}

function RoundHeader({ game, title, subtitle }: { game: Props['game']; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-xl font-bold">{title}</h2>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      <Lives lives={game.lives} maxLives={game.maxLives} />
    </div>
  );
}

// ------------------------------------------------------------------ init

function InitStep({ game, seatsById, isHost, local, send }: Props) {
  return (
    <div className="space-y-4">
      <RoundHeader game={game} title={`Rodada ${game.round}`} subtitle={`Números de 1 a ${game.scale}`} />

      <Card tone="brand" padding="lg" className="flex flex-col items-center gap-3 text-center">
        <span aria-hidden className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-brand-ink shadow-raised">
          <Dices className="h-9 w-9" />
        </span>
        <div className="space-y-1">
          <p className="font-display text-lg font-bold">Pronto para sortear?</p>
          <p className="text-sm text-muted">
            Cada um recebe um número secreto. Depois, deem dicas sobre a situação proposta e coloquem todos em ordem crescente.
          </p>
        </div>
        {game.saboteurMode && (
          <Badge tone="danger" size="md" icon={<Skull />}>
            Há um sabotador entre vocês
          </Badge>
        )}
      </Card>

      <section aria-label="Jogadores">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
          <Users aria-hidden className="h-3.5 w-3.5" />
          Jogadores ({game.seats.length})
        </h3>
        <ul className="flex flex-wrap gap-2">
          {game.seats.map((s) => {
            const seat = seatOf(seatsById, s.id, s.name);
            return (
              <li key={s.id} className="rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-sm">
                <SeatLabel seat={seat} size="xs" showYou={!local} />
              </li>
            );
          })}
        </ul>
      </section>

      <ActionBar>
        {isHost ? (
          <Button fullWidth size="lg" leftIcon={<Dices className="h-5 w-5" />} onClick={() => send({ type: 'DEAL' })}>
            Sortear números
          </Button>
        ) : (
          <WaitingForHost>Aguardando o líder sortear os números…</WaitingForHost>
        )}
      </ActionBar>
    </div>
  );
}

// ------------------------------------------------------------------ rolling

function RollingStep({ game }: Props) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 text-center" role="status" aria-live="polite">
      <span aria-hidden className="flex h-24 w-24 motion-safe:animate-bounce items-center justify-center rounded-3xl bg-brand text-brand-ink shadow-overlay">
        <Dices className="h-14 w-14 motion-safe:animate-spin motion-safe:[animation-duration:1.2s]" />
      </span>
      <div>
        <p className="font-display text-2xl font-extrabold">Sorteando números…</p>
        <p className="text-sm text-muted">De 1 a {game.scale}, sem repetir.</p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ numbers

function NumbersStep(props: Props) {
  const { game, seatsById, isHost, local, mySeatId, send } = props;

  if (local) {
    return (
      <div className="space-y-4">
        <RoundHeader game={game} title={`Rodada ${game.round}`} subtitle="Cada um vê o próprio número" />
        {game.distribution ? (
          <SecretCardDistribution
            distribution={game.distribution}
            card={game.card}
            seatsById={seatsById}
            send={send}
            title="Números secretos"
            renderCard={(c) => <NumberFace number={c.number} scale={game.scale} isSaboteur={c.isSaboteur} />}
            lastLabel="Ver a situação e ordenar"
          />
        ) : (
          <p className="py-6 text-center text-muted">Todos já viram seus números.</p>
        )}
      </div>
    );
  }

  const playing = inRound(props);
  const viewed = game.viewed.length;
  const total = game.roundSeatIds.length;
  const allViewed = viewed >= total;
  return (
    <div className="space-y-4">
      <RoundHeader game={game} title={`Rodada ${game.round}`} subtitle="Veja seu número sem mostrar a ninguém" />

      {playing && game.you ? (
        <OnlineSecretCard
          title="Seu número"
          acknowledged={mySeatId != null && game.viewed.includes(mySeatId)}
          onAck={() => send({ type: 'ACK_CARD' })}
          viewedCount={viewed}
          total={total}
        >
          <NumberFace number={game.you.number} scale={game.scale} isSaboteur={game.you.isSaboteur} />
        </OnlineSecretCard>
      ) : (
        <Card tone="sunken" className="text-center text-sm text-muted">
          Você entrou no meio da rodada — joga a partir da próxima. {viewed} de {total} já viram seus números.
        </Card>
      )}

      <ViewedList game={game} seatsById={seatsById} />

      <ActionBar hint={isHost && !allViewed ? 'Ainda tem gente vendo o número. Você pode seguir mesmo assim.' : undefined}>
        {isHost ? (
          <Button
            fullWidth
            size="lg"
            variant={allViewed ? 'primary' : 'secondary'}
            rightIcon={<ArrowRight className="h-5 w-5" />}
            onClick={() => send({ type: 'START_ORDERING' })}
          >
            Ver a situação e ordenar
          </Button>
        ) : (
          <WaitingForHost>{allViewed ? 'Todos viram. Aguardando o líder…' : 'Aguardando todos verem e o líder seguir…'}</WaitingForHost>
        )}
      </ActionBar>
    </div>
  );
}

function ViewedList({ game, seatsById }: Pick<Props, 'game' | 'seatsById'>) {
  const seen = new Set(game.viewed);
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Quem já viu o número">
      {game.roundSeatIds.map((id) => {
        const seat = seatOf(seatsById, id);
        const ok = seen.has(id);
        return (
          <li
            key={id}
            className={cx(
              'flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-sm',
              ok ? 'border-success/40 bg-success/10' : 'border-line bg-surface text-muted',
            )}
          >
            <PlayerAvatar name={seat.name} avatar={seat.avatar} size="xs" decorative />
            <span className="max-w-[8rem] truncate">{seat.name}</span>
            {ok ? <Check aria-label="viu" className="h-3.5 w-3.5 text-success" /> : <Eye aria-label="ainda não viu" className="h-3.5 w-3.5" />}
          </li>
        );
      })}
    </ul>
  );
}

// ------------------------------------------------------------------ ordering

function OrderingStep(props: Props) {
  const { game, seatsById, isHost, local, send } = props;
  const me = !local && inRound(props) ? game.you : null;
  return (
    <div className="space-y-4">
      <RoundHeader game={game} title="Hora de ordenar" subtitle={`Do menor para o maior · 1 a ${game.scale}`} />
      <QuestionCard question={game.question} />

      {me && me.number != null && (
        <Card tone="sunken" padding="sm" className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted">Seu número (só você vê)</span>
          <span className="flex items-center gap-2">
            {me.isSaboteur && (
              <Badge tone="danger" icon={<Skull />}>
                sabotador
              </Badge>
            )}
            <span className="font-display text-2xl font-extrabold tabular-nums text-brand-strong">{me.number}</span>
          </span>
        </Card>
      )}

      <Card tone="sunken" padding="sm" className="text-sm leading-relaxed text-muted">
        {isHost
          ? 'Cada um dá uma dica que represente seu número dentro da situação. Arraste (ou use ↑ ↓) para montar a fila do menor para o maior.'
          : 'Cada um dá uma dica que represente seu número dentro da situação. O líder monta a fila — você vê as mudanças ao vivo.'}
      </Card>

      <SortableOrder
        order={game.order}
        seatsById={seatsById}
        canEdit={isHost}
        showYou={!local}
        scale={game.scale}
        onMove={(seatId, toIndex) => send({ type: 'MOVE', seatId, toIndex })}
      />

      <ActionBar>
        {isHost ? (
          <Button fullWidth size="lg" leftIcon={<Eye className="h-5 w-5" />} onClick={() => send({ type: 'CHECK' })}>
            Revelar e conferir
          </Button>
        ) : (
          <WaitingForHost>Aguardando o líder conferir a ordem…</WaitingForHost>
        )}
      </ActionBar>
    </div>
  );
}

// ------------------------------------------------------------------ result

function ResultStep({ game, seatsById, isHost, local, send }: Props) {
  const success = game.lastResult?.success ?? false;
  const numbers = game.numbers ?? {};
  return (
    <div className="space-y-4">
      {game.gameOver ? (
        <Card tone="sunken" padding="lg" className="flex flex-col items-center gap-2 text-center" role="status">
          <XCircle aria-hidden className="h-12 w-12 text-danger" />
          <p className="font-display text-2xl font-extrabold">Fim de jogo</p>
          <p className="text-sm text-muted">
            As vidas acabaram na rodada {game.round}. {game.round > 1 ? `Vocês chegaram longe: ${game.round - 1} rodada(s) vencida(s).` : ''}
          </p>
          <Lives lives={game.lives} maxLives={game.maxLives} />
        </Card>
      ) : (
        <Banner tone={success ? 'success' : 'danger'} className="animate-fade-in-scale">
          {success ? <Trophy aria-hidden className="h-12 w-12 text-success" /> : <XCircle aria-hidden className="h-12 w-12 text-danger" />}
          <p className="font-display text-2xl font-extrabold">{success ? 'Ordem perfeita!' : 'Fora de ordem!'}</p>
          <p className="text-sm text-muted">
            {success ? 'Vocês acertaram a rodada.' : `Perderam ${game.lastResult?.livesLost ?? 1} vida.`}
          </p>
          <Lives lives={game.lives} maxLives={game.maxLives} />
        </Banner>
      )}

      {game.question && (
        <Card tone="sunken" padding="sm" className="text-sm">
          <span className="text-muted">Situação: </span>
          {game.question.text}
        </Card>
      )}

      <NumberTimeline numbers={numbers} scale={game.scale} seatsById={seatsById} />

      <section aria-labelledby="ito-order-title" className="space-y-2">
        <h3 id="ito-order-title" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
          <ListOrdered aria-hidden className="h-3.5 w-3.5" />
          Fila do grupo
        </h3>
        <RevealedOrder order={game.order} numbers={numbers} seatsById={seatsById} showYou={!local} />
      </section>

      <ActionBar>
        {isHost ? (
          game.gameOver ? (
            <Button fullWidth size="lg" leftIcon={<RotateCcw className="h-5 w-5" />} onClick={() => send({ type: 'RESTART' })}>
              Jogar de novo
            </Button>
          ) : (
            <>
              <Button fullWidth size="lg" rightIcon={<ArrowRight className="h-5 w-5" />} onClick={() => send({ type: 'NEXT_ROUND' })}>
                Próxima rodada
              </Button>
              <Button fullWidth variant="ghost" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => send({ type: 'RESTART' })}>
                Recomeçar do zero
              </Button>
            </>
          )
        ) : (
          <WaitingForHost>{game.gameOver ? 'Aguardando o líder começar um novo jogo…' : 'Aguardando o líder iniciar a próxima rodada…'}</WaitingForHost>
        )}
      </ActionBar>
    </div>
  );
}

// ------------------------------------------------------------------ saboteur voting

function SaboteurVotingStep(props: Props) {
  const { game, seatsById, isHost, local, mySeatId, send } = props;
  const [suspect, setSuspect] = useState<string | null>(null); // só local: escolha antes de acusar
  const voting = game.voting;
  const counts = voting?.voteCounts ?? {};
  const voted = new Set(voting?.votedSeatIds ?? []);
  const canVote = !local && inRound(props);
  const myVote = voting?.myVote ?? null;
  const selected = local ? suspect : myVote;
  const total = game.roundSeatIds.length;

  const choose = (id: string) => {
    if (local) setSuspect(id);
    else send({ type: 'VOTE', targetId: id });
  };
  const interactive = local ? isHost : canVote;

  return (
    <div className="space-y-4">
      <Banner tone="danger">
        <Skull aria-hidden className="h-12 w-12 text-danger" />
        <p className="font-display text-2xl font-extrabold">As vidas acabaram!</p>
        <p className="text-sm text-muted">
          Ainda dá para virar o jogo: descubram quem é o sabotador. Se acertarem, o grupo vence.
        </p>
      </Banner>

      {!local && game.you?.isSaboteur && (
        <Card tone="sunken" padding="sm" className="flex justify-center">
          <SaboteurBadge />
        </Card>
      )}

      <section aria-labelledby="ito-vote-title" className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 id="ito-vote-title" className="font-display text-base font-bold">
            {local ? 'Quem o grupo acusa?' : 'Seu voto'}
          </h3>
          {!local && (
            <Badge tone={voted.size >= total ? 'success' : 'neutral'}>
              {voted.size} de {total} votaram
            </Badge>
          )}
        </div>
        {!local && !canVote && <p className="text-sm text-muted">Você não jogou esta rodada — acompanhe a votação.</p>}
        <ul className="space-y-2" role={interactive ? 'radiogroup' : undefined} aria-labelledby="ito-vote-title">
          {game.roundSeatIds.map((id) => {
            const seat = seatOf(seatsById, id);
            const isMe = !local && id === mySeatId;
            const on = selected === id;
            const count = counts[id] ?? 0;
            const row = (
              <>
                <SeatLabel
                  seat={seat}
                  size="md"
                  showYou={!local}
                  className="flex-1"
                  trailing={!local && voted.has(id) ? <Badge tone="success">votou</Badge> : undefined}
                />
                {!local && count > 0 && (
                  <span className="font-display text-sm font-bold tabular-nums text-muted" aria-label={`${count} voto(s)`}>
                    {count} {count === 1 ? 'voto' : 'votos'}
                  </span>
                )}
                {interactive && !isMe && (
                  <span
                    aria-hidden
                    className={cx(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                      on ? 'border-danger bg-danger text-bg' : 'border-line text-transparent',
                    )}
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                )}
              </>
            );
            const base = cx(
              'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors',
              on ? 'border-danger/50 bg-danger/10' : 'border-line bg-surface',
            );
            return (
              <li key={id}>
                {interactive && !isMe ? (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={`${local ? 'Acusar' : 'Votar em'} ${seat.name}`}
                    className={cx(base, 'hover:bg-surface-2', focusRing)}
                    onClick={() => choose(id)}
                  >
                    {row}
                  </button>
                ) : (
                  <div className={cx(base, isMe && 'opacity-70')}>{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {game.numbers && (
        <details className="group rounded-2xl border border-line bg-surface">
          <summary className={cx('cursor-pointer list-none rounded-2xl p-3 text-sm font-semibold', focusRing)}>
            <span className="flex items-center gap-1.5">
              <Search aria-hidden className="h-4 w-4 text-brand-strong" />
              Rever a última fila e os números
            </span>
          </summary>
          <div className="space-y-3 p-3 pt-0">
            <NumberTimeline numbers={game.numbers} scale={game.scale} seatsById={seatsById} />
            <RevealedOrder order={game.order} numbers={game.numbers} seatsById={seatsById} showYou={!local} />
          </div>
        </details>
      )}

      <ActionBar hint={!local && isHost && voted.size < total ? 'Empate ou nenhum voto: o sabotador vence.' : undefined}>
        {local ? (
          <Button
            fullWidth
            size="lg"
            variant="danger"
            leftIcon={<Skull className="h-5 w-5" />}
            disabled={!suspect}
            onClick={() => suspect && send({ type: 'ACCUSE', suspectId: suspect })}
          >
            {suspect ? `Acusar ${seatOf(seatsById, suspect).name}` : 'Escolha um suspeito'}
          </Button>
        ) : isHost ? (
          <Button fullWidth size="lg" leftIcon={<Vote className="h-5 w-5" />} onClick={() => send({ type: 'REVEAL_SABOTEUR' })}>
            Encerrar votação e revelar
          </Button>
        ) : (
          <WaitingForHost>
            {canVote && !myVote ? 'Vote em quem você acha que é o sabotador.' : 'Aguardando o líder revelar o sabotador…'}
          </WaitingForHost>
        )}
      </ActionBar>
    </div>
  );
}

// ------------------------------------------------------------------ saboteur reveal

function SaboteurRevealStep({ game, seatsById, isHost, local, send }: Props) {
  const r = game.saboteurReveal;
  if (!r) return null;
  const saboteur = seatOf(seatsById, r.saboteurId);
  const suspect = r.suspectId ? seatOf(seatsById, r.suspectId) : null;
  const counts = Object.entries(r.voteCounts).sort((a, b) => b[1] - a[1]);
  return (
    <div className="space-y-4">
      <Banner tone={r.groupWon ? 'success' : 'danger'} className="animate-fade-in-scale">
        {r.groupWon ? <ShieldCheck aria-hidden className="h-12 w-12 text-success" /> : <Skull aria-hidden className="h-12 w-12 text-danger" />}
        <p className="font-display text-2xl font-extrabold">{r.groupWon ? 'O grupo venceu!' : 'O sabotador venceu!'}</p>
        <p className="text-sm text-muted">
          {suspect
            ? r.groupWon
              ? `${suspect.name} foi desmascarado.`
              : `O grupo acusou ${suspect.name}, mas errou.`
            : 'Empate ou nenhum voto — ninguém foi acusado.'}
        </p>
      </Banner>

      <Card tone="brand" className="flex items-center gap-4">
        <PlayerAvatar name={saboteur.name} avatar={saboteur.avatar} size="lg" highlight decorative />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
            <Skull aria-hidden className="h-3.5 w-3.5" />
            O sabotador era
          </p>
          <p className="truncate font-display text-2xl font-extrabold">{saboteur.name}</p>
        </div>
      </Card>

      {!local && counts.length > 0 && (
        <section aria-labelledby="ito-votes-title" className="space-y-2">
          <h3 id="ito-votes-title" className="text-xs font-semibold uppercase tracking-wider text-muted">
            Votos
          </h3>
          <ul className="space-y-2">
            {counts.map(([id, n]) => (
              <li key={id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
                <SeatLabel
                  seat={seatOf(seatsById, id)}
                  showYou
                  className="flex-1"
                  trailing={id === r.saboteurId ? <Badge tone="danger">sabotador</Badge> : undefined}
                />
                <span className="font-display text-lg font-bold tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {game.numbers && (
        <section aria-labelledby="ito-final-title" className="space-y-2">
          <h3 id="ito-final-title" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
            <CheckCircle2 aria-hidden className="h-3.5 w-3.5" />
            Última fila
          </h3>
          <RevealedOrder order={game.order} numbers={game.numbers} seatsById={seatsById} showYou={!local} highlightId={r.saboteurId} />
        </section>
      )}

      <ActionBar>
        {isHost ? (
          <Button fullWidth size="lg" leftIcon={<RotateCcw className="h-5 w-5" />} onClick={() => send({ type: 'RESTART' })}>
            Jogar de novo (novo sabotador)
          </Button>
        ) : (
          <WaitingForHost>Aguardando o líder começar um novo jogo…</WaitingForHost>
        )}
      </ActionBar>
    </div>
  );
}
