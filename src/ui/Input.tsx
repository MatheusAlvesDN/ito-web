// Input e TextArea: campos de texto com rótulo/dica/erro embutidos (via Field).
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { Field } from './Field';
import { cx, fieldControl } from './styles';

interface FieldBits {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  hideLabel?: boolean;
  /** Classe do wrapper (o className vai para o controle). */
  wrapperClassName?: string;
}

export type InputProps = FieldBits & InputHTMLAttributes<HTMLInputElement>;

export function Input({ label, hint, error, hideLabel, wrapperClassName, className, id, ...rest }: InputProps) {
  return (
    <Field label={label} hint={hint} error={error} hideLabel={hideLabel} id={id} className={wrapperClassName}>
      {(a11y) => <input {...a11y} {...rest} className={cx(fieldControl, 'h-11', className)} />}
    </Field>
  );
}

export type TextAreaProps = FieldBits & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextArea({ label, hint, error, hideLabel, wrapperClassName, className, id, rows = 4, ...rest }: TextAreaProps) {
  return (
    <Field label={label} hint={hint} error={error} hideLabel={hideLabel} id={id} className={wrapperClassName}>
      {(a11y) => (
        <textarea {...a11y} rows={rows} {...rest} className={cx(fieldControl, 'resize-none py-2.5 leading-relaxed', className)} />
      )}
    </Field>
  );
}
