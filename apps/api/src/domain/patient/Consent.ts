import type { ConsentDocumentId, ConsentRecordId, UserId } from '../shared/ids.js';
import type { Instant } from '../shared/time.js';

export type ConsentPurpose =
  | 'appointment_booking'
  | 'health_data_processing'
  | 'testimonial_publication'
  | 'marketing_communications'
  | 'document_storage'
  | 'guardian_consent'
  | 'video_consultation_recording'
  | 'tms_screening_data';

export interface ConsentRecord {
  readonly id: ConsentRecordId;
  readonly userId: UserId;
  readonly purpose: ConsentPurpose;
  readonly consentDocumentId: ConsentDocumentId;
  readonly granted: boolean;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly locale: 'tr' | 'ar' | 'en' | 'fr' | 'es';
  readonly grantedAt: Instant;
  readonly withdrawnAt: Instant | null;
}

export const isActive = (c: ConsentRecord): boolean => c.granted && c.withdrawnAt === null;

export const activeFor = (
  records: ReadonlyArray<ConsentRecord>,
  purpose: ConsentPurpose,
): ConsentRecord | null =>
  records.filter((r) => r.purpose === purpose && isActive(r))[0] ?? null;

export const grantedPurposeSet = (
  records: ReadonlyArray<ConsentRecord>,
): ReadonlySet<ConsentPurpose> => new Set(records.filter(isActive).map((r) => r.purpose));
