import clsx from 'clsx';
import { type InputHTMLAttributes, type ReactNode, useId } from 'react';

export type CheckboxProps = {
  label: ReactNode;
  invalid?: boolean;
  description?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const Checkbox = ({
  label,
  invalid = false,
  description,
  className,
  id,
  ...rest
}: CheckboxProps) => {
  const fallbackId = useId();
  const inputId = id ?? `cb-${fallbackId}`;
  const descId = description ? `${inputId}-desc` : undefined;
  return (
    <label
      className={clsx('drb-checkbox', { 'drb-checkbox--invalid': invalid }, className)}
      htmlFor={inputId}
    >
      <input
        id={inputId}
        type="checkbox"
        aria-invalid={invalid || undefined}
        aria-describedby={descId}
        {...rest}
      />
      <span className="drb-checkbox__label">
        <span>{label}</span>
        {description ? (
          <span id={descId} className="drb-checkbox__desc">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
};
