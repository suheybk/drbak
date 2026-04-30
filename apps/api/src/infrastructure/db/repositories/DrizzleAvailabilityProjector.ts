import { and, eq, gte, lte } from 'drizzle-orm';
import type {
  AvailabilityProjector,
  ProjectedSlot,
} from '../../../application/ports/AvailabilityProjector.js';
import type { DeliveryMode } from '../../../domain/appointment/Appointment.js';
import type { DoctorId, ServiceId } from '../../../domain/shared/ids.js';
import {
  addMinutes,
  durationMinutes,
  type Instant,
  instantFromMillis,
  isBefore,
} from '../../../domain/shared/time.js';
import type { Db } from '../client.js';
import { services, slotBlackouts, slotOverrides, slotTemplates } from '../schema.js';
import type { SlotLockClient } from '../../do/SlotLockClient.js';

const TZ_OFFSET_MIN = 180; // Europe/Istanbul

/** Convert "YYYY-MM-DD HH:MM" Istanbul-local → UTC Instant. */
const localToInstant = (ymd: string, hhmm: string): Instant => {
  const [y, mo, d] = ymd.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  const utcMs = Date.UTC(y!, (mo ?? 1) - 1, d ?? 1, h ?? 0, mi ?? 0) - TZ_OFFSET_MIN * 60_000;
  return instantFromMillis(utcMs);
};

const isoDayOfWeek = (ymd: string): number => {
  const [y, mo, d] = ymd.split('-').map(Number);
  const dow = new Date(Date.UTC(y!, (mo ?? 1) - 1, d ?? 1)).getUTCDay();
  return dow === 0 ? 7 : dow; // ISO: Monday=1..Sunday=7
};

export class DrizzleAvailabilityProjector implements AvailabilityProjector {
  constructor(
    private readonly db: Db,
    private readonly slotLock: SlotLockClient,
  ) {}

  async forDay(input: {
    doctorId: DoctorId;
    serviceId: ServiceId;
    deliveryMode: DeliveryMode;
    dateYmd: string;
    now: Instant;
  }): Promise<ReadonlyArray<ProjectedSlot>> {
    const svcRows = await this.db
      .select()
      .from(services)
      .where(eq(services.id, input.serviceId))
      .limit(1);
    const svc = svcRows[0];
    if (!svc) return [];
    if (!(svc.deliveryModes as DeliveryMode[]).includes(input.deliveryMode)) return [];

    const dayStart = localToInstant(input.dateYmd, '00:00');
    const dayEnd = instantFromMillis((dayStart as number) + 24 * 3600_000);

    const dow = isoDayOfWeek(input.dateYmd);

    // Templates active on this day-of-week and date range
    const templates = await this.db
      .select()
      .from(slotTemplates)
      .where(
        and(
          eq(slotTemplates.doctorId, input.doctorId),
          eq(slotTemplates.serviceId, input.serviceId),
          eq(slotTemplates.active, true),
          lte(slotTemplates.validFrom, input.dateYmd),
        ),
      );
    const tmplsForDay = templates.filter(
      (t) =>
        (t.daysOfWeek as number[]).includes(dow) &&
        (t.validUntil === null || (t.validUntil as string) >= input.dateYmd),
    );

    // Generate raw slots from templates
    const raw: ProjectedSlot[] = [];
    for (const t of tmplsForDay) {
      let cursor = localToInstant(input.dateYmd, t.startTime);
      const stop = localToInstant(input.dateYmd, t.endTime);
      while (isBefore(addMinutes(cursor, durationMinutes(t.slotDurationMinutes)), stop) ||
             addMinutes(cursor, durationMinutes(t.slotDurationMinutes)) === stop) {
        raw.push({
          startsAt: cursor,
          endsAt: addMinutes(cursor, durationMinutes(t.slotDurationMinutes)),
          available: true,
        });
        cursor = addMinutes(
          cursor,
          durationMinutes(t.slotDurationMinutes + t.bufferMinutes),
        );
      }
    }

    // Add explicit overrides
    const overrides = await this.db
      .select()
      .from(slotOverrides)
      .where(
        and(
          eq(slotOverrides.doctorId, input.doctorId),
          eq(slotOverrides.serviceId, input.serviceId),
          eq(slotOverrides.active, true),
          gte(slotOverrides.startsAt, new Date(dayStart as number)),
          lte(slotOverrides.startsAt, new Date(dayEnd as number)),
        ),
      );
    for (const o of overrides) {
      const startsAt = instantFromMillis(o.startsAt.getTime());
      raw.push({
        startsAt,
        endsAt: addMinutes(startsAt, durationMinutes(o.durationMinutes)),
        available: true,
      });
    }

    // Apply blackouts
    const blackouts = await this.db
      .select()
      .from(slotBlackouts)
      .where(
        and(
          eq(slotBlackouts.doctorId, input.doctorId),
          lte(slotBlackouts.startsAt, new Date(dayEnd as number)),
          gte(slotBlackouts.endsAt, new Date(dayStart as number)),
        ),
      );
    const inBlackout = (s: Instant): boolean =>
      blackouts.some((b) =>
        (s as number) >= b.startsAt.getTime() && (s as number) < b.endsAt.getTime(),
      );

    // Pull DO projection for current bookings + holds
    const doDay = await this.slotLock.dayProjection(input.doctorId, dayStart);
    const bookedSet = new Set(doDay.booked.map((b) => b.startsAtMs));
    const heldSet = new Set(doDay.activeHolds.map((h) => h.startsAtMs));

    return raw
      .map((s) => {
        if (isBefore(s.startsAt, input.now)) return { ...s, available: false, reason: 'past' as const };
        if (inBlackout(s.startsAt)) return { ...s, available: false, reason: 'blackout' as const };
        if (bookedSet.has(s.startsAt as number)) return { ...s, available: false, reason: 'booked' as const };
        if (heldSet.has(s.startsAt as number)) return { ...s, available: false, reason: 'held' as const };
        return s;
      })
      .sort((a, b) => (a.startsAt as number) - (b.startsAt as number));
  }
}
