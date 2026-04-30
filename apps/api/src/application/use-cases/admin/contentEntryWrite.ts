/**
 * Use cases: create / update / publish / archive content entries (CMS-lite).
 * One file because the operations share heavy types and validators.
 */

import type { Locale } from '@dr-bak/contracts';
import { eq } from 'drizzle-orm';
import { DomainError, type Result, err, ok } from '../../../domain/shared/errors.js';
import type { CorrelationId, UserId } from '../../../domain/shared/ids.js';
import type { Db } from '../../../infrastructure/db/client.js';
import { contentEntries, contentEntryTranslations } from '../../../infrastructure/db/schema.js';
import type { AuditLogger, Clock, IdGenerator } from '../../ports/index.js';

export type ContentType = 'blog' | 'condition' | 'service' | 'faq' | 'guide' | 'legal';

export interface TranslationInput {
  readonly locale: Locale;
  readonly title: string;
  readonly leadParagraph: string | null;
  readonly bodyMarkdown: string;
  readonly metaDescription: string | null;
  readonly slugLocalised: string;
  readonly doctorNoteMarkdown: string | null;
  readonly readingMinutes: number | null;
  readonly ogImageR2Key: string | null;
}

export interface ContentEntryWriteDeps {
  readonly db: Db;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly audit: AuditLogger;
}

export const createContentEntry =
  (deps: ContentEntryWriteDeps) =>
  async (input: {
    type: ContentType;
    slug: string;
    relatedConditionId?: string;
    relatedServiceId?: string;
    translations: ReadonlyArray<TranslationInput>;
    actorUserId: UserId;
    correlationId: CorrelationId;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<Result<{ id: string }, DomainError>> => {
    if (!input.translations.some((t) => t.locale === 'tr')) {
      return err(
        new DomainError({
          code: 'VALIDATION_FAILED',
          message: 'TR translation is required.',
          httpStatus: 400,
          field: 'translations',
        }),
      );
    }
    const id = deps.ids.generate();
    const now = new Date(deps.clock.now() as number);
    await deps.db.insert(contentEntries).values({
      id,
      type: input.type,
      slug: input.slug,
      status: 'draft',
      authorUserId: input.actorUserId,
      relatedConditionId: input.relatedConditionId ?? null,
      relatedServiceId: input.relatedServiceId ?? null,
      createdAt: now,
      updatedAt: now,
    });
    await deps.db.insert(contentEntryTranslations).values(
      input.translations.map((t) => ({
        contentEntryId: id,
        locale: t.locale,
        title: t.title,
        leadParagraph: t.leadParagraph,
        bodyMarkdown: t.bodyMarkdown,
        metaDescription: t.metaDescription,
        slugLocalised: t.slugLocalised,
        doctorNoteMarkdown: t.doctorNoteMarkdown,
        readingMinutes: t.readingMinutes,
        ogImageR2Key: t.ogImageR2Key,
      })),
    );
    await deps.audit.record({
      actorUserId: input.actorUserId,
      actorRole: 'admin',
      action: 'create',
      entityType: 'content_entry',
      entityId: id,
      targetUserId: null,
      correlationId: input.correlationId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: {
        type: input.type,
        slug: input.slug,
        locales: input.translations.map((t) => t.locale),
      },
    });
    return ok({ id });
  };

export const publishContentEntry =
  (deps: ContentEntryWriteDeps) =>
  async (input: {
    id: string;
    actorUserId: UserId;
    correlationId: CorrelationId;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<Result<{ id: string; publishedAt: string }, DomainError>> => {
    const rows = await deps.db
      .select()
      .from(contentEntries)
      .where(eq(contentEntries.id, input.id))
      .limit(1);
    if (!rows[0])
      return err(
        new DomainError({ code: 'NOT_FOUND', message: 'Entry missing.', httpStatus: 404 }),
      );
    const trCount = await deps.db
      .select({ id: contentEntryTranslations.contentEntryId })
      .from(contentEntryTranslations)
      .where(eq(contentEntryTranslations.contentEntryId, input.id));
    if (trCount.length === 0) {
      return err(
        new DomainError({
          code: 'VALIDATION_FAILED',
          message: 'No translations to publish.',
          httpStatus: 400,
        }),
      );
    }
    const now = new Date(deps.clock.now() as number);
    await deps.db
      .update(contentEntries)
      .set({
        status: 'published',
        publishedAt: now,
        updatedAt: now,
        reviewerUserId: input.actorUserId,
      })
      .where(eq(contentEntries.id, input.id));
    await deps.audit.record({
      actorUserId: input.actorUserId,
      actorRole: 'admin',
      action: 'update',
      entityType: 'content_entry',
      entityId: input.id,
      targetUserId: null,
      correlationId: input.correlationId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { transition: 'published' },
    });
    return ok({ id: input.id, publishedAt: now.toISOString() });
  };

export const archiveContentEntry =
  (deps: ContentEntryWriteDeps) =>
  async (input: {
    id: string;
    actorUserId: UserId;
    correlationId: CorrelationId;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<Result<void, DomainError>> => {
    await deps.db
      .update(contentEntries)
      .set({ status: 'archived', updatedAt: new Date(deps.clock.now() as number) })
      .where(eq(contentEntries.id, input.id));
    await deps.audit.record({
      actorUserId: input.actorUserId,
      actorRole: 'admin',
      action: 'update',
      entityType: 'content_entry',
      entityId: input.id,
      targetUserId: null,
      correlationId: input.correlationId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { transition: 'archived' },
    });
    return ok(undefined);
  };
