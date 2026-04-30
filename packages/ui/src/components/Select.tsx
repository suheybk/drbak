import clsx from 'clsx';
import type { SelectHTMLAttributes } from 'react';

export type SelectProps = {
  invalid?: boolean;
} & SelectHTMLAttributes<HTMLSelectElement>;

export const Select = ({ invalid = false, className, children, ...rest }: SelectProps) => (
  <div className="drb-select">
    <select
      aria-invalid={invalid || undefined}
      className={clsx('drb-select__field', { 'drb-select__field--invalid': invalid }, className)}
      {...rest}
    >
      {children}
    </select>
    <span className="drb-select__chevron" aria-hidden="true">
      ▾
    </span>
  </div>
);
