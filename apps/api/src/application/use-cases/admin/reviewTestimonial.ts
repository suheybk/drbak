/**
 * Use case: admin approves or rejects a submitted testimonial.
 * Approving requires a linked consent record of purpose 'testimonial_publication'
 * (already enforced at insert time; we re-verify here as defence in depth).
 */

import { and, eq } from 'drizzle-orm';
import { DomainError, type Result, err, ok } from '../../../domain/shared/errors.js';
import type { CorrelationId, UserId } from '../../../domain/shared/ids.js';
import type { Db } from '../../../infrastructure/db/client.js';
import { consentRecords, testimonials } from '../../../infrastructure/db/schema.js';
import type { AuditLogger, Clock, ConsentRepository } from '../../ports/index.js';

export interface ReviewTestimonialDeps {
  readonly db: Db;
  readonly clock: Clock;
  readonly consents: ConsentRepository;
  readonly audit: AuditLogger;
}

export interface ReviewTestimonialInput {
  readonly testimonialId: string;
  readonly action: 'approve' | 'reject';
  readonly reason?: string;
  readonly actorUserId: UserId;
  readonly correlationId: CorrelationId;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

export const reviewTestimonial =
  (deps: ReviewTestimonialDeps) =>
  async (input: ReviewTestimonialInput): Promise<Result<{ status: string }, DomainError>> => {
    const rows = await deps.db
      .select()
      .from(testimonials)
      .where(eq(testimonials.id, input.testimonialId))
      .limit(1);
    const t = rows[0];
    if (!t)
      return err(
        new DomainError({ code: 'NOT_FOUND', message: 'Testimonial not found.', httpStatus: 404 }),
      );
    if (t.status !== 'submitted') {
      return err(
        new DomainError({ code: 'CONFLICT', message: 'Already reviewed.', httpStatus: 409 }),
      );
    }

    if (input.action === 'approve') {
      // Re-verify consent record exists and is granted for testimonial_publication
      const c = await deps.db
        .select()
        .from(consentRecords)
        .where(
          and(
            eq(consentRecords.id, t.consentRecordId),
            eq(consentRecords.purpose, 'testimonial_publication'),
            eq(consentRecords.granted, true),
          ),
        )
        .limit(1);
      if (!c[0] || c[0].withdrawnAt !== null) {
        return err(
          new DomainError({
            code: 'CONSENT_MISSING',
            message: 'Consent for publication missing.',
            httpStatus: 403,
          }),
        );
      }
      await deps.db
        .update(testimonials)
        .set({
          status: 'approved',
          approvedAt: new Date(deps.clock.now() as number),
          approvedByUserId: input.actorUserId,
        })
        .where(eq(testimonials.id, input.testimonialId));
    } else {
      await deps.db
        .update(testimonials)
        .set({ status: 'rejected' })
        .where(eq(testimonials.id, input.testimonialId));
    }

    await deps.audit.record({
      actorUserId: input.actorUserId,
      actorRole: 'admin',
      action: 'update',
      entityType: 'testimonial',
      entityId: input.testimonialId,
      targetUserId: t.patientId ? (t.patientId as never) : null,
      correlationId: input.correlationId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { action: input.action, ...(input.reason ? { reason: input.reason } : {}) },
    });

    return ok({ status: input.action === 'approve' ? 'approved' : 'rejected' });
  };
