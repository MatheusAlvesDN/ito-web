// Card: superfície com borda/sombra suave; `tone="sunken"` para blocos internos.
import type { HTMLAttributes } from 'react';
import { cx } from './styles';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  tone?: 'raised' | 'sunken' | 'brand';
  /** Elemento HTML (ex.: 'section', 'li', 'article'). */
  as?: 'div' | 'section' | 'article' | 'li';
}

const PAD = { none: '', sm: 'p-3', md: 'p-4 sm:p-5', lg: 'p-5 sm:p-6' };
const TONE = {
  raised: 'bg-surface border border-line shadow-raised',
  sunken: 'bg-surface-2 border border-line/70',
  brand: 'bg-brand/10 border border-brand/30',
};

export function Card({ padding = 'md', tone = 'raised', as: Tag = 'div', className, ...rest }: CardProps) {
  const Comp = Tag as 'div';
  return <Comp className={cx('rounded-2xl text-ink', TONE[tone], PAD[padding], className)} {...rest} />;
}
