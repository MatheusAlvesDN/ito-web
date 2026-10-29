// Helpers de estilo compartilhados pelo UI kit (classes Tailwind prontas).

/** Junta classes ignorando valores falsos. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Anel de foco visível (teclado) na cor da marca. */
export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-brand-ink hover:bg-brand-hover shadow-raised',
  secondary: 'bg-surface text-ink border border-line hover:bg-surface-2',
  ghost: 'bg-transparent text-ink hover:bg-ink/5',
  danger: 'bg-danger text-bg hover:bg-danger/90',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-4 text-[15px] gap-2 rounded-xl',
  lg: 'h-14 px-6 text-base gap-2.5 rounded-2xl',
};

/** Classes de botão — use em elementos que precisam parecer botão sem ser <Button>. */
export function buttonClasses(opts: { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean } = {}): string {
  const { variant = 'primary', size = 'md', fullWidth } = opts;
  return cx(
    'inline-flex select-none items-center justify-center whitespace-nowrap font-display font-semibold transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
    focusRing,
    VARIANTS[variant],
    SIZES[size],
    fullWidth && 'w-full',
  );
}

/** Classes base de campos de texto/select. */
export const fieldControl = cx(
  'w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink placeholder:text-muted/70',
  'transition-colors hover:border-muted/50 disabled:cursor-not-allowed disabled:opacity-60',
  'focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/30',
  'aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/30',
);
