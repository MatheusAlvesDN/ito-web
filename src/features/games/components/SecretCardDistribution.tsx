// SecretCardDistribution: distribuição de cartas secretas no Pass and Play (um celular passando de mão em mão).
// Puramente de apresentação: lê `distribution`/`card` do servidor e manda REVEAL_CARD / HIDE_CARD /
// NEXT_CARD com `asSeat` = assento da vez. O segredo só existe em `card` enquanto revelado.
import type { ReactNode } from 'react';
import { ArrowRight, Eye, EyeOff, Hand } from 'lucide-react';
import type { CardAction, DistributionView } from '../../../lib/room';
import { audioService } from '../../../utils/audioService';
import { Button, Card, PlayerAvatar, cx } from '../../../ui';
import { seatOf } from '../seats';
import type { SeatInfo } from '../types';

export interface SecretCardDistributionProps<C extends { seatId: string }> {
  distribution: DistributionView;
  /** `game.card`: carta da vez revelada (ou null). */
  card: C | null;
  seatsById: Record<string, SeatInfo>;
  send: (action: CardAction, asSeat?: string) => void;
  /** Conteúdo secreto da carta (número, pergunta, personalidade…). */
  renderCard: (card: C, seat: SeatInfo) => ReactNode;
  /** Ações extras com a carta aberta (ex.: Quem Sou Eu → REROLL). */
  cardActions?: (card: C, seat: SeatInfo) => ReactNode;
  /** Título acima do progresso. */
  title?: ReactNode;
  /** Instrução para quem segura o celular (antes de revelar). */
  hint?: ReactNode;
  /** Rótulo do botão de revelar (padrão: "Sou <nome>, ver minha carta"). */
  revealLabel?: (seat: SeatInfo) => string;
  /** Aviso com a carta aberta (padrão: memorizar e esconder antes de passar). */
  openHint?: ReactNode;
  /** Rótulo do botão na última carta (ex.: "Começar a discussão"). */
  lastLabel?: string;
  /** Conteúdo quando todos já viram (normalmente o servidor já mudou de fase). */
  doneContent?: ReactNode;
  className?: string;
}

export function SecretCardDistribution<C extends { seatId: string }>({
  distribution,
  card,
  seatsById,
  send,
  renderCard,
  cardActions,
  title = 'Distribuição das cartas',
  hint,
  revealLabel,
  openHint = 'Memorize e esconda antes de passar o celular.',
  lastLabel = 'Pronto',
  doneContent,
  className,
}: SecretCardDistributionProps<C>) {
  const { order, cursor, current, revealed, viewed, done } = distribution;
  const total = order.length;

  if (done || !current) {
    return <div className={className}>{doneContent ?? <p className="py-6 text-center text-muted">Todos já viram suas cartas.</p>}</div>;
  }

  const seat = seatOf(seatsById, current);
  const isLast = cursor >= total - 1;
  const nextSeat = isLast ? null : seatOf(seatsById, order[cursor + 1]);
  const hasSeen = viewed.includes(current);
  const open = revealed && card != null && card.seatId === current;

  const reveal = () => {
    audioService.playFlip();
    send({ type: 'REVEAL_CARD' }, current);
  };
  const hide = () => send({ type: 'HIDE_CARD' }, current);
  const next = () => {
    audioService.playPop();
    send({ type: 'NEXT_CARD' }, current);
  };

  return (
    <section className={cx('space-y-4', className)} aria-labelledby="dist-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="dist-title" className="font-display text-base font-bold">
          {title}
        </h2>
        <span className="text-sm font-semibold text-muted">
          {cursor + 1} de {total}
        </span>
      </div>
      <ol className="flex flex-wrap gap-1.5" aria-label="Progresso">
        {order.map((id, i) => (
          <li
            key={id}
            title={seatOf(seatsById, id).name}
            aria-current={i === cursor ? 'step' : undefined}
            // Concluídas preenchidas; a da vez só contornada, para não parecer já vista
            className={cx('h-2 flex-1 rounded-full', i < cursor ? 'bg-brand' : i === cursor ? 'bg-surface-2 ring-2 ring-brand' : 'bg-surface-2')}
          />
        ))}
      </ol>

      {open ? (
        <Card tone="brand" padding="lg" className="space-y-4 animate-fade-in-scale" aria-live="polite">
          <div className="flex items-center gap-3">
            <PlayerAvatar name={seat.name} avatar={seat.avatar} size="md" decorative />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Carta de</p>
              <p className="truncate font-display text-lg font-bold">{seat.name}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5 text-center">{renderCard(card, seat)}</div>
          {cardActions?.(card, seat)}
          <p className="text-center text-sm text-muted">{openHint}</p>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button fullWidth size="lg" rightIcon={<ArrowRight className="h-5 w-5" />} onClick={next}>
              {isLast ? lastLabel : `Esconder e passar para ${nextSeat?.name}`}
            </Button>
            <Button fullWidth variant="secondary" leftIcon={<EyeOff className="h-4 w-4" />} onClick={hide}>
              Esconder
            </Button>
          </div>
        </Card>
      ) : (
        <Card padding="lg" className="space-y-5 text-center">
          <div className="flex flex-col items-center gap-3">
            <PlayerAvatar name={seat.name} avatar={seat.avatar} size="xl" highlight decorative />
            <div>
              <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-muted">
                <Hand aria-hidden className="h-4 w-4" />
                Passe o celular para
              </p>
              <p className="font-display text-2xl font-extrabold">{seat.name}</p>
            </div>
            <p className="max-w-xs text-sm text-muted">{hint ?? `Só ${seat.name} deve olhar a tela agora.`}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button fullWidth size="lg" leftIcon={<Eye className="h-5 w-5" />} onClick={reveal}>
              {hasSeen ? 'Ver de novo' : (revealLabel?.(seat) ?? `Sou ${seat.name}, ver minha carta`)}
            </Button>
            {hasSeen && (
              <Button fullWidth variant="secondary" rightIcon={<ArrowRight className="h-4 w-4" />} onClick={next}>
                {isLast ? lastLabel : `Passar para ${nextSeat?.name}`}
              </Button>
            )}
          </div>
        </Card>
      )}
    </section>
  );
}
