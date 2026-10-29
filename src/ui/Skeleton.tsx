// Skeleton: bloco cinza pulsante para estados de carregamento.
import { cx } from './styles';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('animate-pulse-soft rounded-xl bg-ink/10', className)} />;
}
