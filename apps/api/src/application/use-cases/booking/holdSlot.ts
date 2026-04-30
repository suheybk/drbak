import type {
  Clock,
  ServiceCatalogue,
  SlotLockService,
} from '../../ports/index.js';
import {
  type DoctorId,
  type ServiceId,
} from '../../../domain/shared/ids.js';
import { DomainError, err, ok, type Result } from '../../../domain/shared/errors.js';
import { addMinutes, durationMinutes, type Instant, instantFromIso } from '../../../domain/shared/time.js';
import { SlotConflict, SlotInPast, SlotNotFound } from '../../../domain/appointment/errors.js';

export interface HoldSlotDeps {
  readonly clock: Clock;
  readonly services: ServiceCatalogue;
  readonly slotLock: SlotLockService;
  readonly env: { DEFAULT_DOCTOR_ID: DoctorId; SLOT_HOLD_TTL_SECONDS: number };
}

export interface HoldSlotUseCaseInput {
  readonly serviceId: ServiceId;
  readonly startsAtIso: string;
  readonly deliveryMode: 'in_person' | 'home_visit' | 'telehealth';
}

export const holdSlot =
  (deps: HoldSlotDeps) =>
  async (input: HoldSlotUseCaseInput): Promise<Result<{ holdToken: string; expiresAtIso: string }, DomainError>> => {
    const now = deps.clock.now();
    const service = await deps.services.findById(input.serviceId);
    if (!service) return err(new SlotNotFound());
    if (!service.deliveryModes.includes(input.deliveryMode)) {
      return err(
        new DomainError({
          code: 'CONFLICT',
          message: 'Service is not offered in the chosen delivery mode.',
          httpStatus: 409,
        }),
      );
    }
    const startsAt = instantFromIso(input.startsAtIso);
    if ((startsAt as number) <= (now as number)) return err(new SlotInPast());

    const endsAt = addMinutes(startsAt, durationMinutes(service.durationMinutes));
    const result = await deps.slotLock.holdSlot({
      doctorId: deps.env.DEFAULT_DOCTOR_ID,
      serviceId: input.serviceId,
      startsAt,
      endsAt,
      holdTtlSeconds: deps.env.SLOT_HOLD_TTL_SECONDS,
      now,
    });
    if (!result) return err(new SlotConflict());
    return ok({
      holdToken: result.token,
      expiresAtIso: new Date(result.expiresAt as number).toISOString(),
    });
  };
