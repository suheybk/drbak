/**
 * Patient routes — authenticated, role: patient | staff | admin.
 *   GET  /me
 *   GET  /me/appointments
 *   POST /me/appointments
 *   POST /me/appointments/:id/cancel
 *   POST /me/documents/upload-url
 *   POST /me/documents/:id/_upload  (signed-token PUT proxy to R2)
 *   POST /me/tms-screening
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  CancelAppointmentRequestSchema,
  CreateAppointmentRequestSchema,
  RequestUploadSchema,
  TmsScreeningAnswersSchema,
} from '@dr-bak/contracts';
import { eq } from 'drizzle-orm';
import type { Env } from '../../workers/env.js';
import type { Container } from '../../../composition/container.js';
import { token } from '../../../composition/container.js';
import { T } from '../../../composition/tokens.js';
import { requireAuth } from '../middleware/auth.js';
import { clientIp, idempotencyKey, localeOf, respond, userAgent } from '../helpers.js';
import { createAppointment } from '../../../application/use-cases/booking/createAppointment.js';
import { cancelAppointment } from '../../../application/use-cases/booking/cancelAppointment.js';
import { rescheduleAppointment } from '../../../application/use-cases/booking/rescheduleAppointment.js';
import { getMyAppointments } from '../../../application/use-cases/patient/getMyAppointments.js';
import { submitTmsScreening } from '../../../application/use-cases/patient/submitTmsScreening.js';
import { requestDocumentUpload } from '../../../application/use-cases/patient/requestDocumentUpload.js';
import {
  asAppointmentId,
  asCorrelationId,
  asIdempotencyKey,
  asServiceId,
  asSlotHoldToken,
  asUserId,
  type DoctorId,
} from '../../../domain/shared/ids.js';
import { instantFromIso, instantToIso } from '../../../domain/shared/time.js';
import { patientDocuments, patients, users } from '../../../infrastructure/db/schema.js';

export const patientRouter = new Hono<{ Bindings: Env }>();

/**
 * Resolve the clinic's default doctor at request time. Replaces the previous
 * env-derived constant — see `application/ports/DoctorCatalogue.ts`.
 */
const defaultDoctorId = async (container: Container): Promise<DoctorId> =>
  (await container.resolve(T.DoctorCatalogue).getDefault()).id;

patientRouter.use('*', requireAuth(['patient', 'staff', 'admin']));

patientRouter.get('/me', async (c) => {
  const auth = c.get('auth')!;
  const container = c.get('container') as Container;
  const db = container.resolve(token('Db') as never) as ReturnType<typeof import('../../../infrastructure/db/client.js').buildDb>;
  const rows = await db
    .select({ p: patients, u: users })
    .from(patients)
    .innerJoin(users, eq(users.id, patients.userId))
    .where(eq(patients.userId, auth.userId))
    .limit(1);
  if (!rows[0]) return c.json({ error: { code: 'NOT_FOUND', message: 'Patient profile missing.' } }, 404);
  const { p, u } = rows[0];
  return c.json({
    id: p.id,
    fullName: p.fullName,
    dateOfBirth: p.dateOfBirth,
    gender: p.gender,
    phoneE164: p.phoneE164,
    addressLine1: p.addressLine1,
    addressLine2: p.addressLine2,
    city: p.city,
    postalCode: p.postalCode,
    countryIso2: p.countryIso2,
    emergencyContactName: p.emergencyContactName,
    emergencyContactPhoneE164: p.emergencyContactPhoneE164,
    guardianPatientId: p.guardianPatientId,
    locale: u.locale,
    emailVerified: u.emailVerifiedAt !== null,
  });
});

patientRouter.get('/me/appointments', async (c) => {
  const container = c.get('container') as Container;
  const auth = c.get('auth')!;
  const useCase = getMyAppointments({
    patients: container.resolve(T.PatientRepository),
    appointments: container.resolve(T.AppointmentRepository),
    audit: container.resolve(T.AuditLogger),
  });
  const r = await useCase({
    actorUserId: asUserId(auth.userId),
    actorRole: auth.role,
    correlationId: asCorrelationId(c.get('correlationId')),
    ipAddress: clientIp(c),
    userAgent: userAgent(c),
  });
  if (!r.ok) return c.json({ error: r.error.toJSON() }, r.error.httpStatus as never);
  return c.json({
    items: r.value.map((a) => ({
      id: a.id,
      serviceId: a.snapshot.serviceId,
      doctorId: a.snapshot.doctorId,
      startsAt: instantToIso(a.snapshot.startsAt),
      endsAt: instantToIso(a.snapshot.endsAt),
      deliveryMode: a.snapshot.deliveryMode,
      status: a.status,
      locale: a.snapshot.locale,
      telehealthJoinUrl: a.snapshot.telehealthJoinUrl,
      createdAt: instantToIso(a.snapshot.createdAt),
    })),
  });
});

patientRouter.post(
  '/me/appointments',
  zValidator('json', CreateAppointmentRequestSchema),
  async (c) => {
    const env = c.env;
    const container = c.get('container') as Container;
    const auth = c.get('auth')!;
    const body = c.req.valid('json');
    const idem = idempotencyKey(c);
    if (!auth.emailVerified) {
      return c.json({ error: { code: 'EMAIL_NOT_VERIFIED', message: 'Verify your email first.' } }, 403);
    }

    // Load patient contact for notifications
    const db = container.resolve(token('Db') as never) as ReturnType<typeof import('../../../infrastructure/db/client.js').buildDb>;
    const userRows = await db.select().from(users).where(eq(users.id, auth.userId)).limit(1);
    const patientRows = await db.select().from(patients).where(eq(patients.userId, auth.userId)).limit(1);
    if (!userRows[0] || !patientRows[0]) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Patient profile missing.' } }, 404);
    }

    const useCase = createAppointment({
      clock: container.resolve(T.Clock),
      ids: container.resolve(T.IdGenerator),
      patients: container.resolve(T.PatientRepository),
      services: container.resolve(T.ServiceCatalogue),
      consents: container.resolve(T.ConsentRepository),
      tmsScreenings: container.resolve(T.TmsScreeningRepository),
      appointments: container.resolve(T.AppointmentRepository),
      slotLock: container.resolve(T.SlotLockService),
      telehealth: container.resolve(T.TelehealthRoomFactory),
      email: container.resolve(T.EmailNotifier),
      sms: container.resolve(T.SmsNotifier),
      whatsapp: container.resolve(T.WhatsappNotifier),
      audit: container.resolve(T.AuditLogger),
      idempotency: container.resolve(T.IdempotencyStore),
      env: {
        SLOT_HOLD_TTL_SECONDS: Number(env.SLOT_HOLD_TTL_SECONDS),
        DEFAULT_DOCTOR_ID: await defaultDoctorId(container),
        CONSENT_DOCUMENT_VERSION: env.CONSENT_DOCUMENT_VERSION,
        PUBLIC_BASE_URL: env.PUBLIC_BASE_URL,
      },
    });

    // The hold token carries the (doctor, startsAt) bound implicitly via DO key.
    // We re-derive startsAt from the body — schema requires both.
    const r = await useCase({
      actorUserId: asUserId(auth.userId),
      correlationId: asCorrelationId(c.get('correlationId')),
      idempotencyKey: idem ? asIdempotencyKey(idem) : null,
      serviceId: asServiceId((body as never as { serviceId?: string }).serviceId ?? ''), // populated by client
      slotStartsAtIso: (body as never as { startsAt?: string }).startsAt ?? '',
      deliveryMode: (body as never as { deliveryMode?: 'in_person' | 'home_visit' | 'telehealth' }).deliveryMode ?? 'in_person',
      holdToken: asSlotHoldToken(body.holdToken),
      homeAddressLine1: body.homeAddressLine1 ?? null,
      homeAddressLine2: body.homeAddressLine2 ?? null,
      patientNotes: body.patientNotes ?? null,
      consents: {
        appointmentBooking: true,
        healthDataProcessing: true,
        ...(body.consents.videoConsultationRecording !== undefined
          ? { videoConsultationRecording: body.consents.videoConsultationRecording }
          : {}),
      },
      consentDocumentVersion: body.consentDocumentVersion,
      locale: body.locale,
      ipAddress: clientIp(c),
      userAgent: userAgent(c),
      patientEmail: userRows[0].email,
      patientPhoneE164: patientRows[0].phoneE164,
    });

    if (!r.ok) return c.json({ error: r.error.toJSON() }, r.error.httpStatus as never);
    const a = r.value.appointment;
    return c.json({
      id: a.id,
      serviceId: a.snapshot.serviceId,
      doctorId: a.snapshot.doctorId,
      startsAt: instantToIso(a.snapshot.startsAt),
      endsAt: instantToIso(a.snapshot.endsAt),
      deliveryMode: a.snapshot.deliveryMode,
      status: a.status,
      locale: a.snapshot.locale,
      telehealthJoinUrl: a.snapshot.telehealthJoinUrl,
      rescheduleUrl: r.value.rescheduleUrl,
      cancelUrl: r.value.cancelUrl,
      createdAt: instantToIso(a.snapshot.createdAt),
    }, 201);
  },
);

patientRouter.post(
  '/me/appointments/:id/cancel',
  zValidator('param', z.object({ id: z.string() })),
  zValidator('json', CancelAppointmentRequestSchema),
  async (c) => {
    const env = c.env;
    const container = c.get('container') as Container;
    const auth = c.get('auth')!;
    const body = c.req.valid('json');
    const params = c.req.valid('param');

    const db = container.resolve(token('Db') as never) as ReturnType<typeof import('../../../infrastructure/db/client.js').buildDb>;
    const userRows = await db.select().from(users).where(eq(users.id, auth.userId)).limit(1);
    const patientRows = await db.select().from(patients).where(eq(patients.userId, auth.userId)).limit(1);
    if (!userRows[0] || !patientRows[0]) return c.json({ error: { code: 'NOT_FOUND', message: 'Patient missing.' } }, 404);

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
        DEFAULT_DOCTOR_ID: await defaultDoctorId(container),
      },
    });
    const r = await useCase({
      appointmentId: asAppointmentId(params.id),
      actorUserId: asUserId(auth.userId),
      actorRole: auth.role,
      reason: body.reason ?? null,
      correlationId: asCorrelationId(c.get('correlationId')),
      ipAddress: clientIp(c),
      userAgent: userAgent(c),
      patientEmail: userRows[0].email,
      patientPhoneE164: patientRows[0].phoneE164,
      locale: localeOf(c),
    });
    return respond(c, r);
  },
);

patientRouter.post(
  '/me/appointments/:id/reschedule',
  zValidator('param', z.object({ id: z.string() })),
  zValidator(
    'json',
    z.object({
      holdToken: z.string(),
      newSlotStartsAtIso: z.string().datetime(),
      newDeliveryMode: z.enum(['in_person', 'home_visit', 'telehealth']),
      reason: z.string().max(500).optional(),
    }),
  ),
  async (c) => {
    const env = c.env;
    const container = c.get('container') as Container;
    const auth = c.get('auth')!;
    const body = c.req.valid('json');
    const params = c.req.valid('param');

    const db = container.resolve(token('Db') as never) as ReturnType<typeof import('../../../infrastructure/db/client.js').buildDb>;
    const userRows = await db.select().from(users).where(eq(users.id, auth.userId)).limit(1);
    const patientRows = await db.select().from(patients).where(eq(patients.userId, auth.userId)).limit(1);
    if (!userRows[0] || !patientRows[0]) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Patient missing.' } }, 404);
    }

    const useCase = rescheduleAppointment({
      clock: container.resolve(T.Clock),
      ids: container.resolve(T.IdGenerator),
      patients: container.resolve(T.PatientRepository),
      services: container.resolve(T.ServiceCatalogue),
      consents: container.resolve(T.ConsentRepository),
      tmsScreenings: container.resolve(T.TmsScreeningRepository),
      appointments: container.resolve(T.AppointmentRepository),
      slotLock: container.resolve(T.SlotLockService),
      telehealth: container.resolve(T.TelehealthRoomFactory),
      email: container.resolve(T.EmailNotifier),
      sms: container.resolve(T.SmsNotifier),
      whatsapp: container.resolve(T.WhatsappNotifier),
      audit: container.resolve(T.AuditLogger),
      idempotency: container.resolve(T.IdempotencyStore),
      env: {
        SLOT_HOLD_TTL_SECONDS: Number(env.SLOT_HOLD_TTL_SECONDS),
        DEFAULT_DOCTOR_ID: await defaultDoctorId(container),
        CONSENT_DOCUMENT_VERSION: env.CONSENT_DOCUMENT_VERSION,
        PUBLIC_BASE_URL: env.PUBLIC_BASE_URL,
        APPOINTMENT_RESCHEDULE_WINDOW_HOURS: Number(env.APPOINTMENT_RESCHEDULE_WINDOW_HOURS),
      },
    });
    const r = await useCase({
      originalAppointmentId: asAppointmentId(params.id),
      actorUserId: asUserId(auth.userId),
      actorRole: auth.role,
      newSlotStartsAtIso: body.newSlotStartsAtIso,
      newDeliveryMode: body.newDeliveryMode,
      holdToken: body.holdToken as never,
      reason: body.reason ?? null,
      correlationId: asCorrelationId(c.get('correlationId')),
      ipAddress: clientIp(c),
      userAgent: userAgent(c),
      patientEmail: userRows[0].email,
      patientPhoneE164: patientRows[0].phoneE164,
    });
    return respond(c, r);
  },
);

patientRouter.post(
  '/me/documents/upload-url',
  zValidator('json', RequestUploadSchema),
  async (c) => {
    const container = c.get('container') as Container;
    const auth = c.get('auth')!;
    const body = c.req.valid('json');
    const useCase = requestDocumentUpload({
      db: container.resolve(token('Db') as never) as never,
      r2: c.env.R2_DOCUMENTS,
      patients: container.resolve(T.PatientRepository),
      clock: container.resolve(T.Clock),
      ids: container.resolve(T.IdGenerator),
      audit: container.resolve(T.AuditLogger),
      uploadTokens: container.resolve(T.UploadTokenMinter),
    });
    const r = await useCase({
      actorUserId: asUserId(auth.userId),
      filename: body.filename,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      description: body.description ?? null,
      appointmentId: body.appointmentId ?? null,
      correlationId: asCorrelationId(c.get('correlationId')),
      ipAddress: clientIp(c),
      userAgent: userAgent(c),
    });
    return respond(c, r, 201);
  },
);

patientRouter.put('/me/documents/:id/_upload', async (c) => {
  // In-Worker proxy PUT to R2. Verify the HMAC-signed token (minted by
  // requestDocumentUpload) AND that the authenticated user owns the doc.
  // Defence in depth: route check + minter check + auth check all required.
  const auth = c.get('auth')!;
  const docId = c.req.param('id');
  const token_ = c.req.query('token') ?? '';
  if (!token_) {
    return c.json({ error: { code: 'TOKEN_INVALID', message: 'Upload token required.' } }, 401);
  }
  const container = c.get('container') as Container;
  const db = container.resolve(token('Db') as never) as ReturnType<typeof import('../../../infrastructure/db/client.js').buildDb>;
  const docs = await db.select().from(patientDocuments).where(eq(patientDocuments.id, docId)).limit(1);
  if (!docs[0]) return c.json({ error: { code: 'NOT_FOUND', message: 'Doc missing.' } }, 404);
  if (docs[0].uploadedByUserId !== auth.userId) {
    return c.json({ error: { code: 'PERMISSION_DENIED', message: 'Not yours.' } }, 403);
  }
  const minter = container.resolve(T.UploadTokenMinter);
  const clock = container.resolve(T.Clock);
  const valid = await minter.verify({
    token: token_,
    docId: docs[0].id,
    patientId: docs[0].patientId,
    r2Key: docs[0].r2Key,
    nowMs: clock.now() as number,
  });
  if (!valid) {
    return c.json({ error: { code: 'TOKEN_INVALID', message: 'Upload token invalid or expired.' } }, 401);
  }
  const body = c.req.raw.body;
  if (!body) return c.json({ error: { code: 'VALIDATION_FAILED', message: 'Empty body.' } }, 400);
  await c.env.R2_DOCUMENTS.put(docs[0].r2Key, body, {
    httpMetadata: { contentType: docs[0].mimeType },
    customMetadata: { uploadedByUserId: auth.userId, docId },
  });
  return c.body(null, 204);
});

patientRouter.post(
  '/me/tms-screening',
  zValidator('json', TmsScreeningAnswersSchema),
  async (c) => {
    const env = c.env;
    const container = c.get('container') as Container;
    const auth = c.get('auth')!;
    const body = c.req.valid('json');
    const useCase = submitTmsScreening({
      clock: container.resolve(T.Clock),
      patients: container.resolve(T.PatientRepository),
      tmsScreenings: container.resolve(T.TmsScreeningRepository),
      consents: container.resolve(T.ConsentRepository),
      audit: container.resolve(T.AuditLogger),
      ids: container.resolve(T.IdGenerator),
      env: {
        DEFAULT_DOCTOR_ID: await defaultDoctorId(container),
        TMS_SCREENING_VALIDITY_DAYS: Number(env.TMS_SCREENING_VALIDITY_DAYS),
        CONSENT_DOCUMENT_VERSION: env.CONSENT_DOCUMENT_VERSION,
      },
    });
    const r = await useCase({
      actorUserId: asUserId(auth.userId),
      answers: body,
      tmsScreeningDataConsent: true,
      correlationId: asCorrelationId(c.get('correlationId')),
      ipAddress: clientIp(c),
      userAgent: userAgent(c),
      locale: localeOf(c),
    });
    return respond(c, r);
  },
);
