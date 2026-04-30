import clsx from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
    type?: 'button' | 'submit' | 'reset';
  };

export const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leadingIcon,
  trailingIcon,
  type = 'button',
  className,
  disabled,
  children,
  ...rest
}: ButtonProps) => {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx('drb-btn', `drb-btn--${variant}`, `drb-btn--${size}`, {
        'drb-btn--full': fullWidth,
        'drb-btn--loading': loading,
      }, className)}
      {...rest}
    >
      {leadingIcon ? <span className="drb-btn__icon">{leadingIcon}</span> : null}
      <span className="drb-btn__label">{children}</span>
      {trailingIcon ? <span className="drb-btn__icon">{trailingIcon}</span> : null}
    </button>
  );
};
