import type { TmsScreeningAnswers } from '@dr-bak/contracts';
import { calculateAgeYears } from '../../../domain/appointment/BookingPolicy.js';
import { grantedPurposeSet } from '../../../domain/patient/Consent.js';
import { DomainError, type Result, err, ok } from '../../../domain/shared/errors.js';
import {
  type CorrelationId,
  type DoctorId,
  type UserId,
  asConsentRecordId,
} from '../../../domain/shared/ids.js';
import { TmsEligibility } from '../../../domain/tms/TmsEligibility.js';
import type {
  AuditLogger,
  Clock,
  ConsentRepository,
  IdGenerator,
  PatientRepository,
  TmsScreeningRepository,
} from '../../ports/index.js';

export interface SubmitTmsScreeningDeps {
  readonly clock: Clock;
  readonly patients: PatientRepository;
  readonly tmsScreenings: TmsScreeningRepository;
  readonly consents: ConsentRepository;
  readonly audit: AuditLogger;
  readonly ids: IdGenerator;
  readonly env: {
    DEFAULT_DOCTOR_ID: DoctorId;
    TMS_SCREENING_VALIDITY_DAYS: number;
    CONSENT_DOCUMENT_VERSION: string;
  };
}

export interface SubmitTmsScreeningInput {
  readonly actorUserId: UserId;
  readonly answers: TmsScreeningAnswers;
  readonly tmsScreeningDataConsent: true;
  readonly correlationId: CorrelationId;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly locale: 'tr' | 'ar' | 'en' | 'fr' | 'es';
}

export const submitTmsScreening =
  (deps: SubmitTmsScreeningDeps) =>
  async (input: SubmitTmsScreeningInput): Promise<Result<{ status: string }, DomainError>> => {
    const now = deps.clock.now();
    const patient = await deps.patients.findByUserId(input.actorUserId);
    if (!patient) {
      return err(
        new DomainError({ code: 'NOT_FOUND', message: 'Patient missing.', httpStatus: 404 }),
      );
    }
    const age = calculateAgeYears(patient.snapshot.dateOfBirth, now);

    // Persist consent for tms_screening_data if not already on file
    const existing = await deps.consents.listForUser(input.actorUserId);
    if (!grantedPurposeSet(existing).has('tms_screening_data')) {
      await deps.consents.record({
        id: asConsentRecordId(deps.ids.generate()),
        userId: input.actorUserId,
        purpose: 'tms_screening_data',
        consentDocumentVersion: deps.env.CONSENT_DOCUMENT_VERSION,
        granted: true,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        locale: input.locale,
      });
    }

    const evaluation = TmsEligibility.evaluate(input.answers, age);
    const persisted = await deps.tmsScreenings.upsertFromEvaluation({
      patientId: patient.id,
      doctorId: deps.env.DEFAULT_DOCTOR_ID,
      verdict: evaluation.verdict,
      now,
      validForDays: deps.env.TMS_SCREENING_VALIDITY_DAYS,
    });

    await deps.audit.record({
      actorUserId: input.actorUserId,
      actorRole: 'patient',
      action: 'create',
      entityType: 'tms_screening',
      entityId: patient.id,
      targetUserId: input.actorUserId,
      correlationId: input.correlationId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { verdict: evaluation.verdict, hard: evaluation.hardContraindications },
    });

    return ok({ status: persisted.status });
  };
