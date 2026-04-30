import clsx from 'clsx';

export type StepperProps = {
  steps: ReadonlyArray<{ id: string; label: string }>;
  currentStepId: string;
  /** ARIA label for the whole region. */
  label: string;
};

export const Stepper = ({ steps, currentStepId, label }: StepperProps) => {
  const currentIndex = Math.max(
    0,
    steps.findIndex((s) => s.id === currentStepId),
  );
  return (
    <nav aria-label={label} className="drb-stepper">
      <ol>
        {steps.map((s, i) => {
          const status = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'future';
          return (
            <li
              key={s.id}
              className={clsx('drb-stepper__step', `drb-stepper__step--${status}`)}
              aria-current={status === 'current' ? 'step' : undefined}
            >
              <span className="drb-stepper__index digit-western" dir="ltr">
                {i + 1}
              </span>
              <span className="drb-stepper__label">{s.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
