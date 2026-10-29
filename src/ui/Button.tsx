// Button: botão da marca (primary/secondary/ghost/danger); vira <Link> quando recebe `to`.
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Spinner } from './Spinner';
import { buttonClasses, cx, type ButtonSize, type ButtonVariant } from './styles';

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Mostra spinner e desabilita o botão. */
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export type ButtonAsButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & { to?: undefined };
export type ButtonAsLinkProps = CommonProps & Omit<LinkProps, 'className' | 'children'>;
export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

export function Button(props: ButtonProps) {
  const { variant, size, fullWidth, loading, leftIcon, rightIcon, className, children, ...rest } = props;
  const classes = cx(buttonClasses({ variant, size, fullWidth }), className);
  const content = (
    <>
      {loading ? <Spinner size="sm" label="Aguarde…" /> : leftIcon}
      {children != null && <span className="truncate">{children}</span>}
      {!loading && rightIcon}
    </>
  );

  if ('to' in rest && rest.to != null) {
    return (
      <Link {...(rest as LinkProps)} className={classes} aria-disabled={loading || undefined}>
        {content}
      </Link>
    );
  }
  const { type = 'button', disabled, ...buttonRest } = rest as ButtonAsButtonProps;
  return (
    <button
      {...buttonRest}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
    >
      {content}
    </button>
  );
}
