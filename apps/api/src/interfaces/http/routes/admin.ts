/**
 * Admin routes — role: admin (some endpoints staff-readable).
 *
 * GET    /admin/appointments
 * GET    /admin/appointments.csv
 * POST   /admin/appointments/:id/cancel
 * POST   /admin/appointments/:id/complete
 * POST   /admin/appointments/:id/no-show
 *
 * GET    /admin/testimonials
 * POST   /admin/testimonials/:id/approve
 * POST   /admin/testimonials/:id/reject
 *
 * POST   /admin/content
 * POST   /admin/content/:id/publish
 * POST   /admin/content/:id/archive
 *
 * POST   /admin/slots/templates
 * POST   /admin/slots/blackouts
 *
 * POST   /admin/dsar/:userId/erase
 *
 * GET    /admin/audit-log
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import { LocaleSchema } from '@dr-bak/contracts';
import { ulid } from 'ulid';
import type { Env } from '../../workers/env.js';
import type { Container } from '../../../composition/container.js';
import { token } from '../../../composition/container.js';
import { T } from '../../../composition/tokens.js';
import { requireAuth } from '../middleware/auth.js';
import { clientIp, respond, userAgent } from '../helpers.js';
import {
  appointments,
  appointmentStatusHistory,
  auditLog,
  patients,
  slotBlackouts,
  slotTemplates,
  testimonials,
  users,
} from '../../../infrastructure/db/schema.js';
import { exportAppointmentsCsv } from '../../../application/use-cases/admin/exportAppointmentsCsv.js';
import { reviewTestimonial } from '../../../application/use-cases/admin/reviewTestimonial.js';
import { dsarErase } from '../../../application/use-cases/admin/dsarErase.js';
import {
  archiveContentEntry,
  createContentEntry,
  publishContentEntry,
  type ContentType,
} from '../../../application/use-cases/admin/contentEntryWrite.js';
import {
  asAppointmentId,
  asCorrelationId,
  asUserId,
  type DoctorId,
} from '../../../domain/shared/ids.js';

export const adminRouter = new Hono<{ Bindings: Env }>();

/**
 * Resolve the clinic's default doctor at request time. Replaces the previous
 * env-derived constant — see `application/ports/DoctorCatalogue.ts`.
 */
const defaultDoctorId = async (container: Container): Promise<DoctorId> =>
  (await container.resolve(T.DoctorCatalogue).getDefault()).id;

// All admin routes require admin role. Some sub-routes also allow staff.
adminRouter.use('*', requireAuth(['admin', 'staff']));

// ─── Appointments ──────────────────────────────────────────

adminRouter.get(
  '/appointments',
  zValidator(
    'query',
    z.object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
      status: z.string().optional(),
      serviceId: z.string().optional(),
    }),
  ),
  async (c) => {
    const container = c.get('container') as Container;
    const db = container.resolve(token('Db') as never) as ReturnType<typeof import('../../../infrastructure/db/client.js').buildDb>;
    const q = c.req.valid('query');
    const conds = [];
    if (q.from) conds.push(gte(appointments.startsAt, new Date(q.from)));
    if (q.to) conds.push(lte(appointments.startsAt, new Date(q.to)));
    if (q.status) conds.push(eq(appointments.status, q.status as never));
    if (q.serviceId) conds.push(eq(appointments.serviceId, q.serviceId));
    const rows = await db
      .select({
        id: appointments.id,
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
        status: appointments.status,
        deliveryMode: appointments.deliveryMode,
        serviceId: appointments.serviceId,
        locale: appointments.locale,
        patientName: patients.fullName,
        patientPhone: patients.phoneE164,
        patientEmail: users.email,
      })
      .from(appointments)
      .innerJoin(patients, eq(patients.id, appointments.patientId))
      .innerJoin(users, eq(users.id, patients.userId))
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(desc(appointments.startsAt))
      .limit(500);
    return c.json({ items: rows });
  },
);

adminRouter.get('/appointments.csv', async (c) => {
  const container = c.get('container') as Container;
  const auth = c.get('auth')!;
  const useCase = exportAppointmentsCsv({
    db: container.resolve(token('Db') as never) as never,
    audit: container.resolve(T.AuditLogger),
  });
  const csv = await useCase({
    actorUserId: asUserId(auth.userId),
    actorRole: auth.role === 'admin' ? 'admin' : 'staff',
    correlationId: asCorrelationId(c.get('correlationId')),
    fromIso: c.req.query('from'),
    toIso: c.req.query('to'),
    status: c.req.query('status'),
    ipAddress: clientIp(c),
    userAgent: userAgent(c),
  });
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="appointments-${Date.now()}.csv"`,
    },
  });
});

adminRouter.post(
  '/appointments/:id/complete',
  zValidator('param', z.object({ id: z.string() })),
  async (c) => {
    const container = c.get('container') as Container;
    const auth = c.get('auth')!;
    const params = c.req.valid('param');
    const repo = container.resolve(T.AppointmentRepository);
    const appt = await repo.findById(asAppointmentId(params.id));
    if (!appt) return c.json({ error: { code: 'NOT_FOUND', message: 'Not found.' } }, 404);
    try {
      const updated = appt.markCompleted({
        now: container.resolve(T.Clock).now(),
        actorUserId: asUserId(auth.userId),
      });
      await repo.save(updated);
      return c.json({ status: updated.status });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'transition error';
      return c.json({ error: { code: 'CONFLICT', message: msg } }, 409);
    }
  },
);

adminRouter.post(
  '/appointments/:id/no-show',
  zValidator('param', z.object({ id: z.string() })),
  async (c) => {
    const container = c.get('container') as Container;
    const auth = c.get('auth')!;
    const params = c.req.valid('param');
    const repo = container.resolve(T.AppointmentRepository);
    const appt = await repo.findById(asAppointmentId(params.id));
    if (!appt) return c.json({ error: { code: 'NOT_FOUND', message: 'Not found.' } }, 404);
    try {
      const updated = appt.markNoShow({
        now: container.resolve(T.Clock).now(),
        actorUserId: asUserId(auth.userId),
      });
      await repo.save(updated);
      return c.json({ status: updated.status });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'transition error';
      return c.json({ error: { code: 'CONFLICT', message: msg } }, 409);
    }
  },
);

// ─── Testimonials ──────────────────────────────────────────

adminRouter.get(
  '/testimonials',
  zValidator('query', z.object({ status: z.string().optional() })),
  async (c) => {
    const container = c.get('container') as Container;
    const db = container.resolve(token('Db') as never) as ReturnType<typeof import('../../../infrastructure/db/client.js').buildDb>;
    const q = c.req.valid('query');
    const where = q.status ? eq(testimonials.status, q.status as never) : undefined;
    const rows = await db.select().from(testimonials).where(where).orderBy(desc(testimonials.submittedAt)).limit(200);
    return c.json({ items: rows });
  },
);

adminRouter.post(
  '/testimonials/:id/approve',
  zValidator('param', z.object({ id: z.string() })),
  async (c) => {
    const container = c.get('container') as Container;
    const auth = c.get('auth')!;
    const useCase = reviewTestimonial({
      db: container.resolve(token('Db') as never) as never,
      clock: container.resolve(T.Clock),
      consents: container.resolve(T.ConsentRepository),
      audit: container.resolve(T.AuditLogger),
    });
    const r = await useCase({
      testimonialId: c.req.valid('param').id,
      action: 'approve',
      actorUserId: asUserId(auth.userId),
      correlationId: asCorrelationId(c.get('correlationId')),
      ipAddress: clientIp(c),
      userAgent: userAgent(c),
    });
    return respond(c, r);
  },
);

adminRouter.post(
  '/testimonials/:id/reject',
  zValidator('param', z.object({ id: z.string() })),
  zValidator('json', z.object({ reason: z.string().max(500).optional() })),
  async (c) => {
    const container = c.get('container') as Container;
    const auth = c.get('auth')!;
    const body = c.req.valid('json');
    const useCase = reviewTestimonial({
      db: container.resolve(token('Db') as never) as never,
      clock: container.resolve(T.Clock),
      consents: container.resolve(T.ConsentRepository),
      audit: container.resolve(T.AuditLogger),
    });
    const r = await useCase({
      testimonialId: c.req.valid('param').id,
      action: 'reject',
      reason: body.reason,
      actorUserId: asUserId(auth.userId),
      correlationId: asCorrelationId(c.get('correlationId')),
      ipAddress: clientIp(c),
      userAgent: userAgent(c),
    });
    return respond(c, r);
  },
);

// ─── Content ───────────────────────────────────────────────

const TranslationSchema = z.object({
  locale: LocaleSchema,
  title: z.string().min(2).max(160),
  leadParagraph: z.string().max(1000).nullable(),
  bodyMarkdown: z.string().min(10),
  metaDescription: z.string().max(300).nullable(),
  slugLocalised: z.string().min(2).max(160),
  doctorNoteMarkdown: z.string().max(2000).nullable(),
  readingMinutes: z.number().int().positive().nullable(),
  ogImageR2Key: z.string().nullable(),
});

adminRouter.post(
  '/content',
  // Admin-only (not staff)
  requireAuth(['admin']),
  zValidator(
    'json',
    z.object({
      type: z.enum(['blog', 'condition', 'service', 'faq', 'guide', 'legal']),
      slug: z.string().min(2).max(120),
      relatedConditionId: z.string().optional(),
      relatedServiceId: z.string().optional(),
      translations: z.array(TranslationSchema).min(1),
    }),
  ),
  async (c) => {
    const container = c.get('container') as Container;
    const auth = c.get('auth')!;
    const body = c.req.valid('json');
    const useCase = createContentEntry({
      db: container.resolve(token('Db') as never) as never,
      clock: container.resolve(T.Clock),
      ids: container.resolve(T.IdGenerator),
      audit: container.resolve(T.AuditLogger),
    });
    const r = await useCase({
      ...body,
      type: body.type as ContentType,
      actorUserId: asUserId(auth.userId),
      correlationId: asCorrelationId(c.get('correlationId')),
      ipAddress: clientIp(c),
      userAgent: userAgent(c),
    });
    return respond(c, r, 201);
  },
);

adminRouter.post(
  '/content/:id/publish',
  requireAuth(['admin']),
  zValidator('param', z.object({ id: z.string() })),
  async (c) => {
    const container = c.get('container') as Container;
    const auth = c.get('auth')!;
    const useCase = publishContentEntry({
      db: container.resolve(token('Db') as never) as never,
      clock: container.resolve(T.Clock),
      ids: container.resolve(T.IdGenerator),
      audit: container.resolve(T.AuditLogger),
    });
    const r = await useCase({
      id: c.req.valid('param').id,
      actorUserId: asUserId(auth.userId),
      correlationId: asCorrelationId(c.get('correlationId')),
      ipAddress: clientIp(c),
      userAgent: userAgent(c),
    });
    return respond(c, r);
  },
);

adminRouter.post(
  '/content/:id/archive',
  requireAuth(['admin']),
  zValidator('param', z.object({ id: z.string() })),
  async (c) => {
    const container = c.get('container') as Container;
    const auth = c.get('auth')!;
    const useCase = archiveContentEntry({
      db: container.resolve(token('Db') as never) as never,
      clock: container.resolve(T.Clock),
      ids: container.resolve(T.IdGenerator),
      audit: container.resolve(T.AuditLogger),
    });
    const r = await useCase({
      id: c.req.valid('param').id,
      actorUserId: asUserId(auth.userId),
      correlationId: asCorrelationId(c.get('correlationId')),
      ipAddress: clientIp(c),
      userAgent: userAgent(c),
    });
    return respond(c, r);
  },
);

// ─── Slot rules ───────────────────────────────────────────

adminRouter.post(
  '/slots/templates',
  requireAuth(['admin']),
  zValidator(
    'json',
    z.object({
      serviceId: z.string(),
      daysOfWeek: z.array(z.number().int().min(1).max(7)).min(1),
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/),
      slotDurationMinutes: z.number().int().positive().max(240),
      bufferMinutes: z.number().int().nonnegative().max(60).default(0),
      validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      validUntil: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .nullable()
        .optional(),
    }),
  ),
  async (c) => {
    const container = c.get('container') as Container;
    const db = container.resolve(token('Db') as never) as ReturnType<typeof import('../../../infrastructure/db/client.js').buildDb>;
    const body = c.req.valid('json');
    const id = ulid();
    await db.insert(slotTemplates).values({
      id,
      doctorId: await defaultDoctorId(container),
      serviceId: body.serviceId,
      daysOfWeek: body.daysOfWeek,
      startTime: body.startTime,
      endTime: body.endTime,
      slotDurationMinutes: body.slotDurationMinutes,
      bufferMinutes: body.bufferMinutes ?? 0,
      validFrom: body.validFrom,
      validUntil: body.validUntil ?? null,
      active: true,
    });
    return c.json({ id }, 201);
  },
);

adminRouter.post(
  '/slots/blackouts',
  requireAuth(['admin']),
  zValidator(
    'json',
    z.object({
      startsAt: z.string().datetime(),
      endsAt: z.string().datetime(),
      reasonInternal: z.string().max(500).optional(),
    }),
  ),
  async (c) => {
    const container = c.get('container') as Container;
    const db = container.resolve(token('Db') as never) as ReturnType<typeof import('../../../infrastructure/db/client.js').buildDb>;
    const body = c.req.valid('json');
    const id = ulid();
    await db.insert(slotBlackouts).values({
      id,
      doctorId: await defaultDoctorId(container),
      startsAt: new Date(body.startsAt),
      endsAt: new Date(body.endsAt),
      reasonInternal: body.reasonInternal ?? null,
    });
    return c.json({ id }, 201);
  },
);

// ─── DSAR ──────────────────────────────────────────────────

adminRouter.post(
  '/dsar/:userId/erase',
  requireAuth(['admin']),
  zValidator('param', z.object({ userId: z.string() })),
  zValidator('json', z.object({ confirmText: z.string() })),
  async (c) => {
    const container = c.get('container') as Container;
    const auth = c.get('auth')!;
    const useCase = dsarErase({
      db: container.resolve(token('Db') as never) as never,
      r2: c.env.R2_DOCUMENTS,
      clock: container.resolve(T.Clock),
      audit: container.resolve(T.AuditLogger),
    });
    const r = await useCase({
      targetUserId: asUserId(c.req.valid('param').userId),
      actorUserId: asUserId(auth.userId),
      correlationId: asCorrelationId(c.get('correlationId')),
      confirmText: c.req.valid('json').confirmText,
      ipAddress: clientIp(c),
      userAgent: userAgent(c),
    });
    return respond(c, r);
  },
);

// ─── Audit log query ───────────────────────────────────────

adminRouter.get(
  '/audit-log',
  zValidator(
    'query',
    z.object({
      targetUserId: z.string().optional(),
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
      action: z.string().optional(),
    }),
  ),
  async (c) => {
    const container = c.get('container') as Container;
    const db = container.resolve(token('Db') as never) as ReturnType<typeof import('../../../infrastructure/db/client.js').buildDb>;
    const q = c.req.valid('query');
    const conds = [];
    if (q.targetUserId) conds.push(eq(auditLog.targetUserId, q.targetUserId));
    if (q.from) conds.push(gte(auditLog.at, new Date(q.from)));
    if (q.to) conds.push(lte(auditLog.at, new Date(q.to)));
    if (q.action) conds.push(eq(auditLog.action, q.action as never));
    const rows = await db
      .select()
      .from(auditLog)
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(desc(auditLog.at))
      .limit(500);
    return c.json({ items: rows });
    void appointmentStatusHistory; // silence unused-import
  },
);
