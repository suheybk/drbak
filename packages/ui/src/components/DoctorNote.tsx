import clsx from 'clsx';
import type { ReactNode } from 'react';

export type DoctorNoteProps = {
  /** First-party voice quote in the doctor's words. Per discovery §3 brand-pillar 2. */
  children: ReactNode;
  doctorName: string;
  doctorTitle?: string;
  /** Optional small-caps label, e.g. "Doktorun Notu" / "A note from the doctor". */
  label?: string;
  /** Photo URL (R2 public). Loaded `eager` because it sits above the fold often. */
  photoUrl?: string;
  className?: string;
};

/**
 * The DoctorNote is the brand's distinctive pull-quote pattern:
 * a first-party, calm, clinical voice that anchors clinical pages. The visual
 * design is meant to feel like a letter from the physician — Fraunces display,
 * a hairline rule, a stamp of the doctor's name.
 *
 * Avoid using on every page; reserve for condition + service pages and selected
 * blog posts. Heavier use breaks the "restrained" voice dial.
 */
export const DoctorNote = ({
  children,
  doctorName,
  doctorTitle,
  label,
  photoUrl,
  className,
}: DoctorNoteProps) => (
  <aside className={clsx('drb-doctor-note', className)} role="note" aria-label={label ?? 'Doctor note'}>
    {label ? <p className="drb-doctor-note__label">{label}</p> : null}
    <blockquote className="drb-doctor-note__quote">
      <div className="drb-doctor-note__body">{children}</div>
      <footer className="drb-doctor-note__attrib">
        {photoUrl ? (
          <img src={photoUrl} alt="" loading="lazy" decoding="async" className="drb-doctor-note__photo" />
        ) : null}
        <span>
          <span className="drb-doctor-note__name">{doctorName}</span>
          {doctorTitle ? <span className="drb-doctor-note__title">{doctorTitle}</span> : null}
        </span>
      </footer>
    </blockquote>
  </aside>
);
