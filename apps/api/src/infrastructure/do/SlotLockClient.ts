/**
 * Adapter that talks to the DoctorDayLock Durable Object.
 *
 * The DO is keyed by `(doctorId, dateYYYYMMDD)` — we derive the date from `startsAt`
 * in the *clinic* timezone (Europe/Istanbul) so a 23:30 slot is the same day as the
 * 09:00 slots that morning.
 */

import type { DurableObjectNamespace } from '@cloudflare/workers-types';
import type {
  ConfirmResult,
  HoldSlotInput,
  HoldSlotResult,
  SlotLockService,
} from '../../application/ports/index.js';
import type { AppointmentId, DoctorId, SlotHoldToken } from '../../domain/shared/ids.js';
import { asSlotHoldToken } from '../../domain/shared/ids.js';
import { type Instant, instantFromMillis } from '../../domain/shared/time.js';

const TZ_OFFSET_MIN_ISTANBUL = 180; // UTC+3 — Türkiye does not observe DST since 2016

const localDate = (i: Instant): string => {
  const local = new Date((i as number) + TZ_OFFSET_MIN_ISTANBUL * 60_000);
  const yyyy = local.getUTCFullYear();
  const mm = String(local.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(local.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const stubFor = (ns: DurableObjectNamespace, doctorId: DoctorId, startsAt: Instant) => {
  const key = `${doctorId}::${localDate(startsAt)}`;
  return ns.get(ns.idFromName(key));
};

export class SlotLockClient implements SlotLockService {
  constructor(private readonly ns: DurableObjectNamespace) {}

  async holdSlot(input: HoldSlotInput): Promise<HoldSlotResult | null> {
    const stub = stubFor(this.ns, input.doctorId, input.startsAt);
    // Init day on first contact (idempotent)
    await stub.fetch(
      new Request('https://do/init', {
        method: 'POST',
        body: JSON.stringify({
          doctorId: input.doctorId,
          date: localDate(input.startsAt),
        }),
      }),
    );
    const res = await stub.fetch(
      new Request('https://do/hold', {
        method: 'POST',
        body: JSON.stringify({
          startsAtMs: input.startsAt as number,
          durationMinutes: Math.round(
            ((input.endsAt as number) - (input.startsAt as number)) / 60_000,
          ),
          ttlSeconds: input.holdTtlSeconds,
          serviceId: input.serviceId,
          nowMs: input.now as number,
        }),
      }),
    );
    if (!res.ok) throw new Error(`DO hold failed: ${res.status}`);
    const body = (await res.json()) as { token: string; expiresAtMs: number } | null;
    if (!body) return null;
    return {
      token: asSlotHoldToken(body.token),
      expiresAt: instantFromMillis(body.expiresAtMs),
    };
  }

  async confirmAppointment(input: {
    token: SlotHoldToken;
    appointmentId: AppointmentId;
    doctorId: DoctorId;
    startsAt: Instant;
    endsAt: Instant;
    now: Instant;
  }): Promise<ConfirmResult> {
    const stub = stubFor(this.ns, input.doctorId, input.startsAt);
    const res = await stub.fetch(
      new Request('https://do/confirm', {
        method: 'POST',
        body: JSON.stringify({
          token: input.token,
          appointmentId: input.appointmentId,
          startsAtMs: input.startsAt as number,
          endsAtMs: input.endsAt as number,
          nowMs: input.now as number,
        }),
      }),
    );
    if (!res.ok) throw new Error(`DO confirm failed: ${res.status}`);
    const body = (await res.json()) as ConfirmResult;
    return body;
  }

  async releaseHold(input: {
    token: SlotHoldToken;
    doctorId: DoctorId;
    startsAt: Instant;
  }): Promise<void> {
    const stub = stubFor(this.ns, input.doctorId, input.startsAt);
    await stub.fetch(
      new Request('https://do/release', {
        method: 'POST',
        body: JSON.stringify({
          token: input.token,
          startsAtMs: input.startsAt as number,
        }),
      }),
    );
  }

  async releaseBooking(input: {
    doctorId: DoctorId;
    startsAt: Instant;
    appointmentId: AppointmentId;
  }): Promise<void> {
    const stub = stubFor(this.ns, input.doctorId, input.startsAt);
    await stub.fetch(
      new Request('https://do/release-booking', {
        method: 'POST',
        body: JSON.stringify({
          startsAtMs: input.startsAt as number,
          appointmentId: input.appointmentId,
        }),
      }),
    );
  }

  async dayProjection(doctorId: DoctorId, anyInstantInDay: Instant) {
    const stub = stubFor(this.ns, doctorId, anyInstantInDay);
    const res = await stub.fetch(new Request('https://do/day', { method: 'GET' }));
    return res.json() as Promise<{
      booked: Array<{ startsAtMs: number; endsAtMs: number; appointmentId: string }>;
      activeHolds: Array<{ startsAtMs: number; expiresAtMs: number }>;
    }>;
  }
}
