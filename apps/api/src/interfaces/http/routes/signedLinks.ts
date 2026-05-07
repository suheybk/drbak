/**
 * Public signed-link landing routes — emailed reschedule/cancel links.
 *   GET  /r/iptal/:token
 *   POST /r/iptal/:token
 *   GET  /r/yeniden-planla/:token
 *
 * Token verified via SignedUrlMinter; on POST we cancel via the same use case
 * the patient uses, attributing the action to the patient (anonymous).
 */

import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { cancelAppointment } from '../../../application/use-cases/booking/cancelAppointment.js';
import { Tx } from '../../../composition/buildContainer.js';
import type { Container } from '../../../composition/container.js';
import { T } from '../../../composition/tokens.js';
import {
  asAppointmentId,
  asCorrelationId,
  asDoctorId,
  asUserId,
} from '../../../domain/shared/ids.js';
import { appointments, patients, users } from '../../../infrastructure/db/schema.js';
import type { Env } from '../../workers/env.js';
import { clientIp, localeOf, userAgent } from '../helpers.js';

export const signedLinksRouter = new Hono<{ Bindings: Env }>();

signedLinksRouter.get('/iptal/:token', async (c) => {
  const container = c.get('container') as Container;
  const minter = container.resolve(T.SignedUrlMinter);
  const ok = await minter.verifyAppointmentLink(c.req.param('token'));
  if (!ok || ok.action !== 'cancel') return c.json({ valid: false }, 400);
  return c.json({ valid: true, appointmentId: ok.appointmentId, action: ok.action });
});

signedLinksRouter.post('/iptal/:token', async (c) => {
  const env = c.env;
  const container = c.get('container') as Container;
  const minter = container.resolve(T.SignedUrlMinter);
  const verified = await minter.verifyAppointmentLink(c.req.param('token'));
  if (!verified || verified.action !== 'cancel') {
    return c.json({ error: { code: 'TOKEN_INVALID', message: 'Invalid or expired link.' } }, 400);
  }

  const db = container.resolve(Tx.Db as never) as ReturnType<
    typeof import('../../../infrastructure/db/client.js').buildDb
  >;
  const aRow = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, verified.appointmentId))
    .limit(1);
  if (!aRow[0]) return c.json({ error: { code: 'NOT_FOUND', message: 'Not found.' } }, 404);
  const pRow = await db.select().from(patients).where(eq(patients.id, aRow[0].patientId)).limit(1);
  const uRow = pRow[0]
    ? await db.select().from(users).where(eq(users.id, pRow[0].userId)).limit(1)
    : [];

  const useCase = cancelAppointment({
    clock: container.resolve(T.Clock),
    appointments: container.resolve(T.AppointmentRepository),
    patients: container.resolve(T.PatientRepository),
    slotLock: container.resolve(T.SlotLockService),
    email: container.resolve(T.EmailNotifier),
    sms: container.resolve(T.SmsNotifier),
    audit: container.resolve(T.AuditLogger),
    env: {
      APPOINTMENT_CANCEL_WINDOW_HOURS: Number(env.APPOINTMENT_CANCEL_WINDOW_HOURS),
      DEFAULT_DOCTOR_ID: asDoctorId(aRow[0].doctorId),
    },
  });
  const r = await useCase({
    appointmentId: asAppointmentId(verified.appointmentId),
    actorUserId: asUserId(pRow[0]!.userId),
    actorRole: 'patient',
    reason: 'cancelled via emailed link',
    correlationId: asCorrelationId(c.get('correlationId')),
    ipAddress: clientIp(c),
    userAgent: userAgent(c),
    patientEmail: uRow[0]!.email,
    patientPhoneE164: pRow[0]!.phoneE164,
    locale: localeOf(c),
  });
  if (!r.ok) return c.json({ error: r.error.toJSON() }, r.error.httpStatus as never);
  return c.json({ status: r.value.status, verdict: r.value.verdict });
});

signedLinksRouter.get('/yeniden-planla/:token', async (c) => {
  const container = c.get('container') as Container;
  const minter = container.resolve(T.SignedUrlMinter);
  const ok = await minter.verifyAppointmentLink(c.req.param('token'));
  if (!ok || ok.action !== 'reschedule') return c.json({ valid: false }, 400);
  // Hand off to the SPA for the actual reschedule UX (Drop 4)
  return c.redirect(
    `${c.env.PUBLIC_BASE_URL}/randevu/${ok.appointmentId}/yeniden-planla?token=${c.req.param('token')}`,
  );
});
