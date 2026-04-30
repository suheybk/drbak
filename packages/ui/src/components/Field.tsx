import clsx from 'clsx';
import { type ReactNode, useId } from 'react';

export type FieldProps = {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string | undefined;
  help?: string | undefined;
  children: (ids: { inputId: string; describedBy: string | undefined }) => ReactNode;
  className?: string;
};

export const Field = ({
  label,
  htmlFor,
  required = false,
  error,
  help,
  children,
  className,
}: FieldProps) => {
  const reactId = useId();
  const inputId = htmlFor ?? `field-${reactId}`;
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;
  const describedBy =
    [error ? errorId : null, help ? helpId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={clsx('drb-field', { 'drb-field--invalid': !!error }, className)}>
      <Label htmlFor={inputId} required={required}>
        {label}
      </Label>
      {children({ inputId, describedBy })}
      {help ? <HelpText id={helpId}>{help}</HelpText> : null}
      {error ? <ErrorText id={errorId}>{error}</ErrorText> : null}
    </div>
  );
};

export const Label = ({
  htmlFor,
  required,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
}) => (
  <label htmlFor={htmlFor} className="drb-field__label">
    {children}
    {required ? (
      <span className="drb-field__req" aria-hidden="true">
        {' '}
        *
      </span>
    ) : null}
  </label>
);

export const HelpText = ({ id, children }: { id: string; children: ReactNode }) => (
  <p id={id} className="drb-field__help">
    {children}
  </p>
);

export const ErrorText = ({ id, children }: { id: string; children: ReactNode }) => (
  <p id={id} role="alert" className="drb-field__error">
    {children}
  </p>
);
