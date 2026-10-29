// ActionBar: faixa de ações fixa no pé da área rolável (use como último filho da view).
import type { ReactNode } from 'react';
import { cx } from '../../../ui';

export function ActionBar({ children, hint, className }: { children?: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={cx('sticky bottom-0 z-10 -mx-4 mt-6 border-t border-line/70 bg-bg/95 px-4 pb-1 pt-3 backdrop-blur', className)}>
      {hint && <p className="mb-2 text-center text-sm text-muted">{hint}</p>}
      {children && <div className="flex flex-col gap-2 sm:flex-row-reverse">{children}</div>}
    </div>
  );
}

/** Aviso para quem não é o líder (online). */
export function WaitingForHost({ children = 'Aguardando o líder…' }: { children?: ReactNode }) {
  return (
    <p className="flex items-center justify-center gap-2 py-2 text-center text-sm text-muted" role="status">
      <span aria-hidden className="h-2 w-2 animate-pulse-soft rounded-full bg-brand" />
      {children}
    </p>
  );
}
