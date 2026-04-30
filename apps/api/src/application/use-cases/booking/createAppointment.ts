/**
 * Use case: create a confirmed appointment from a held slot.
 *
 * Steps (in order):
 *   1. Idempotency check (KV) — duplicate request returns the original response.
 *   2. Patient + service load.
 *   3. Active consents loaded.
 *   4. TMS screening loaded if service requires.
 *   5. BookingPolicy.decide(...) — reject early on policy violation.
 *   6. Slot lock service confirms hold → confirmed (atomic in DO).
 *   7. New consent records persisted (any newly granted in this flow).
 *   8. Appointment built (domain), then confirmed.
 *   9. Telehealth room created if deliveryMode === 'telehealth'.
 *  10. Repository persists appointment.
 *  11. Notifications enqueued (email + SMS + WhatsApp).
 *  12. Audit log written.
 *  13. Idempotency response cached.
 *
 * Failure modes are typed (Result<Appointment, DomainError>).
 */

import type {
  AppointmentRepository,
  AuditLogger,
  Clock,
  ConsentRepository,
  EmailNotifier,
  IdGenerator,
  IdempotencyStore,
  PatientRepository,
  ServiceCatalogue,
  SlotLockService,
  SmsNotifier,
  TelehealthRoomFactory,
  TmsScreeningRepository,
  WhatsappNotifier,
} from '../../ports/index.js';
import { Appointment } from '../../../domain/appointment/Appointment.js';
import {
  BookingPolicy,
  type BookingDecision,
} from '../../../domain/appointment/BookingPolicy.js';
import {
  AppointmentNotFound,
  ConsentMissing,
  GuardianRequired,
  IdempotencyConflict,
  SlotConflict,
  SlotHoldExpired,
  SlotInPast,
  SlotNotFound,
  TmsScreeningDenied,
  TmsScreeningRequired,
} from '../../../domain/appointment/errors.js';
import {
  asAppointmentId,
  asConsentRecordId,
  type CorrelationId,
  type DoctorId,
  type IdempotencyKey,
  type ServiceId,
  type SlotHoldToken,
  type UserId,
} from '../../../domain/shared/ids.js';
import {
  addMinutes,
  type DurationMinutes,
  type Instant,
  instantFromIso,
} from '../../../domain/shared/time.js';
import { DomainError, err, ok, type Result } from '../../../domain/shared/errors.js';
import {
  type ConsentPurpose,
  grantedPurposeSet,
} from '../../../domain/patient/Consent.js';

export interface CreateAppointmentDeps {
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly patients: PatientRepository;
  readonly services: ServiceCatalogue;
  readonly consents: ConsentRepository;
  readonly tmsScreenings: TmsScreeningRepository;
  readonly appointments: AppointmentRepository;
  readonly slotLock: SlotLockService;
  readonly telehealth: TelehealthRoomFactory;
  readonly email: EmailNotifier;
  readonly sms: SmsNotifier;
  readonly whatsapp: WhatsappNotifier;
  readonly audit: AuditLogger;
  readonly idempotency: IdempotencyStore;
  readonly env: {
    SLOT_HOLD_TTL_SECONDS: number;
    DEFAULT_DOCTOR_ID: DoctorId;
    CONSENT_DOCUMENT_VERSION: string;
    PUBLIC_BASE_URL: string;
  };
}

export interface CreateAppointmentInput {
  readonly actorUserId: UserId;
  readonly correlationId: CorrelationId;
  readonly idempotencyKey: IdempotencyKey | null;
  readonly serviceId: ServiceId;
  readonly slotStartsAtIso: string;
  readonly deliveryMode: 'in_person' | 'home_visit' | 'telehealth';
  readonly holdToken: SlotHoldToken;
  readonly homeAddressLine1: string | null;
  readonly homeAddressLine2: string | null;
  readonly patientNotes: string | null;
  readonly consents: {
    readonly appointmentBooking: true;
    readonly healthDataProcessing: true;
    readonly videoConsultationRecording?: boolean;
  };
  readonly consentDocumentVersion: string;
  readonly locale: 'tr' | 'ar' | 'en' | 'fr' | 'es';
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly patientEmail: string;
  readonly patientPhoneE164: string | null;
}

export interface CreateAppointmentOutput {
  readonly appointment: Appointment;
  readonly rescheduleUrl: string;
  readonly cancelUrl: string;
}

/** Build a stable fingerprint of the request body for idempotency comparison. */
const fingerprintInput = (i: CreateAppointmentInput): string =>
  JSON.stringify({
    s: i.serviceId,
    a: i.slotStartsAtIso,
    d: i.deliveryMode,
    u: i.actorUserId,
    h: i.holdToken,
  });

export const createAppointment =
  (deps: CreateAppointmentDeps) =>
  async (input: CreateAppointmentInput): Promise<Result<CreateAppointmentOutput, DomainError>> => {
    const now = deps.clock.now();

    // 1. Idempotency
    if (input.idempotencyKey !== null) {
      const claim = await deps.idempotency.claim({
        key: input.idempotencyKey,
        fingerprint: fingerprintInput(input),
        ttlSeconds: 24 * 3600,
      });
      if (claim === 'duplicate_mismatch') return err(new IdempotencyConflict());
      if (claim === 'duplicate_match') {
        // Replay path: load the original appointment via repo.
        const existing = await deps.appointments.findByIdempotencyKey(input.idempotencyKey);
        if (!existing) return err(new AppointmentNotFound());
        return ok({
          appointment: existing,
          rescheduleUrl: await rescheduleUrlFor(deps, existing.id, existing.snapshot.startsAt),
          cancelUrl: await cancelUrlFor(deps, existing.id, existing.snapshot.startsAt),
        });
      }
    }

    // 2. Patient & service
    const patient = await deps.patients.findByUserId(input.actorUserId);
    if (!patient) return err(new AppointmentNotFound()); // patient profile missing — caller should /register first
    const service = await deps.services.findById(input.serviceId);
    if (!service) return err(new SlotNotFound());

    const slotStartsAt = instantFromIso(input.slotStartsAtIso);
    const slotEndsAt = addMinutes(slotStartsAt, service.durationMinutes as DurationMinutes);

    // 3. Consents loaded
    const consentRecords = await deps.consents.listForUser(input.actorUserId);
    const grantedBefore = grantedPurposeSet(consentRecords);

    // 4. TMS screening if needed
    const screening = service.requiresTmsScreening
      ? await deps.tmsScreenings.findActive(patient.id, deps.env.DEFAULT_DOCTOR_ID, now)
      : null;

    // 5. Policy decision (we add new-grants to grantedSet for the decision pre-write)
    const requestedNewPurposes: ConsentPurpose[] = [];
    if (input.consents.appointmentBooking) requestedNewPurposes.push('appointment_booking');
    if (input.consents.healthDataProcessing) requestedNewPurposes.push('health_data_processing');
    if (input.consents.videoConsultationRecording === true)
      requestedNewPurposes.push('video_consultation_recording');
    const grantedForDecision = new Set([...grantedBefore, ...requestedNewPurposes]);

    const decision: BookingDecision = BookingPolicy.decide({
      patient: {
        id: patient.id,
        dateOfBirth: patient.snapshot.dateOfBirth,
        emailVerified: patient.isEmailVerified,
        hasGuardian: patient.snapshot.guardianPatientId !== null,
        // Caller (route) is responsible for having pre-loaded guardian-verified state into patient repo;
        // for MVP we conservatively treat `guardianPatientId !== null` as guardian-on-file but require
        // an explicit guardian_consent record.
        guardianEmailVerified: patient.snapshot.guardianPatientId !== null,
      },
      service: {
        id: service.id,
        minPatientAgeYears: service.minPatientAgeYears,
        maxPatientAgeYears: service.maxPatientAgeYears,
        deliveryModes: service.deliveryModes,
        requiresTmsScreening: service.requiresTmsScreening,
      },
      chosenDeliveryMode: input.deliveryMode,
      slotStartsAt,
      now,
      tmsScreeningStatus: screening?.status ?? 'none',
      grantedConsentPurposes: grantedForDecision,
    });

    if (decision.kind === 'denied') {
      switch (decision.reason) {
        case 'EMAIL_NOT_VERIFIED':
          return err(
            new DomainError({
              code: 'EMAIL_NOT_VERIFIED',
              message: 'Email verification required before booking.',
              httpStatus: 403,
            }),
          );
        case 'GUARDIAN_REQUIRED':
          return err(new GuardianRequired());
        case 'AGE_NOT_ELIGIBLE':
          return err(
            new DomainError({
              code: 'PERMISSION_DENIED',
              message: 'Service age requirements not met.',
              httpStatus: 403,
            }),
          );
        case 'DELIVERY_MODE_NOT_OFFERED':
          return err(
            new DomainError({
              code: 'CONFLICT',
              message: 'Service is not offered in the chosen delivery mode.',
              httpStatus: 409,
            }),
          );
        case 'SLOT_IN_PAST':
          return err(new SlotInPast());
        case 'TMS_SCREENING_REQUIRED':
          return err(new TmsScreeningRequired());
        case 'TMS_SCREENING_DENIED':
          return err(new TmsScreeningDenied());
        case 'CONSENT_MISSING':
          return err(
            new ConsentMissing({
              details: { missing: decision.missingConsents ?? [] },
            }),
          );
      }
    }

    // 6. Confirm slot atomically
    const appointmentId = asAppointmentId(deps.ids.generate());
    const confirm = await deps.slotLock.confirmAppointment({
      token: input.holdToken,
      appointmentId,
      doctorId: deps.env.DEFAULT_DOCTOR_ID,
      startsAt: slotStartsAt,
      endsAt: slotEndsAt,
      now,
    });
    if (confirm === 'hold_expired') return err(new SlotHoldExpired());
    if (confirm === 'hold_invalid') return err(new SlotNotFound());
    if (confirm === 'slot_taken') return err(new SlotConflict());

    // 7. Persist any newly-granted consents
    for (const purpose of requestedNewPurposes) {
      if (grantedBefore.has(purpose)) continue;
      await deps.consents.record({
        id: asConsentRecordId(deps.ids.generate()),
        userId: input.actorUserId,
        purpose,
        consentDocumentVersion: input.consentDocumentVersion,
        granted: true,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        locale: input.locale,
      });
    }

    // 8. Build domain appointment
    let appointment = Appointment.create({
      id: appointmentId,
      patientId: patient.id,
      doctorId: deps.env.DEFAULT_DOCTOR_ID,
      serviceId: service.id,
      deliveryMode: input.deliveryMode,
      startsAt: slotStartsAt,
      durationMinutes: service.durationMinutes as DurationMinutes,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      ...(input.homeAddressLine1 !== null
        ? { homeAddressLine1: input.homeAddressLine1 }
        : {}),
      ...(input.homeAddressLine2 !== null
        ? { homeAddressLine2: input.homeAddressLine2 }
        : {}),
      ...(input.patientNotes !== null ? { patientNotes: input.patientNotes } : {}),
      locale: input.locale,
      now,
    });
    appointment = appointment.confirm({ now, actorUserId: input.actorUserId });

    // 9. Telehealth room if needed
    if (input.deliveryMode === 'telehealth') {
      const room = await deps.telehealth.createRoom({
        appointmentId,
        startsAt: slotStartsAt,
        endsAt: slotEndsAt,
        moderatorEmail: 'doctor@uzmdroguzbak.com', // TODO: doctor email from config
        patientEmail: input.patientEmail,
      });
      appointment = appointment.attachTelehealth({
        roomId: room.roomId,
        joinUrl: room.joinUrl,
        expiresAt: room.expiresAt,
        now,
      });
    }

    // 10. Persist
    await deps.appointments.save(appointment);

    // 11. Notifications (idempotent enqueue — workers consume + retry)
    const notifyPayload = {
      appointmentId,
      serviceId: service.id,
      startsAtIso: input.slotStartsAtIso,
      deliveryMode: input.deliveryMode,
      telehealthJoinUrl: appointment.snapshot.telehealthJoinUrl,
    };
    await deps.email.enqueue({
      toEmail: input.patientEmail,
      locale: input.locale,
      template: 'appointment_confirmation',
      payload: notifyPayload,
      correlationId: input.correlationId,
    });
    if (input.patientPhoneE164) {
      await deps.sms.enqueue({
        toPhoneE164: input.patientPhoneE164,
        locale: input.locale,
        template: 'appointment_confirmation',
        payload: notifyPayload,
        correlationId: input.correlationId,
      });
      await deps.whatsapp.enqueue({
        toPhoneE164: input.patientPhoneE164,
        locale: input.locale,
        template: 'appointment_confirmation',
        payload: notifyPayload,
        correlationId: input.correlationId,
      });
    }

    // 12. Audit
    await deps.audit.record({
      actorUserId: input.actorUserId,
      actorRole: 'patient',
      action: 'create',
      entityType: 'appointment',
      entityId: appointmentId,
      targetUserId: input.actorUserId,
      correlationId: input.correlationId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    const rescheduleUrl = await rescheduleUrlFor(deps, appointmentId, slotStartsAt);
    const cancelUrl = await cancelUrlFor(deps, appointmentId, slotStartsAt);

    // 13. Cache idempotency response (best-effort; race here is acceptable — same payload)
    if (input.idempotencyKey !== null) {
      await deps.idempotency.storeResponse(
        input.idempotencyKey,
        JSON.stringify({ appointmentId }),
      );
    }

    return ok({ appointment, rescheduleUrl, cancelUrl });
  };

const SIGNED_LINK_TTL_DAYS = 30;

const rescheduleUrlFor = async (
  deps: CreateAppointmentDeps & { signedUrls?: never },
  appointmentId: string,
  startsAt: Instant,
): Promise<string> =>
  // Stub: minted via SignedUrlMinter in real composition; placeholder URL here so
  // the use case stays focused on flow. Real wiring lives in container.
  `${deps.env.PUBLIC_BASE_URL}/randevu/${appointmentId}/yeniden-planla?exp=${startsAt + SIGNED_LINK_TTL_DAYS * 86400_000}`;

const cancelUrlFor = async (
  deps: CreateAppointmentDeps,
  appointmentId: string,
  startsAt: Instant,
): Promise<string> =>
  `${deps.env.PUBLIC_BASE_URL}/randevu/${appointmentId}/iptal?exp=${startsAt + SIGNED_LINK_TTL_DAYS * 86400_000}`;
