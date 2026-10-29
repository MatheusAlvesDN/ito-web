// Quem Sou Eu — fim da partida (`match_ended`) e ranking geral (`overall`).
import { useState, type ReactNode } from 'react';
import { ArrowRight, Check, ChevronDown, Crown, ListOrdered, RotateCcw, Trophy, X } from 'lucide-react';
import { Badge, Button, Card, Modal, Stepper, cx, focusRing } from '../../../ui';
import { ActionBar, SeatLabel, WaitingForHost } from '../components';
import { seatOf } from '../seats';
import type { WhoAmIProps } from './WhoAmIView';

const roundsText = (n: number) => `${n} ${n === 1 ? 'rodada' : 'rodadas'}`;

function StepHeader({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand-strong">
        {icon}
      </span>
      <div>
        <h2 className="font-display text-xl font-bold">{title}</h2>
        <p className="text-sm text-muted">{subtitle}</p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ match_ended

export function MatchEndedStep({ game, seatsById, isHost, local, send }: WhoAmIProps) {
  return (
    <div className="space-y-4">
      <StepHeader icon={<Trophy className="h-6 w-6" />} title={`Fim da partida ${game.matchNumber}`} subtitle={`Encerrada na rodada ${game.round}. Todas as cartas reveladas!`} />

      <ul className="space-y-2" aria-label="Resultados da partida">
        {game.players.map((p) => {
          const seat = seatOf(seatsById, p.seatId, p.name);
          const rounds = p.roundsToGuess ?? game.round;
          return (
            <Card
              as="li"
              key={p.seatId}
              padding="sm"
              className={cx('space-y-2 animate-fade-in', p.guessed ? 'border-success/40' : 'border-danger/30')}
            >
              <SeatLabel
                seat={seat}
                size="md"
                showYou={!local}
                trailing={
                  p.guessed ? (
                    <Badge tone="success" icon={<Check className="h-3 w-3" />}>
                      Acertou
                    </Badge>
                  ) : (
                    <Badge tone="danger" icon={<X className="h-3 w-3" />}>
                      Não acertou
                    </Badge>
                  )
                }
              />
              <p className="font-display text-lg font-bold text-brand-strong">{p.personality ?? '—'}</p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted">{p.guessed ? `Descobriu em ${roundsText(rounds)}` : `Penalidade: ${roundsText(rounds)}`}</p>
                {isHost && (
                  <Stepper
                    label={`Rodadas de ${seat.name}`}
                    value={rounds}
                    min={1}
                    onChange={(v) => v !== rounds && send({ type: 'ADJUST_ROUNDS', seatId: p.seatId, delta: v - rounds })}
                  />
                )}
              </div>
            </Card>
          );
        })}
      </ul>

      <ActionBar>
        {isHost ? (
          <>
            <Button fullWidth size="lg" rightIcon={<ArrowRight className="h-5 w-5" />} onClick={() => send({ type: 'NEXT_MATCH' })}>
              Próxima partida
            </Button>
            <Button fullWidth variant="secondary" leftIcon={<ListOrdered className="h-4 w-4" />} onClick={() => send({ type: 'SHOW_OVERALL' })}>
              Ver ranking geral
            </Button>
          </>
        ) : (
          <WaitingForHost>Aguardando o líder iniciar a próxima partida…</WaitingForHost>
        )}
      </ActionBar>
    </div>
  );
}

// ------------------------------------------------------------------ overall

export function OverallStep({ game, seatsById, isHost, local, send }: WhoAmIProps) {
  const [open, setOpen] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const rows = game.overall ?? [];
  const matches = game.history.length;
  const best = rows[0];
  // Destaque só visual: todos empatados com o 1º da lista (que já vem ordenada do servidor).
  const isTop = (r: (typeof rows)[number]) =>
    best != null && best.matchesGuessed > 0 && r.matchesGuessed === best.matchesGuessed && r.totalRounds === best.totalRounds;

  return (
    <div className="space-y-4">
      <StepHeader
        icon={<Crown className="h-6 w-6" />}
        title="Ranking geral"
        subtitle={`${matches} ${matches === 1 ? 'partida' : 'partidas'} · mais acertos, depois menos rodadas`}
      />

      <ol className="space-y-2" aria-label="Ranking geral">
        {rows.map((r) => {
          const seat = seatOf(seatsById, r.seatId, r.name);
          const first = isTop(r);
          const rank = rows.findIndex((x) => x.matchesGuessed === r.matchesGuessed && x.totalRounds === r.totalRounds) + 1;
          const expanded = open === r.seatId;
          return (
            <li key={r.seatId} className={cx('overflow-hidden rounded-2xl border', first ? 'border-brand/50 bg-brand/10' : 'border-line bg-surface')}>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={`hist-${r.seatId}`}
                onClick={() => setOpen(expanded ? null : r.seatId)}
                className={cx('flex w-full items-center gap-3 p-3 text-left hover:bg-ink/5', focusRing)}
              >
                <span className="w-6 text-center font-display text-lg font-bold text-muted">{rank}º</span>
                <SeatLabel
                  seat={seat}
                  size="md"
                  showYou={!local}
                  className="flex-1"
                  trailing={first ? <Crown aria-label="Primeiro lugar" className="h-4 w-4 text-brand-strong" /> : undefined}
                />
                <span className="text-right leading-tight">
                  <span className="block font-display text-xl font-extrabold tabular-nums">
                    {r.matchesGuessed}/{r.history.length}
                  </span>
                  <span className="block text-xs text-muted">{roundsText(r.totalRounds)}</span>
                </span>
                <ChevronDown aria-hidden className={cx('h-4 w-4 shrink-0 text-muted transition-transform', expanded && 'rotate-180')} />
              </button>
              {expanded && (
                <ul id={`hist-${r.seatId}`} className="space-y-1 border-t border-line/70 px-3 py-2 text-sm animate-fade-in" aria-label={`Partidas de ${seat.name}`}>
                  {r.history.map((h) => (
                    <li key={h.matchNumber} className="flex items-center gap-2">
                      <span className="w-16 shrink-0 text-muted">Partida {h.matchNumber}</span>
                      <span className="min-w-0 flex-1 truncate font-semibold">{h.personality ?? '—'}</span>
                      <span className={cx('shrink-0 text-xs font-semibold', h.guessed ? 'text-success' : 'text-danger')}>
                        {h.guessed ? '✓' : '✗'} {roundsText(h.rounds)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
      <p className="text-center text-xs text-muted">Acertos/partidas · total de rodadas. Toque em um jogador para ver o histórico.</p>

      <ActionBar>
        {isHost ? (
          <>
            <Button fullWidth size="lg" rightIcon={<ArrowRight className="h-5 w-5" />} onClick={() => send({ type: 'NEXT_MATCH' })}>
              Próxima partida
            </Button>
            <Button fullWidth variant="secondary" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => setConfirmReset(true)}>
              Zerar torneio
            </Button>
          </>
        ) : (
          <WaitingForHost>Aguardando o líder iniciar a próxima partida…</WaitingForHost>
        )}
      </ActionBar>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Zerar o torneio?"
        description="O histórico e o ranking geral serão apagados e uma nova partida 1 começa."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              leftIcon={<RotateCcw className="h-4 w-4" />}
              onClick={() => {
                setConfirmReset(false);
                send({ type: 'RESET_ALL' });
              }}
            >
              Zerar
            </Button>
          </>
        }
      />
    </div>
  );
}
