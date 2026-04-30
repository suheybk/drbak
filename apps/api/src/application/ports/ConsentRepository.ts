import type { ConsentRecord, ConsentPurpose } from '../../domain/patient/Consent.js';
import type { ConsentRecordId, UserId } from '../../domain/shared/ids.js';

export interface RecordConsentInput {
  readonly id: ConsentRecordId;
  readonly userId: UserId;
  readonly purpose: ConsentPurpose;
  readonly consentDocumentVersion: string;
  readonly granted: boolean;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly locale: 'tr' | 'ar' | 'en' | 'fr' | 'es';
}

export interface ConsentRepository {
  listForUser(userId: UserId): Promise<ReadonlyArray<ConsentRecord>>;
  /** Records granted/withheld consent and returns the persisted record. */
  record(input: RecordConsentInput): Promise<ConsentRecord>;
  withdraw(consentRecordId: ConsentRecordId): Promise<void>;
}
