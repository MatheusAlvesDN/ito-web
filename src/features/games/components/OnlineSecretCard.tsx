// OnlineSecretCard: a carta secreta do próprio jogador (online). Começa coberta; "Já vi" manda ACK_CARD.
import { useState, type ReactNode } from 'react';
import { Check, Eye, EyeOff } from 'lucide-react';
import { audioService } from '../../../utils/audioService';
import { Badge, Button, Card, cx } from '../../../ui';

export interface OnlineSecretCardProps {
  /** Conteúdo secreto (vem de `game.you`). */
  children: ReactNode;
  /** Você já confirmou (`game.viewed` inclui seu assento). */
  acknowledged: boolean;
  /** Manda `{type: 'ACK_CARD'}`. Omitido = sem botão "Já vi". */
  onAck?: () => void;
  /** Quantos já viram / total (de `game.viewed` × `roundSeatIds`). */
  viewedCount?: number;
  total?: number;
  title?: ReactNode;
  className?: string;
}

export function OnlineSecretCard({ children, acknowledged, onAck, viewedCount, total, title = 'Sua carta', className }: OnlineSecretCardProps) {
  const [shown, setShown] = useState(false);
  const toggle = () => {
    if (!shown) audioService.playFlip();
    setShown((s) => !s);
  };
  return (
    <Card tone={shown ? 'brand' : 'raised'} padding="lg" className={cx('space-y-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-base font-bold">{title}</h2>
        {total != null && viewedCount != null && (
          <Badge tone={viewedCount >= total ? 'success' : 'neutral'}>
            {viewedCount} de {total} viram
          </Badge>
        )}
      </div>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={shown}
        className="flex min-h-[8rem] w-full items-center justify-center rounded-2xl border border-line bg-surface p-5 text-center transition-colors hover:bg-surface-2"
      >
        {shown ? (
          <span className="w-full animate-fade-in-scale">{children}</span>
        ) : (
          <span className="flex flex-col items-center gap-2 text-muted">
            <Eye aria-hidden className="h-8 w-8" />
            <span className="font-semibold">Toque para ver (sem ninguém olhando)</span>
          </span>
        )}
      </button>
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        {onAck &&
          (acknowledged ? (
            <Badge tone="success" size="md" icon={<Check />} className="justify-center self-center">
              Você já viu sua carta
            </Badge>
          ) : (
            <Button fullWidth leftIcon={<Check className="h-4 w-4" />} onClick={onAck}>
              Já vi minha carta
            </Button>
          ))}
        {shown && (
          <Button fullWidth variant="secondary" leftIcon={<EyeOff className="h-4 w-4" />} onClick={() => setShown(false)}>
            Esconder
          </Button>
        )}
      </div>
    </Card>
  );
}
