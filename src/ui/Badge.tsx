// Badge: etiqueta curta de status/contagem em tons semânticos.
import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './styles';

export type BadgeTone = 'neutral' | 'brand' | 'wood' | 'success' | 'danger' | 'warning';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: 'sm' | 'md';
  icon?: ReactNode;
}

const TONE: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-muted border-line',
  brand: 'bg-brand/10 text-brand-strong border-brand/30',
  wood: 'bg-wood/10 text-wood border-wood/30',
  success: 'bg-success/10 text-success border-success/30',
  danger: 'bg-danger/10 text-danger border-danger/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
};

export function Badge({ tone = 'neutral', size = 'sm', icon, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border font-semibold [&_svg]:h-3.5 [&_svg]:w-3.5',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        TONE[tone],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </span>
  );
}
