import { and, desc, eq, isNull } from 'drizzle-orm';
import type {
  ConsentRepository,
  RecordConsentInput,
} from '../../../application/ports/index.js';
import {
  type ConsentPurpose,
  type ConsentRecord,
} from '../../../domain/patient/Consent.js';
import {
  asConsentDocumentId,
  asConsentRecordId,
  asUserId,
  type ConsentRecordId,
} from '../../../domain/shared/ids.js';
import { instantFromMillis } from '../../../domain/shared/time.js';
import type { Db } from '../client.js';
import { consentDocuments, consentRecords } from '../schema.js';
import type { Locale } from '@dr-bak/contracts';

const toRecord = (r: typeof consentRecords.$inferSelect): ConsentRecord => ({
  id: asConsentRecordId(r.id),
  userId: asUserId(r.userId),
  purpose: r.purpose as ConsentPurpose,
  consentDocumentId: asConsentDocumentId(r.consentDocumentId),
  granted: r.granted,
  ipAddress: r.ipAddress,
  userAgent: r.userAgent,
  locale: r.locale as Locale,
  grantedAt: instantFromMillis(r.grantedAt.getTime()),
  withdrawnAt: r.withdrawnAt ? instantFromMillis(r.withdrawnAt.getTime()) : null,
});

export class DrizzleConsentRepo implements ConsentRepository {
  constructor(private readonly db: Db) {}

  async listForUser(userId: string): Promise<ReadonlyArray<ConsentRecord>> {
    const rows = await this.db
      .select()
      .from(consentRecords)
      .where(eq(consentRecords.userId, userId));
    return rows.map(toRecord);
  }

  async record(input: RecordConsentInput): Promise<ConsentRecord> {
    // Resolve the live consent document for (purpose, locale, version)
    const docs = await this.db
      .select()
      .from(consentDocuments)
      .where(
        and(
          eq(consentDocuments.purpose, input.purpose),
          eq(consentDocuments.locale, input.locale),
          eq(consentDocuments.version, input.consentDocumentVersion),
        ),
      )
      .limit(1);
    if (!docs[0]) {
      throw new Error(
        `consent document not found: ${input.purpose} / ${input.locale} / ${input.consentDocumentVersion}`,
      );
    }
    const inserted = await this.db
      .insert(consentRecords)
      .values({
        id: input.id,
        userId: input.userId,
        purpose: input.purpose,
        consentDocumentId: docs[0].id,
        granted: input.granted,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        locale: input.locale,
        grantedAt: new Date(),
      })
      .returning();
    if (!inserted[0]) throw new Error('consent insert returned no rows');
    return toRecord(inserted[0]);
  }

  async withdraw(consentRecordId: ConsentRecordId): Promise<void> {
    await this.db
      .update(consentRecords)
      .set({ withdrawnAt: new Date() })
      .where(and(eq(consentRecords.id, consentRecordId), isNull(consentRecords.withdrawnAt)));
  }
}
