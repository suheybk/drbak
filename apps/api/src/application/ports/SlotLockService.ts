/**
 * Slot-locking abstraction. Implemented in production by a Cloudflare Durable Object
 * (`infrastructure/do/DoctorDayLock.ts`); in tests by an in-memory adapter.
 *
 * Contract:
 *   - `holdSlot` returns a token if the slot is currently free; null otherwise.
 *     Holds expire after `holdTtlSeconds` (config). Each `(doctorId, startsAt)` may have
 *     at most one active hold AND at most one confirmed appointment.
 *   - `confirmAppointment` atomically converts an active hold into a confirmed slot.
 *     Returns 'confirmed' on success, 'hold_expired' if the hold has expired,
 *     'hold_invalid' if the token is unknown or for a different appointment,
 *     'slot_taken' if some other writer raced past us.
 *   - `releaseHold` cancels a hold without confirming.
 *   - `releaseBooking` frees a confirmed slot back to available — used by
 *     `cancelAppointment`. The hold flow has its own release; a confirmed
 *     booking needs its own undo because the booked record persists in the
 *     DO independently of any active hold.
 */

import type { AppointmentId, DoctorId, ServiceId, SlotHoldToken } from '../../domain/shared/ids.js';
import type { Instant } from '../../domain/shared/time.js';

export interface HoldSlotInput {
  readonly doctorId: DoctorId;
  readonly serviceId: ServiceId;
  readonly startsAt: Instant;
  readonly endsAt: Instant;
  readonly holdTtlSeconds: number;
  readonly now: Instant;
}

export interface HoldSlotResult {
  readonly token: SlotHoldToken;
  readonly expiresAt: Instant;
}

export type ConfirmResult = 'confirmed' | 'hold_expired' | 'hold_invalid' | 'slot_taken';

export interface SlotLockService {
  holdSlot(input: HoldSlotInput): Promise<HoldSlotResult | null>;
  confirmAppointment(input: {
    token: SlotHoldToken;
    appointmentId: AppointmentId;
    doctorId: DoctorId;
    startsAt: Instant;
    endsAt: Instant;
    now: Instant;
  }): Promise<ConfirmResult>;
  releaseHold(input: { token: SlotHoldToken; doctorId: DoctorId; startsAt: Instant }): Promise<void>;
  releaseBooking(input: {
    doctorId: DoctorId;
    startsAt: Instant;
    appointmentId: AppointmentId;
  }): Promise<void>;
}
