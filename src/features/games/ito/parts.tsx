// Peças visuais do ITO (sem regra de jogo: só exibem o que veio na view).
import type { ReactNode } from 'react';
import { Heart, Skull, Sparkles, Unlock } from 'lucide-react';
import { Badge, Card, PlayerAvatar, cx } from '../../../ui';
import { seatOf } from '../seats';
import type { SeatInfo } from '../types';
import type { ItoView } from '../../../lib/room';

/** Corações de vidas (cheios = restantes). */
export function Lives({ lives, maxLives, size = 'md' }: { lives: number; maxLives: number; size?: 'sm' | 'md' }) {
  const icon = size === 'sm' ? 'h-4 w-4' : 'h-6 w-6';
  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label={`${lives} de ${maxLives} vidas`}>
      {Array.from({ length: maxLives }, (_, i) => (
        <Heart
          key={i}
          aria-hidden
          className={cx(icon, 'transition-colors', i < lives ? 'fill-danger text-danger' : 'text-line')}
          strokeWidth={2.25}
        />
      ))}
    </span>
  );
}

/** Situação proposta da rodada. */
export function QuestionCard({ question }: { question: ItoView['question'] }) {
  const free = question?.themeId === 'free';
  return (
    <Card padding="lg" className="space-y-2" aria-live="polite">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-strong">
        {free ? <Unlock aria-hidden className="h-4 w-4" /> : <Sparkles aria-hidden className="h-4 w-4" />}
        {free ? 'Modo livre' : 'Situação proposta'}
      </p>
      <p className="animate-fade-in font-display text-xl font-bold leading-snug">{question?.text ?? '—'}</p>
    </Card>
  );
}

/** Face da carta: número grande + escala (+ selo de sabotador, só para o dono). */
export function NumberFace({ number, scale, isSaboteur }: { number: number | null; scale: number; isSaboteur: boolean }) {
  return (
    <span className="flex flex-col items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted">Seu número</span>
      <span className="font-display text-7xl font-extrabold leading-none tabular-nums text-brand-strong">{number ?? '?'}</span>
      <span className="text-sm text-muted">de 1 a {scale}</span>
      {isSaboteur && <SaboteurBadge />}
    </span>
  );
}

export function SaboteurBadge() {
  return (
    <span className="mt-1 flex flex-col items-center gap-1 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-2 text-danger">
      <span className="flex items-center gap-1.5 font-display text-base font-bold">
        <Skull aria-hidden className="h-4 w-4" />
        Você é o sabotador
      </span>
      <span className="text-xs font-medium">Atrapalhe a ordem sem ser descoberto.</span>
    </span>
  );
}

/** Linha do tempo com todos os números revelados na escala escolhida. */
export function NumberTimeline({
  numbers,
  scale,
  seatsById,
}: {
  numbers: Record<string, number>;
  scale: number;
  seatsById: Record<string, SeatInfo>;
}) {
  const entries = Object.entries(numbers).sort((a, b) => a[1] - b[1]);
  const pos = (n: number) => 4 + ((n - 1) / Math.max(1, scale - 1)) * 92;
  return (
    <Card padding="md" className="space-y-3">
      <h3 className="text-center text-xs font-semibold uppercase tracking-wider text-muted">Linha do tempo (1 a {scale})</h3>
      <div className="relative mx-1 h-24" role="list" aria-label="Números revelados na escala">
        <div aria-hidden className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-wood/30 via-brand/50 to-brand" />
        {entries.map(([id, n], i) => {
          const seat = seatOf(seatsById, id);
          const above = i % 2 === 0;
          const left = pos(n);
          // Rótulo preso às bordas para não vazar do cartão.
          const align = left < 15 ? 'left-0 -translate-x-2' : left > 85 ? 'right-0 translate-x-2' : 'left-1/2 -translate-x-1/2';
          return (
            <div
              key={id}
              role="listitem"
              aria-label={`${seat.name}: ${n}`}
              className="absolute top-1/2 flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${left}%` }}
            >
              <span aria-hidden className="h-4 w-4 -translate-y-1/2 rounded-full border-2 border-surface bg-brand shadow-raised" />
              <span
                aria-hidden
                className={cx(
                  'absolute flex max-w-[6rem] items-center gap-1 whitespace-nowrap rounded-lg border border-line bg-surface px-1.5 py-0.5 text-[11px] font-bold text-ink shadow-raised',
                  above ? 'bottom-3' : 'top-3',
                  align,
                )}
              >
                <span className="truncate">{seat.name}</span>
                <span className="tabular-nums text-brand-strong">{n}</span>
              </span>
            </div>
          );
        })}
      </div>
      <div aria-hidden className="flex justify-between text-[11px] font-semibold text-muted">
        <span>1</span>
        <span>{Math.round(scale / 2)}</span>
        <span>{scale}</span>
      </div>
    </Card>
  );
}

/** Fila final com os números (marca quem ficou fora de ordem em relação ao anterior). */
export function RevealedOrder({
  order,
  numbers,
  seatsById,
  showYou,
  highlightId,
}: {
  order: string[];
  numbers: Record<string, number>;
  seatsById: Record<string, SeatInfo>;
  showYou: boolean;
  highlightId?: string | null;
}) {
  return (
    <ol className="space-y-2" aria-label="Ordem escolhida pelo grupo">
      {order.map((id, i) => {
        const seat = seatOf(seatsById, id);
        const n = numbers[id];
        const prev = i > 0 ? numbers[order[i - 1]] : undefined;
        const wrong = prev != null && n != null && n < prev;
        return (
          <li
            key={id}
            className={cx(
              'flex items-center gap-3 rounded-2xl border p-3',
              wrong ? 'border-danger/40 bg-danger/10' : 'border-success/30 bg-success/5',
              highlightId === id && 'ring-2 ring-brand',
            )}
          >
            <span className="w-6 text-center font-display text-sm font-bold text-muted">{i + 1}º</span>
            <PlayerAvatar name={seat.name} avatar={seat.avatar} size="sm" decorative />
            <span className="min-w-0 flex-1 truncate font-semibold">
              {seat.name}
              {showYou && seat.mine && <span className="ml-1 text-xs font-medium text-muted">(você)</span>}
            </span>
            {wrong && (
              <Badge tone="danger" className="shrink-0">
                fora de ordem
              </Badge>
            )}
            <span
              className={cx(
                'min-w-[3.5rem] rounded-xl px-2 py-1 text-center font-display text-xl font-extrabold tabular-nums',
                wrong ? 'bg-danger text-bg' : 'bg-success/15 text-success',
              )}
            >
              {n ?? '?'}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Faixa de resultado (sucesso/erro) — div própria para não brigar com as cores do Card. */
export function Banner({ tone, children, className }: { tone: 'success' | 'danger'; children: ReactNode; className?: string }) {
  return (
    <div
      role="status"
      className={cx(
        'flex flex-col items-center gap-2 rounded-2xl border p-5 text-center text-ink sm:p-6',
        tone === 'success' ? 'border-success/40 bg-success/10' : 'border-danger/40 bg-danger/10',
        className,
      )}
    >
      {children}
    </div>
  );
}
