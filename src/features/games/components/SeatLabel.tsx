// SeatLabel: avatar + nome de um assento (com selo "você" e estado de conexão opcionais).
import type { ReactNode } from 'react';
import { PlayerAvatar, cx } from '../../../ui';
import type { SeatInfo } from '../types';

export interface SeatLabelProps {
  seat: SeatInfo;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  highlight?: boolean;
  /** Mostra "(você)" quando o assento é deste aparelho (só faz sentido online). */
  showYou?: boolean;
  /** Conteúdo extra à direita do nome (badges, pontos…). */
  trailing?: ReactNode;
  className?: string;
}

export function SeatLabel({ seat, size = 'sm', highlight, showYou, trailing, className }: SeatLabelProps) {
  return (
    <span className={cx('flex min-w-0 items-center gap-2', className)}>
      <PlayerAvatar name={seat.name} avatar={seat.avatar} size={size} highlight={highlight} decorative className={cx(!seat.connected && 'opacity-50')} />
      <span className="min-w-0 flex-1 truncate font-semibold">
        {seat.name}
        {showYou && seat.mine && <span className="ml-1 text-xs font-medium text-muted">(você)</span>}
        {!seat.connected && <span className="ml-1 text-xs font-medium text-muted">· desconectado</span>}
      </span>
      {trailing}
    </span>
  );
}
