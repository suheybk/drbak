import type { AvailabilityProjector } from '../../ports/AvailabilityProjector.js';
import type { Clock } from '../../ports/index.js';
import type { DeliveryMode } from '../../../domain/appointment/Appointment.js';
import type { DoctorId, ServiceId } from '../../../domain/shared/ids.js';
import { instantToIso } from '../../../domain/shared/time.js';

export interface ListAvailabilityDeps {
  readonly projector: AvailabilityProjector;
  readonly clock: Clock;
  readonly env: { DEFAULT_DOCTOR_ID: DoctorId };
}

export interface ListAvailabilityInput {
  readonly serviceId: ServiceId;
  readonly dateYmd: string;
  readonly deliveryMode: DeliveryMode;
}

export const listAvailability =
  (deps: ListAvailabilityDeps) =>
  async (input: ListAvailabilityInput) => {
    const slots = await deps.projector.forDay({
      doctorId: deps.env.DEFAULT_DOCTOR_ID,
      serviceId: input.serviceId,
      deliveryMode: input.deliveryMode,
      dateYmd: input.dateYmd,
      now: deps.clock.now(),
    });
    return {
      date: input.dateYmd,
      serviceId: input.serviceId,
      slots: slots.map((s) => ({
        id: `${deps.env.DEFAULT_DOCTOR_ID}:${s.startsAt as number}`,
        startsAt: instantToIso(s.startsAt),
        endsAt: instantToIso(s.endsAt),
        available: s.available,
        reason: s.reason,
      })),
    };
  };
