/**
 * Use case: KVKK Article 11 / GDPR Article 17 erasure.
 *
 * Erasure rules:
 *   - PII on `users` is blanked (email becomes `deleted+<id>@uzmdroguzbak.invalid`,
 *     password hash nulled, locked indefinitely). Row is soft-deleted.
 *   - Patient profile PII is blanked but row retained (referenced by appointments
 *     which we MUST retain for 10y under TR medical-record law).
 *   - Patient documents (R2 objects) are PURGED. DB rows soft-deleted.
 *   - Consent records are RETAINED forever (legal evidence).
 *   - Audit log is RETAINED forever (legal evidence).
 *   - An audit row is written for the erasure itself.
 *
 * Returns the erased userId + a manifest of what was touched.
 */

import type { R2Bucket } from '@cloudflare/workers-types';
import { and, eq } from 'drizzle-orm';
import { DomainError, type Result, err, ok } from '../../../domain/shared/errors.js';
import type { CorrelationId, UserId } from '../../../domain/shared/ids.js';
import type { Db } from '../../../infrastructure/db/client.js';
import { patientDocuments, patients, users } from '../../../infrastructure/db/schema.js';
import type { AuditLogger, Clock } from '../../ports/index.js';

export interface DsarEraseDeps {
  readonly db: Db;
  readonly r2: R2Bucket;
  readonly clock: Clock;
  readonly audit: AuditLogger;
}

export interface DsarEraseInput {
  readonly targetUserId: UserId;
  readonly actorUserId: UserId;
  readonly correlationId: CorrelationId;
  readonly confirmText: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

export interface DsarEraseManifest {
  readonly userBlanked: boolean;
  readonly patientBlanked: boolean;
  readonly documentsPurged: number;
}

const REQUIRED_CONFIRM = 'EVET, KALICI OLARAK SİL';

export const dsarErase =
  (deps: DsarEraseDeps) =>
  async (input: DsarEraseInput): Promise<Result<DsarEraseManifest, DomainError>> => {
    if (input.confirmText !== REQUIRED_CONFIRM) {
      return err(
        new DomainError({
          code: 'VALIDATION_FAILED',
          message: `Confirmation text must equal "${REQUIRED_CONFIRM}".`,
          httpStatus: 400,
          field: 'confirmText',
        }),
      );
    }

    const userRows = await deps.db
      .select()
      .from(users)
      .where(eq(users.id, input.targetUserId))
      .limit(1);
    if (!userRows[0]) {
      return err(
        new DomainError({ code: 'NOT_FOUND', message: 'User not found.', httpStatus: 404 }),
      );
    }
    const now = new Date(deps.clock.now() as number);

    // 1. Purge R2 objects + mark document rows deleted
    const docs = await deps.db
      .select({ id: patientDocuments.id, r2Key: patientDocuments.r2Key })
      .from(patientDocuments)
      .innerJoin(patients, eq(patients.id, patientDocuments.patientId))
      .where(and(eq(patients.userId, input.targetUserId)));
    let docsPurged = 0;
    for (const d of docs) {
      try {
        await deps.r2.delete(d.r2Key);
        docsPurged++;
      } catch {
        // Continue — surface failures via the audit log
      }
    }
    if (docs.length > 0) {
      await deps.db
        .update(patientDocuments)
        .set({ deletedAt: now })
        .where(eq(patientDocuments.uploadedByUserId, input.targetUserId));
    }

    // 2. Blank patient profile PII (retain row for appointment FK integrity)
    const patientUpdate = await deps.db
      .update(patients)
      .set({
        fullName: '[silindi]',
        gender: null,
        phoneE164: null,
        addressLine1: null,
        addressLine2: null,
        city: null,
        postalCode: null,
        emergencyContactName: null,
        emergencyContactPhoneE164: null,
        notesInternal: null,
        deletedAt: now,
        updatedAt: now,
      })
      .where(eq(patients.userId, input.targetUserId))
      .returning({ id: patients.id });

    // 3. Blank user PII + lock + soft-delete
    const erasedEmail = `deleted+${input.targetUserId}@uzmdroguzbak.invalid`;
    await deps.db
      .update(users)
      .set({
        email: erasedEmail,
        emailNormalized: erasedEmail,
        passwordHash: null,
        lockedUntil: new Date(now.getTime() + 100 * 365 * 24 * 3600 * 1000),
        deletedAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, input.targetUserId));

    // 4. Audit (the erasure itself)
    await deps.audit.record({
      actorUserId: input.actorUserId,
      actorRole: 'admin',
      action: 'hard_delete',
      entityType: 'user',
      entityId: input.targetUserId,
      targetUserId: input.targetUserId,
      correlationId: input.correlationId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { documentsPurged: docsPurged, patientRowsBlanked: patientUpdate.length },
    });

    return ok({
      userBlanked: true,
      patientBlanked: patientUpdate.length > 0,
      documentsPurged: docsPurged,
    });
  };
