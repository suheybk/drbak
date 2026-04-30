/**
 * DoctorDayLock — one Durable Object instance per `(doctorId, dateYYYYMMDD)`.
 * Single-threaded by definition: enforces "at most one active hold AND at most one
 * confirmed appointment per (doctorId, startsAt)".
 *
 * Persistent storage layout (DO storage):
 *   - `hold:{startsAtMs}`     → { token, serviceId, expiresAtMs, createdAtMs }
 *   - `booked:{startsAtMs}`   → { appointmentId, endsAtMs, confirmedAtMs }
 *   - `meta`                  → { doctorId, date, lastReap }
 *
 * RPC surface (called from `SlotLockClient` adapter):
 *   POST /hold      { startsAtMs, durationMinutes, ttlSeconds, serviceId, nowMs }
 *   POST /confirm   { token, appointmentId, startsAtMs, endsAtMs, nowMs }
 *   POST /release   { token, startsAtMs }
 *   GET  /day       returns the day's projection (booked + active holds)
 *
 * Key invariants enforced:
 *   1. A confirmed slot blocks any subsequent hold/confirm at the same startsAt.
 *   2. A live hold blocks a parallel hold for the same startsAt.
 *   3. Expired holds are reaped lazily on every read AND eagerly via alarm.
 *   4. Confirmed slots persist forever in this DO (the source of truth for the day).
 */

import type {
  DurableObjectState,
  DurableObjectStorage,
  ExportedHandler,
} from '@cloudflare/workers-types';
import { ulid } from 'ulid';
import type { Env } from '../../interfaces/workers/env.js';

interface HoldRecord {
  token: string;
  serviceId: string;
  expiresAtMs: number;
  createdAtMs: number;
}

interface BookedRecord {
  appointmentId: string;
  endsAtMs: number;
  confirmedAtMs: number;
}

interface DayMeta {
  doctorId: string;
  date: string; // YYYY-MM-DD
  lastReapMs: number;
}

const HOLD_PREFIX = 'hold:';
const BOOKED_PREFIX = 'booked:';
const META_KEY = 'meta';

export class DoctorDayLock {
  constructor(
    private readonly state: DurableObjectState,
    private readonly _env: Env,
  ) {
    void _env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    try {
      switch (`${request.method} ${url.pathname}`) {
        case 'POST /hold':
          return this.json(await this.handleHold(await request.json()));
        case 'POST /confirm':
          return this.json(await this.handleConfirm(await request.json()));
        case 'POST /release':
          return this.json(await this.handleRelease(await request.json()));
        case 'POST /release-booking':
          return this.json(await this.handleReleaseBooking(await request.json()));
        case 'GET /day':
          return this.json(await this.handleDayProjection());
        case 'POST /init':
          return this.json(await this.handleInit(await request.json()));
        default:
          return new Response('not found', { status: 404 });
      }
    } catch (e) {
      // Never leak internals — log and return generic
      console.error('DoctorDayLock error', e);
      return new Response(JSON.stringify({ error: 'internal' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
  }

  /** Cron-style cleanup; called via alarm. */
  async alarm(): Promise<void> {
    await this.reapExpiredHolds(Date.now());
    // Re-arm for next hour
    await this.state.storage.setAlarm(Date.now() + 60 * 60 * 1000);
  }

  // ─── Handlers ───────────────────────────────────────

  private async handleInit(input: { doctorId: string; date: string }): Promise<{ ok: true }> {
    const meta = (await this.state.storage.get<DayMeta>(META_KEY)) ?? null;
    if (!meta) {
      await this.state.storage.put<DayMeta>(META_KEY, {
        doctorId: input.doctorId,
        date: input.date,
        lastReapMs: Date.now(),
      });
      await this.state.storage.setAlarm(Date.now() + 60 * 60 * 1000);
    }
    return { ok: true };
  }

  private async handleHold(input: {
    startsAtMs: number;
    durationMinutes: number;
    ttlSeconds: number;
    serviceId: string;
    nowMs: number;
  }): Promise<{ token: string; expiresAtMs: number } | null> {
    await this.reapExpiredHolds(input.nowMs);

    if (await this.state.storage.get<BookedRecord>(`${BOOKED_PREFIX}${input.startsAtMs}`)) {
      return null;
    }
    const existing = await this.state.storage.get<HoldRecord>(`${HOLD_PREFIX}${input.startsAtMs}`);
    if (existing && existing.expiresAtMs > input.nowMs) {
      return null;
    }
    const token = ulid();
    const expiresAtMs = input.nowMs + input.ttlSeconds * 1000;
    const record: HoldRecord = {
      token,
      serviceId: input.serviceId,
      expiresAtMs,
      createdAtMs: input.nowMs,
    };
    await this.state.storage.put<HoldRecord>(`${HOLD_PREFIX}${input.startsAtMs}`, record);
    return { token, expiresAtMs };
  }

  private async handleConfirm(input: {
    token: string;
    appointmentId: string;
    startsAtMs: number;
    endsAtMs: number;
    nowMs: number;
  }): Promise<'confirmed' | 'hold_expired' | 'hold_invalid' | 'slot_taken'> {
    if (await this.state.storage.get<BookedRecord>(`${BOOKED_PREFIX}${input.startsAtMs}`)) {
      return 'slot_taken';
    }
    const hold = await this.state.storage.get<HoldRecord>(`${HOLD_PREFIX}${input.startsAtMs}`);
    if (!hold || hold.token !== input.token) return 'hold_invalid';
    if (hold.expiresAtMs <= input.nowMs) {
      await this.state.storage.delete(`${HOLD_PREFIX}${input.startsAtMs}`);
      return 'hold_expired';
    }

    // Promote: atomic delete-hold + put-booked using a transaction
    await this.state.storage.transaction(async (tx) => {
      await tx.delete(`${HOLD_PREFIX}${input.startsAtMs}`);
      await tx.put<BookedRecord>(`${BOOKED_PREFIX}${input.startsAtMs}`, {
        appointmentId: input.appointmentId,
        endsAtMs: input.endsAtMs,
        confirmedAtMs: input.nowMs,
      });
    });
    return 'confirmed';
  }

  private async handleRelease(input: {
    token: string;
    startsAtMs: number;
  }): Promise<{ ok: true }> {
    const hold = await this.state.storage.get<HoldRecord>(`${HOLD_PREFIX}${input.startsAtMs}`);
    if (hold && hold.token === input.token) {
      await this.state.storage.delete(`${HOLD_PREFIX}${input.startsAtMs}`);
    }
    return { ok: true };
  }

  /**
   * Free a confirmed slot. Idempotent: missing record or appointment-id
   * mismatch returns no-op rather than failing — by the time this is
   * called, the patient has already seen the cancellation in the API
   * response, so any error here would be invisible.
   */
  private async handleReleaseBooking(input: {
    startsAtMs: number;
    appointmentId: string;
  }): Promise<{ ok: true; released: boolean }> {
    const booked = await this.state.storage.get<BookedRecord>(
      `${BOOKED_PREFIX}${input.startsAtMs}`,
    );
    if (!booked) return { ok: true, released: false };
    if (booked.appointmentId !== input.appointmentId) {
      return { ok: true, released: false };
    }
    await this.state.storage.delete(`${BOOKED_PREFIX}${input.startsAtMs}`);
    return { ok: true, released: true };
  }

  private async handleDayProjection(): Promise<{
    booked: Array<{ startsAtMs: number; endsAtMs: number; appointmentId: string }>;
    activeHolds: Array<{ startsAtMs: number; expiresAtMs: number }>;
  }> {
    const now = Date.now();
    await this.reapExpiredHolds(now);
    const booked: Array<{ startsAtMs: number; endsAtMs: number; appointmentId: string }> = [];
    const activeHolds: Array<{ startsAtMs: number; expiresAtMs: number }> = [];
    const items = await this.state.storage.list();
    for (const [k, v] of items) {
      if (k.startsWith(BOOKED_PREFIX)) {
        const record = v as BookedRecord;
        booked.push({
          startsAtMs: Number(k.slice(BOOKED_PREFIX.length)),
          endsAtMs: record.endsAtMs,
          appointmentId: record.appointmentId,
        });
      } else if (k.startsWith(HOLD_PREFIX)) {
        const record = v as HoldRecord;
        if (record.expiresAtMs > now) {
          activeHolds.push({
            startsAtMs: Number(k.slice(HOLD_PREFIX.length)),
            expiresAtMs: record.expiresAtMs,
          });
        }
      }
    }
    return { booked, activeHolds };
  }

  private async reapExpiredHolds(nowMs: number): Promise<void> {
    const items = await this.state.storage.list({ prefix: HOLD_PREFIX });
    const toDelete: string[] = [];
    for (const [k, v] of items) {
      const record = v as HoldRecord;
      if (record.expiresAtMs <= nowMs) toDelete.push(k);
    }
    if (toDelete.length > 0) {
      // Storage delete accepts an array
      await this.deleteAll(this.state.storage, toDelete);
    }
  }

  private async deleteAll(storage: DurableObjectStorage, keys: string[]): Promise<void> {
    // DO storage delete supports up to 128 keys per call
    const chunkSize = 128;
    for (let i = 0; i < keys.length; i += chunkSize) {
      await storage.delete(keys.slice(i, i + chunkSize));
    }
  }

  private json(body: unknown): Response {
    return new Response(JSON.stringify(body), {
      headers: { 'content-type': 'application/json' },
    });
  }
}

// Type re-export for the workers runtime
export type DoctorDayLockExport = ExportedHandler;
