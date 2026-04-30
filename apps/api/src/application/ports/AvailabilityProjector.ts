/**
 * Read-side service for computing a doctor's slots on a given date.
 *
 * Combines:
 *   - slot_templates  (recurring rules)
 *   - slot_blackouts  (suppress)
 *   - slot_overrides  (one-off additions)
 *   - DO day projection (what's already held / booked)
 *
 * Returns a flat list of slots with availability status. Caller filters/sorts.
 */

import type { DeliveryMode } from '../../domain/appointment/Appointment.js';
import type { DoctorId, ServiceId } from '../../domain/shared/ids.js';
import type { Instant } from '../../domain/shared/time.js';

export interface ProjectedSlot {
  readonly startsAt: Instant;
  readonly endsAt: Instant;
  readonly available: boolean;
  readonly reason?: 'booked' | 'held' | 'blackout' | 'past' | 'over_capacity';
}

export interface AvailabilityProjector {
  forDay(input: {
    doctorId: DoctorId;
    serviceId: ServiceId;
    deliveryMode: DeliveryMode;
    dateYmd: string; // YYYY-MM-DD in clinic tz
    now: Instant;
  }): Promise<ReadonlyArray<ProjectedSlot>>;
}
