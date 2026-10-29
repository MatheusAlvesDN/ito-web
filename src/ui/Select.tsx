// Select: <select> nativo estilizado (bom no celular) com rótulo/dica/erro.
import type { ReactNode, SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { Field } from './Field';
import { cx, fieldControl } from './styles';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  hideLabel?: boolean;
  /** Alternativa a passar <option> como children. */
  options?: SelectOption[];
  wrapperClassName?: string;
}

export function Select({ label, hint, error, hideLabel, options, wrapperClassName, className, id, children, ...rest }: SelectProps) {
  return (
    <Field label={label} hint={hint} error={error} hideLabel={hideLabel} id={id} className={wrapperClassName}>
      {(a11y) => (
        <div className="relative">
          <select {...a11y} {...rest} className={cx(fieldControl, 'h-11 cursor-pointer appearance-none pr-10', className)}>
            {options?.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.label}
              </option>
            ))}
            {children}
          </select>
          <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        </div>
      )}
    </Field>
  );
}
