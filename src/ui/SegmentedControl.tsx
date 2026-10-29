// SegmentedControl: escolha única entre poucas opções (radiogroup com setas do teclado).
import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cx, focusRing } from './styles';

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  'aria-label': string;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string>({ options, value, onChange, size = 'md', fullWidth = true, className, ...aria }: SegmentedControlProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const enabled = options.filter((o) => !o.disabled);

  const onKeyDown = (e: KeyboardEvent) => {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!dir || enabled.length === 0) return;
    e.preventDefault();
    const idx = enabled.findIndex((o) => o.value === value);
    const next = enabled[(idx + dir + enabled.length) % enabled.length];
    onChange(next.value);
    refs.current[options.indexOf(next)]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={aria['aria-label']}
      onKeyDown={onKeyDown}
      className={cx('inline-flex gap-1 rounded-2xl border border-line bg-surface-2 p-1', fullWidth && 'flex w-full', className)}
    >
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cx(
              'inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl font-display font-semibold transition-colors disabled:opacity-40 [&_svg]:h-4 [&_svg]:w-4',
              size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-10 px-3 text-sm',
              focusRing,
              active ? 'bg-surface text-ink shadow-raised' : 'text-muted hover:text-ink',
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
