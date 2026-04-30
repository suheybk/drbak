import type { DoctorId, PatientId } from '../../domain/shared/ids.js';
import type { Instant } from '../../domain/shared/time.js';
import type { TmsEligibilityVerdict } from '../../domain/tms/TmsEligibility.js';

export type TmsScreeningStatus =
  | 'pending_review'
  | 'cleared'
  | 'requires_review'
  | 'denied'
  | 'expired';

export interface TmsScreening {
  readonly patientId: PatientId;
  readonly doctorId: DoctorId;
  readonly status: TmsScreeningStatus;
  readonly expiresAt: Instant;
}

export interface TmsScreeningRepository {
  findActive(patientId: PatientId, doctorId: DoctorId, now: Instant): Promise<TmsScreening | null>;
  upsertFromEvaluation(input: {
    patientId: PatientId;
    doctorId: DoctorId;
    verdict: TmsEligibilityVerdict;
    now: Instant;
    validForDays: number;
  }): Promise<TmsScreening>;
}
