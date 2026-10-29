// EmptyState: mensagem centralizada para listas vazias, erros e páginas sem conteúdo.
import type { ReactNode } from 'react';
import { cx } from './styles';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Botões/links de ação. */
  action?: ReactNode;
  tone?: 'neutral' | 'danger';
  className?: string;
}

export function EmptyState({ icon, title, description, action, tone = 'neutral', className }: EmptyStateProps) {
  return (
    <div className={cx('flex flex-col items-center px-4 py-10 text-center', className)}>
      {icon && (
        <div
          aria-hidden
          className={cx(
            'mb-4 flex h-14 w-14 items-center justify-center rounded-2xl [&_svg]:h-7 [&_svg]:w-7',
            tone === 'danger' ? 'bg-danger/10 text-danger' : 'bg-brand/10 text-brand-strong',
          )}
        >
          {icon}
        </div>
      )}
      <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
