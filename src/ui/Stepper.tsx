// Stepper: escolher um número com botões − / + (limites min/max, passo).
import { Minus, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { IconButton } from './IconButton';
import { cx } from './styles';

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  /** Nome do valor (usado nos aria-labels e, se `showLabel`, visível). */
  label: string;
  showLabel?: boolean;
  min?: number;
  max?: number;
  step?: number;
  /** Formata o número exibido (ex.: v => `${v} rodadas`). */
  format?: (value: number) => ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Stepper({ value, onChange, label, showLabel, min = -Infinity, max = Infinity, step = 1, format, disabled, className }: StepperProps) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)));
  return (
    <div className={cx('flex items-center justify-between gap-3', className)} role="group" aria-label={label}>
      {showLabel && <span className="text-sm font-semibold text-ink">{label}</span>}
      <div className="flex items-center gap-1 rounded-2xl border border-line bg-surface p-1">
        <IconButton
          aria-label={`Diminuir ${label}`}
          icon={<Minus />}
          size="sm"
          onClick={() => set(value - step)}
          disabled={disabled || value - step < min}
        />
        <output aria-live="polite" className="min-w-[3ch] px-2 text-center font-display text-lg font-bold tabular-nums text-ink">
          {format ? format(value) : value}
        </output>
        <IconButton
          aria-label={`Aumentar ${label}`}
          icon={<Plus />}
          size="sm"
          onClick={() => set(value + step)}
          disabled={disabled || value + step > max}
        />
      </div>
    </div>
  );
}
