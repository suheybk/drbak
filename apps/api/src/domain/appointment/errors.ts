import { DomainError, type DomainErrorCode } from '../shared/errors.js';
import type { CorrelationId } from '../shared/ids.js';

const make = (code: DomainErrorCode, message: string, httpStatus: number) =>
  class extends DomainError {
    constructor(opts: { correlationId?: CorrelationId; details?: Record<string, unknown> } = {}) {
      super({ code, message, httpStatus, ...opts });
    }
  };

export const SlotNotFound = make('SLOT_NOT_FOUND', 'The selected slot does not exist.', 404);
export const SlotConflict = make(
  'SLOT_CONFLICT',
  'The selected slot was just booked by someone else.',
  409,
);
export const SlotInPast = make('SLOT_IN_PAST', 'The selected slot is in the past.', 400);
export const SlotHoldExpired = make(
  'SLOT_HOLD_EXPIRED',
  'Your slot reservation has expired. Please pick a new time.',
  410,
);
export const TmsScreeningRequired = make(
  'TMS_SCREENING_REQUIRED',
  'TMS appointments require a recent screening questionnaire.',
  409,
);
export const TmsScreeningDenied = make(
  'TMS_SCREENING_DENIED',
  'Based on your screening responses, TMS is not recommended at this time.',
  403,
);
export const ConsentMissing = make(
  'CONSENT_MISSING',
  'Required consent has not been granted.',
  403,
);
export const GuardianRequired = make(
  'GUARDIAN_REQUIRED',
  'Pediatric appointments require a verified guardian on file.',
  403,
);
export const RescheduleWindowPassed = make(
  'RESCHEDULE_WINDOW_PASSED',
  'Reschedule window has passed. Please contact the clinic.',
  409,
);
export const CancelWindowPassed = make(
  'CANCEL_WINDOW_PASSED',
  'Late cancellation. The appointment will be marked accordingly.',
  200, // not really an error — informational; surfaced via warning channel
);
export const AppointmentNotFound = make('APPOINTMENT_NOT_FOUND', 'Appointment not found.', 404);
export const AppointmentTerminal = make(
  'APPOINTMENT_TERMINAL',
  'This appointment is in a final state and cannot be modified.',
  409,
);
export const IdempotencyConflict = make(
  'IDEMPOTENCY_CONFLICT',
  'A different request was already processed with this idempotency key.',
  409,
);
