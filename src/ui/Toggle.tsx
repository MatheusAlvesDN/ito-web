// Toggle: interruptor (role="switch"); com `label` vira uma linha clicável inteira.
import { useId, type ReactNode } from 'react';
import { cx, focusRing } from './styles';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  /** Obrigatório quando não há `label` visível. */
  'aria-label'?: string;
  className?: string;
}

export function Toggle({ checked, onChange, label, description, disabled, className, ...aria }: ToggleProps) {
  const id = useId();
  const sw = (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={aria['aria-label']}
      aria-labelledby={label ? `${id}-label` : undefined}
      aria-describedby={description ? `${id}-desc` : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        focusRing,
        checked ? 'border-brand bg-brand' : 'border-line bg-surface-2',
      )}
    >
      <span
        aria-hidden
        className={cx(
          'inline-block h-5 w-5 rounded-full shadow transition-transform',
          checked ? 'translate-x-[22px] bg-brand-ink' : 'translate-x-[3px] bg-muted',
        )}
      />
    </button>
  );
  if (!label) return <span className={className}>{sw}</span>;
  return (
    <div className={cx('flex items-start justify-between gap-4', className)}>
      <label htmlFor={id} className={cx('min-w-0 flex-1', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}>
        <span id={`${id}-label`} className="block text-sm font-semibold text-ink">
          {label}
        </span>
        {description && (
          <span id={`${id}-desc`} className="mt-0.5 block text-xs leading-relaxed text-muted">
            {description}
          </span>
        )}
      </label>
      {sw}
    </div>
  );
}
