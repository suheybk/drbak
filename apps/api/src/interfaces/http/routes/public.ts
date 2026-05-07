/**
 * Public routes — anon-accessible.
 *   GET  /public/services
 *   GET  /public/availability
 *   POST /public/booking/holds
 *   GET  /public/content
 *   GET  /public/content/:type/:slug
 *   GET  /public/testimonials
 */

import { AvailabilityQuerySchema, HoldSlotRequestSchema, LocaleSchema } from '@dr-bak/contracts';
import { zValidator } from '@hono/zod-validator';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { holdSlot } from '../../../application/use-cases/booking/holdSlot.js';
import { listAvailability } from '../../../application/use-cases/booking/listAvailability.js';
import { Tx } from '../../../composition/buildContainer.js';
import type { Container } from '../../../composition/container.js';
import { T } from '../../../composition/tokens.js';
import { type DoctorId, asServiceId } from '../../../domain/shared/ids.js';
import {
  contentEntries,
  contentEntryTranslations,
  serviceTranslations,
  services as servicesTable,
  testimonials,
} from '../../../infrastructure/db/schema.js';
import type { Env } from '../../workers/env.js';
import { localeOf, respond } from '../helpers.js';

export const publicRouter = new Hono<{ Bindings: Env }>();

/**
 * Resolve the clinic's default doctor at request time. Replaces the previous
 * env-derived constant — see `application/ports/DoctorCatalogue.ts`. The
 * catalogue throws if the doctors table is empty (deployment-time error).
 */
const defaultDoctorId = async (container: Container): Promise<DoctorId> =>
  (await container.resolve(T.DoctorCatalogue).getDefault()).id;

publicRouter.get('/services', async (c) => {
  const container = c.get('container') as Container;
  const db = container.resolve(Tx.Db as never) as ReturnType<
    typeof import('../../../infrastructure/db/client.js').buildDb
  >;
  const locale = localeOf(c);
  const rows = await db
    .select({
      id: servicesTable.id,
      slug: servicesTable.slug,
      pillar: servicesTable.pillar,
      durationMinutes: servicesTable.durationMinutes,
      deliveryModes: servicesTable.deliveryModes,
      requiresTmsScreening: servicesTable.requiresTmsScreening,
      minPatientAgeYears: servicesTable.minPatientAgeYears,
      maxPatientAgeYears: servicesTable.maxPatientAgeYears,
      title: serviceTranslations.title,
      leadParagraph: serviceTranslations.leadParagraph,
    })
    .from(servicesTable)
    .innerJoin(
      serviceTranslations,
      and(
        eq(serviceTranslations.serviceId, servicesTable.id),
        eq(serviceTranslations.locale, locale),
      ),
    );
  return c.json({ items: rows });
});

publicRouter.get('/availability', zValidator('query', AvailabilityQuerySchema), async (c) => {
  const container = c.get('container') as Container;
  const projector = container.resolve(Tx.AvailabilityProjector);
  const clock = container.resolve(T.Clock);
  const useCase = listAvailability({
    projector,
    clock,
    env: { DEFAULT_DOCTOR_ID: await defaultDoctorId(container) },
  });
  const q = c.req.valid('query');
  const result = await useCase({
    serviceId: asServiceId(q.serviceId),
    dateYmd: q.date,
    deliveryMode: q.deliveryMode,
  });
  return c.json(result);
});

publicRouter.post('/booking/holds', zValidator('json', HoldSlotRequestSchema), async (c) => {
  const env = c.env;
  const container = c.get('container') as Container;
  const useCase = holdSlot({
    clock: container.resolve(T.Clock),
    services: container.resolve(T.ServiceCatalogue),
    slotLock: container.resolve(T.SlotLockService),
    env: {
      DEFAULT_DOCTOR_ID: await defaultDoctorId(container),
      SLOT_HOLD_TTL_SECONDS: Number(env.SLOT_HOLD_TTL_SECONDS),
    },
  });
  const body = c.req.valid('json');
  const r = await useCase({
    serviceId: asServiceId(body.serviceId),
    startsAtIso: body.startsAt,
    deliveryMode: body.deliveryMode,
  });
  return respond(c, r, 201);
});

publicRouter.get(
  '/content/:type/:slug',
  zValidator('param', z.object({ type: z.string(), slug: z.string() })),
  async (c) => {
    const container = c.get('container') as Container;
    const db = container.resolve(Tx.Db as never) as ReturnType<
      typeof import('../../../infrastructure/db/client.js').buildDb
    >;
    const locale = localeOf(c);
    const { type, slug } = c.req.valid('param');

    const entryRows = await db
      .select()
      .from(contentEntries)
      .where(and(eq(contentEntries.type, type as never), eq(contentEntries.slug, slug)))
      .limit(1);
    const entry = entryRows[0];
    if (!entry || entry.status !== 'published') {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Content not found.' } }, 404);
    }
    const trRows = await db
      .select()
      .from(contentEntryTranslations)
      .where(eq(contentEntryTranslations.contentEntryId, entry.id));
    const tr = trRows.find((t) => t.locale === locale) ?? trRows.find((t) => t.locale === 'tr');
    if (!tr) return c.json({ error: { code: 'NOT_FOUND', message: 'No translation.' } }, 404);

    return c.json({
      id: entry.id,
      type: entry.type,
      slug: entry.slug,
      slugLocalised: tr.slugLocalised,
      title: tr.title,
      leadParagraph: tr.leadParagraph,
      bodyMarkdown: tr.bodyMarkdown,
      doctorNoteMarkdown: tr.doctorNoteMarkdown,
      metaDescription: tr.metaDescription,
      readingMinutes: tr.readingMinutes,
      publishedAt: entry.publishedAt?.toISOString() ?? null,
      schemaJsonLd: entry.schemaJsonLd,
      alternateLocales: trRows.map((t) => ({ locale: t.locale, slugLocalised: t.slugLocalised })),
    });
  },
);

publicRouter.get(
  '/content',
  zValidator('query', z.object({ type: z.string().optional(), locale: LocaleSchema.optional() })),
  async (c) => {
    const container = c.get('container') as Container;
    const db = container.resolve(Tx.Db as never) as ReturnType<
      typeof import('../../../infrastructure/db/client.js').buildDb
    >;
    const locale = localeOf(c);
    const q = c.req.valid('query');
    const where = q.type ? eq(contentEntries.type, q.type as never) : undefined;
    const items = await db
      .select({
        id: contentEntries.id,
        type: contentEntries.type,
        slug: contentEntries.slug,
        publishedAt: contentEntries.publishedAt,
        title: contentEntryTranslations.title,
        leadParagraph: contentEntryTranslations.leadParagraph,
        slugLocalised: contentEntryTranslations.slugLocalised,
        readingMinutes: contentEntryTranslations.readingMinutes,
      })
      .from(contentEntries)
      .innerJoin(
        contentEntryTranslations,
        and(
          eq(contentEntryTranslations.contentEntryId, contentEntries.id),
          eq(contentEntryTranslations.locale, locale),
        ),
      )
      .where(and(eq(contentEntries.status, 'published'), where!));
    return c.json({ items });
  },
);

publicRouter.get('/testimonials', async (c) => {
  const container = c.get('container') as Container;
  const db = container.resolve(Tx.Db as never) as ReturnType<
    typeof import('../../../infrastructure/db/client.js').buildDb
  >;
  const locale = localeOf(c);
  const rows = await db
    .select({
      id: testimonials.id,
      displayName: testimonials.displayName,
      locale: testimonials.locale,
      quoteMarkdown: testimonials.quoteMarkdown,
      conditionId: testimonials.conditionId,
      serviceId: testimonials.serviceId,
      mediaR2Keys: testimonials.mediaR2Keys,
      approvedAt: testimonials.approvedAt,
    })
    .from(testimonials)
    .where(and(eq(testimonials.status, 'approved'), eq(testimonials.locale, locale)));
  return c.json({
    items: rows.map((r) => ({
      id: r.id,
      displayName: r.displayName,
      locale: r.locale,
      quoteMarkdown: r.quoteMarkdown,
      conditionSlug: null,
      serviceSlug: null,
      hasMedia: Array.isArray(r.mediaR2Keys) && r.mediaR2Keys.length > 0,
      approvedAt: r.approvedAt?.toISOString() ?? new Date().toISOString(),
    })),
  });
});
