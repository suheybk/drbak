export type AppointmentStatus =
  | 'created'
  | 'confirmed'
  | 'rescheduled'
  | 'cancelled_by_patient'
  | 'cancelled_by_clinic'
  | 'late_cancellation'
  | 'no_show'
  | 'completed';

export const TERMINAL_STATUSES: ReadonlySet<AppointmentStatus> = new Set([
  'cancelled_by_patient',
  'cancelled_by_clinic',
  'late_cancellation',
  'no_show',
  'completed',
]);

export const isTerminal = (s: AppointmentStatus): boolean => TERMINAL_STATUSES.has(s);

/**
 * Allowed transitions. Anything not listed is forbidden.
 */
const ALLOWED: Record<AppointmentStatus, ReadonlyArray<AppointmentStatus>> = {
  created: ['confirmed', 'cancelled_by_patient', 'cancelled_by_clinic'],
  confirmed: [
    'rescheduled',
    'cancelled_by_patient',
    'cancelled_by_clinic',
    'late_cancellation',
    'no_show',
    'completed',
  ],
  rescheduled: ['confirmed'],
  cancelled_by_patient: [],
  cancelled_by_clinic: [],
  late_cancellation: [],
  no_show: [],
  completed: [],
};

export const canTransition = (from: AppointmentStatus, to: AppointmentStatus): boolean =>
  ALLOWED[from].includes(to);
