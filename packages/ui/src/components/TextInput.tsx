import clsx from 'clsx';
import type { InputHTMLAttributes } from 'react';

export type TextInputProps = {
  invalid?: boolean;
} & InputHTMLAttributes<HTMLInputElement>;

export const TextInput = ({
  invalid = false,
  className,
  type = 'text',
  ...rest
}: TextInputProps) => (
  <input
    type={type}
    aria-invalid={invalid || undefined}
    className={clsx('drb-input', { 'drb-input--invalid': invalid }, className)}
    {...rest}
  />
);
