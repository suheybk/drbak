/**
 * Use case: reschedule an appointment.
 *
 * Strategy: create a NEW appointment via createAppointment + mark the original
 * as 'rescheduled'. This keeps the audit clean — both records exist, linked via
 * `rescheduled_from_appointment_id`.
 *
 * Caller (route) is responsible for having created a fresh slot hold for the
 * new time prior to calling this use case.
 */

import { CancellationPolicy } from '../../../domain/appointment/CancellationPolicy.js';
import {
  AppointmentNotFound,
  AppointmentTerminal,
  RescheduleWindowPassed,
} from '../../../domain/appointment/errors.js';
import { DomainError, err, ok } from '../../../domain/shared/errors.js';
import {
  type AppointmentId,
  type CorrelationId,
  type DoctorId,
  type SlotHoldToken,
  type UserId,
  asCorrelationId,
} from '../../../domain/shared/ids.js';
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
  WhatsappNotifier,
} from '../../ports/index.js';
import { createAppointment } from './createAppointment.js';

export interface RescheduleAppointmentDeps {
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly patients: PatientRepository;
  readonly services: ServiceCatalogue;
  readonly consents: ConsentRepository;
  readonly tmsScreenings: import('../../ports/index.js').TmsScreeningRepository;
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
    APPOINTMENT_RESCHEDULE_WINDOW_HOURS: number;
  };
}

export interface RescheduleAppointmentInput {
  readonly originalAppointmentId: AppointmentId;
  readonly actorUserId: UserId;
  readonly actorRole: 'patient' | 'staff' | 'admin';
  readonly newSlotStartsAtIso: string;
  readonly newDeliveryMode: 'in_person' | 'home_visit' | 'telehealth';
  readonly holdToken: SlotHoldToken;
  readonly reason: string | null;
  readonly correlationId: CorrelationId;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly patientEmail: string;
  readonly patientPhoneE164: string | null;
}

export const rescheduleAppointment =
  (deps: RescheduleAppointmentDeps) => async (input: RescheduleAppointmentInput) => {
    const original = await deps.appointments.findById(input.originalAppointmentId);
    if (!original) return err(new AppointmentNotFound());
    if (original.isTerminal) return err(new AppointmentTerminal());

    // Authorization for patient role
    if (input.actorRole === 'patient') {
      const p = await deps.patients.findByUserId(input.actorUserId);
      if (!p || p.id !== original.snapshot.patientId) {
        return err(
          new DomainError({
            code: 'PERMISSION_DENIED',
            message: 'Not your appointment.',
            httpStatus: 403,
          }),
        );
      }
    }

    const now = deps.clock.now();
    const verdict = CancellationPolicy.decide({
      slotStartsAt: original.snapshot.startsAt,
      now,
      windowHours: deps.env.APPOINTMENT_RESCHEDULE_WINDOW_HOURS,
      isTerminal: false,
    });
    if (verdict !== 'allowed') {
      return err(new RescheduleWindowPassed());
    }

    // Create new appointment via the canonical create flow
    const create = createAppointment({
      clock: deps.clock,
      ids: deps.ids,
      patients: deps.patients,
      services: deps.services,
      consents: deps.consents,
      tmsScreenings: deps.tmsScreenings,
      appointments: deps.appointments,
      slotLock: deps.slotLock,
      telehealth: deps.telehealth,
      email: deps.email,
      sms: deps.sms,
      whatsapp: deps.whatsapp,
      audit: deps.audit,
      idempotency: deps.idempotency,
      env: {
        SLOT_HOLD_TTL_SECONDS: deps.env.SLOT_HOLD_TTL_SECONDS,
        DEFAULT_DOCTOR_ID: deps.env.DEFAULT_DOCTOR_ID,
        CONSENT_DOCUMENT_VERSION: deps.env.CONSENT_DOCUMENT_VERSION,
        PUBLIC_BASE_URL: deps.env.PUBLIC_BASE_URL,
      },
    });
    const created = await create({
      actorUserId: input.actorUserId,
      correlationId: asCorrelationId(`${input.correlationId}-resched`),
      idempotencyKey: null,
      serviceId: original.snapshot.serviceId,
      slotStartsAtIso: input.newSlotStartsAtIso,
      deliveryMode: input.newDeliveryMode,
      holdToken: input.holdToken,
      homeAddressLine1: original.snapshot.homeAddressLine1,
      homeAddressLine2: original.snapshot.homeAddressLine2,
      patientNotes: original.snapshot.patientNotes,
      consents: { appointmentBooking: true, healthDataProcessing: true },
      consentDocumentVersion: deps.env.CONSENT_DOCUMENT_VERSION,
      locale: original.snapshot.locale,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      patientEmail: input.patientEmail,
      patientPhoneE164: input.patientPhoneE164,
    });
    if (!created.ok) return created;

    // Mark original as rescheduled
    const marked = original.markRescheduled({
      now,
      actorUserId: input.actorUserId,
      reason: input.reason,
    });
    await deps.appointments.save(marked);

    // Free the original slot in the doctor-day DO so the freed time is
    // bookable again. Without this, the booked record at the original
    // (doctorId, startsAt) would persist forever — same gap that lived in
    // cancelAppointment until Phase 3.
    await deps.slotLock.releaseBooking({
      doctorId: deps.env.DEFAULT_DOCTOR_ID,
      startsAt: original.snapshot.startsAt,
      appointmentId: original.id,
    });

    return ok({
      newAppointmentId: created.value.appointment.id,
      originalStatus: marked.status,
    });
  };
