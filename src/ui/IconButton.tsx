// IconButton: botão quadrado só com ícone; `aria-label` é obrigatório. Aceita `to` (link).
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type To } from 'react-router-dom';
import { cx, focusRing } from './styles';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  'aria-label': string;
  icon: ReactNode;
  variant?: 'ghost' | 'soft' | 'solid';
  size?: 'sm' | 'md' | 'lg';
  /** Se informado, renderiza um link do react-router. */
  to?: To;
}

const VARIANT = {
  ghost: 'text-ink hover:bg-ink/5',
  soft: 'bg-surface text-ink border border-line hover:bg-surface-2',
  solid: 'bg-brand text-brand-ink hover:bg-brand-hover',
};
const SIZE = { sm: 'h-8 w-8 rounded-lg', md: 'h-10 w-10 rounded-xl', lg: 'h-12 w-12 rounded-2xl' };

export function IconButton({ icon, variant = 'ghost', size = 'md', to, className, type = 'button', title, ...rest }: IconButtonProps) {
  const classes = cx(
    'inline-flex shrink-0 items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:h-5 [&_svg]:w-5',
    focusRing,
    VARIANT[variant],
    SIZE[size],
    className,
  );
  if (to != null) {
    return (
      <Link to={to} aria-label={rest['aria-label']} title={title ?? rest['aria-label']} className={classes}>
        {icon}
      </Link>
    );
  }
  return (
    <button type={type} title={title ?? rest['aria-label']} {...rest} className={classes}>
      {icon}
    </button>
  );
}
