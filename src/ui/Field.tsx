// Field: rótulo + controle + dica + erro, com ids de acessibilidade já ligados.
import { useId, type ReactNode } from 'react';
import { cx } from './styles';

export interface FieldA11y {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
}

export interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** id do controle; gerado se omitido. */
  id?: string;
  /** Esconde o rótulo visualmente (continua para leitores de tela). */
  hideLabel?: boolean;
  className?: string;
  /** Recebe as props de acessibilidade para espalhar no controle. */
  children: (a11y: FieldA11y) => ReactNode;
}

export function Field({ label, hint, error, id, hideLabel, className, children }: FieldProps) {
  const auto = useId();
  const controlId = id ?? auto;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {label != null && (
        <label htmlFor={controlId} className={cx('text-sm font-semibold text-ink', hideLabel && 'sr-only')}>
          {label}
        </label>
      )}
      {children({ id: controlId, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
      {hint && error && (
        <p id={hintId} className="sr-only">
          {hint}
        </p>
      )}
    </div>
  );
}
