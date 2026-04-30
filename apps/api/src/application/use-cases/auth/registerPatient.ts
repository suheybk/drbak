/**
 * Use case: register a new patient.
 *
 * Steps:
 *   1. Email-conflict check (case-folded).
 *   2. Hash password (Argon2id).
 *   3. Create user.
 *   4. Create patient profile.
 *   5. Persist initial KVKK consents (appointment_booking + health_data_processing,
 *      optionally marketing).
 *   6. Generate email-verification token (KV, 24h TTL).
 *   7. Audit + (return token to caller; route enqueues the verify email).
 */

import type { Locale } from '@dr-bak/contracts';
import { DomainError, type Result, err, ok } from '../../../domain/shared/errors.js';
import {
  type CorrelationId,
  type UserId,
  asConsentRecordId,
  asPatientId,
  asUserId,
} from '../../../domain/shared/ids.js';
import type { Db } from '../../../infrastructure/db/client.js';
import { patients } from '../../../infrastructure/db/schema.js';
import type {
  AuditLogger,
  Clock,
  ConsentRepository,
  IdGenerator,
  OneTimeTokenStore,
  PasswordHasher,
  RandomTokenGenerator,
  UserRepository,
} from '../../ports/index.js';

export interface RegisterPatientDeps {
  readonly db: Db; // Patient profile insert lives here; outside the userRepo intentionally
  readonly users: UserRepository;
  readonly consents: ConsentRepository;
  readonly hasher: PasswordHasher;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly tokens: OneTimeTokenStore;
  readonly random: RandomTokenGenerator;
  readonly audit: AuditLogger;
  readonly env: { CONSENT_DOCUMENT_VERSION: string };
}

export interface RegisterPatientInput {
  readonly correlationId: CorrelationId;
  readonly email: string;
  readonly password: string;
  readonly fullName: string;
  readonly dateOfBirth: string; // YYYY-MM-DD
  readonly locale: Locale;
  readonly phoneE164: string | null;
  readonly consents: {
    appointmentBooking: true;
    healthDataProcessing: true;
    marketingCommunications?: boolean;
  };
  readonly consentDocumentVersion: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

export interface RegisterPatientOutput {
  readonly userId: UserId;
  readonly verificationToken: string;
}

export const registerPatient =
  (deps: RegisterPatientDeps) =>
  async (input: RegisterPatientInput): Promise<Result<RegisterPatientOutput, DomainError>> => {
    const now = deps.clock.now();
    const emailNorm = input.email.trim().toLowerCase();

    const existing = await deps.users.findByEmail(emailNorm);
    if (existing) {
      // Same generic-error policy as login — no enumeration.
      return err(
        new DomainError({
          code: 'CONFLICT',
          message: 'Registration could not be completed.',
          httpStatus: 409,
        }),
      );
    }

    const passwordHash = await deps.hasher.hash(input.password);
    const userId = asUserId(deps.ids.generate());

    const user = await deps.users.create({
      id: userId,
      email: input.email.trim(),
      passwordHash,
      role: 'patient',
      locale: input.locale,
      emailVerifiedAt: null,
      now,
    });

    const patientId = asPatientId(deps.ids.generate());
    await deps.db.insert(patients).values({
      id: patientId,
      userId: user.id,
      fullName: input.fullName,
      dateOfBirth: input.dateOfBirth,
      phoneE164: input.phoneE164,
      countryIso2: 'TR',
      createdAt: new Date(now as number),
      updatedAt: new Date(now as number),
    });

    // Initial consents
    const grantsToRecord: Array<
      'appointment_booking' | 'health_data_processing' | 'marketing_communications'
    > = ['appointment_booking', 'health_data_processing'];
    if (input.consents.marketingCommunications === true) {
      grantsToRecord.push('marketing_communications');
    }
    for (const purpose of grantsToRecord) {
      await deps.consents.record({
        id: asConsentRecordId(deps.ids.generate()),
        userId: user.id,
        purpose,
        consentDocumentVersion: input.consentDocumentVersion,
        granted: true,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        locale: input.locale,
      });
    }

    // Email verification token
    const verificationToken = deps.random.generate(32);
    await deps.tokens.put({
      purpose: 'email_verify',
      token: verificationToken,
      payload: user.id,
      ttlSeconds: 24 * 3600,
      now,
    });

    // Audit
    await deps.audit.record({
      actorUserId: user.id,
      actorRole: 'patient',
      action: 'create',
      entityType: 'user',
      entityId: user.id,
      targetUserId: user.id,
      correlationId: input.correlationId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return ok({ userId: user.id, verificationToken });
  };
