// Spinner: indicador de carregamento com texto para leitores de tela.
import { cx } from './styles';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  /** Texto lido por leitores de tela. */
  label?: string;
  className?: string;
}

const SIZE = { sm: 'h-4 w-4 border-2', md: 'h-6 w-6 border-[3px]', lg: 'h-10 w-10 border-4' };

export function Spinner({ size = 'md', label = 'Carregando…', className }: SpinnerProps) {
  return (
    <span role="status" className={cx('inline-flex items-center', className)}>
      <span
        aria-hidden
        className={cx('animate-spin rounded-full border-current border-r-transparent opacity-80', SIZE[size])}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
