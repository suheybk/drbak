/**
 * Cron handler — runs every 5 minutes. (Cron expression in wrangler.toml.)
 *
 * Strategy: enqueue reminder jobs at T-24h ± window AND T-1h ± window.
 * Window = 5 minutes (matches cron cadence). Idempotency = `notifications` table
 * has unique semantic per (appointmentId, template) — see DB index. We protect
 * against double-send by querying for existing rows first.
 *
 * Also acts as the outbox-sweep backstop: any `queued` notification older than
 * 5 minutes that has no provider response is re-enqueued.
 */

import { and, eq, gte, isNull, lte } from 'drizzle-orm';
import { ulid } from 'ulid';
import type { Env } from '../../interfaces/workers/env.js';
import { buildDb } from '../db/client.js';
import { appointments, notifications, patients, users } from '../db/schema.js';
import type { NotificationJob } from '../notifiers/QueueNotifierEnqueuers.js';

const WINDOW_MS = 5 * 60 * 1000;

export const handleAppointmentRemindersCron = async (env: Env): Promise<void> => {
  const db = buildDb({ connectionString: env.DATABASE_URL });
  const now = Date.now();

  await enqueueRemindersForOffset(db, env, now, 24 * 60, 'appointment_reminder_24h');
  await enqueueRemindersForOffset(db, env, now, 60, 'appointment_reminder_1h');
  await sweepStuckOutbox(db, env);
};

const enqueueRemindersForOffset = async (
  db: ReturnType<typeof buildDb>,
  env: Env,
  nowMs: number,
  offsetMinutes: number,
  template: string,
): Promise<void> => {
  const lowerMs = nowMs + offsetMinutes * 60 * 1000;
  const upperMs = lowerMs + WINDOW_MS;
  const due = await db
    .select({
      a: appointments,
      patient: patients,
      user: users,
    })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .innerJoin(users, eq(users.id, patients.userId))
    .where(
      and(
        eq(appointments.status, 'confirmed'),
        gte(appointments.startsAt, new Date(lowerMs)),
        lte(appointments.startsAt, new Date(upperMs)),
      ),
    );

  for (const row of due) {
    // Dedupe: did we already enqueue this template for this appointment?
    const existing = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.appointmentId, row.a.id), eq(notifications.template, template)))
      .limit(1);
    if (existing.length > 0) continue;

    const payload = {
      appointmentId: row.a.id,
      serviceId: row.a.serviceId,
      startsAtIso: row.a.startsAt.toISOString(),
      deliveryMode: row.a.deliveryMode,
    };
    await enqueueAll(db, env, {
      template,
      appointmentId: row.a.id,
      correlationId: row.a.correlationId,
      locale: row.a.locale,
      toEmail: row.user.email,
      toPhoneE164: row.patient.phoneE164,
      payload,
    });
  }
};

const enqueueAll = async (
  db: ReturnType<typeof buildDb>,
  env: Env,
  m: {
    template: string;
    appointmentId: string;
    correlationId: string;
    locale: 'tr' | 'ar' | 'en' | 'fr' | 'es';
    toEmail: string;
    toPhoneE164: string | null;
    payload: Record<string, unknown>;
  },
): Promise<void> => {
  const emailId = ulid();
  await db.insert(notifications).values({
    id: emailId,
    channel: 'email',
    toEmail: m.toEmail,
    locale: m.locale,
    template: m.template,
    payloadJson: m.payload,
    status: 'queued',
    appointmentId: m.appointmentId,
    correlationId: m.correlationId,
  });
  await env.QUEUE_NOTIFICATIONS.send({ kind: 'email', rowId: emailId } satisfies NotificationJob);

  if (m.toPhoneE164) {
    const smsId = ulid();
    await db.insert(notifications).values({
      id: smsId,
      channel: 'sms',
      toPhoneE164: m.toPhoneE164,
      locale: m.locale,
      template: m.template,
      payloadJson: m.payload,
      status: 'queued',
      appointmentId: m.appointmentId,
      correlationId: m.correlationId,
    });
    await env.QUEUE_NOTIFICATIONS.send({ kind: 'sms', rowId: smsId } satisfies NotificationJob);
  }
};

const sweepStuckOutbox = async (db: ReturnType<typeof buildDb>, env: Env): Promise<void> => {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000);
  const stuck = await db
    .select({
      id: notifications.id,
      channel: notifications.channel,
      attempts: notifications.attempts,
    })
    .from(notifications)
    .where(
      and(
        eq(notifications.status, 'queued'),
        lte(notifications.createdAt, cutoff),
        isNull(notifications.sentAt),
      ),
    )
    .limit(100);
  for (const n of stuck) {
    if (n.attempts >= 5) {
      await db.update(notifications).set({ status: 'dlq' }).where(eq(notifications.id, n.id));
      continue;
    }
    await env.QUEUE_NOTIFICATIONS.send({
      kind: n.channel as 'email' | 'sms' | 'whatsapp',
      rowId: n.id,
    } satisfies NotificationJob);
  }
};
