import { CancellationPolicy } from '../../../domain/appointment/CancellationPolicy.js';
import { AppointmentNotFound, AppointmentTerminal } from '../../../domain/appointment/errors.js';
import { DomainError, type Result, err, ok } from '../../../domain/shared/errors.js';
import type { AppointmentId, CorrelationId, DoctorId, UserId } from '../../../domain/shared/ids.js';
import type {
  AppointmentRepository,
  AuditLogger,
  Clock,
  EmailNotifier,
  PatientRepository,
  SlotLockService,
  SmsNotifier,
} from '../../ports/index.js';

export interface CancelAppointmentDeps {
  readonly clock: Clock;
  readonly appointments: AppointmentRepository;
  readonly patients: PatientRepository;
  readonly slotLock: SlotLockService;
  readonly email: EmailNotifier;
  readonly sms: SmsNotifier;
  readonly audit: AuditLogger;
  readonly env: {
    APPOINTMENT_CANCEL_WINDOW_HOURS: number;
    DEFAULT_DOCTOR_ID: DoctorId;
  };
}

export interface CancelAppointmentInput {
  readonly appointmentId: AppointmentId;
  readonly actorUserId: UserId;
  readonly actorRole: 'patient' | 'staff' | 'admin' | 'doctor';
  readonly reason: string | null;
  readonly correlationId: CorrelationId;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly patientEmail: string;
  readonly patientPhoneE164: string | null;
  readonly locale: 'tr' | 'ar' | 'en' | 'fr' | 'es';
}

export const cancelAppointment =
  (deps: CancelAppointmentDeps) =>
  async (
    input: CancelAppointmentInput,
  ): Promise<Result<{ status: string; verdict: 'allowed' | 'late' }, DomainError>> => {
    const now = deps.clock.now();
    const appt = await deps.appointments.findById(input.appointmentId);
    if (!appt) return err(new AppointmentNotFound());
    if (appt.isTerminal) return err(new AppointmentTerminal());

    // Authorization: patient may cancel only their own
    if (input.actorRole === 'patient') {
      const patient = await deps.patients.findByUserId(input.actorUserId);
      if (!patient || patient.id !== appt.snapshot.patientId) {
        return err(
          new DomainError({
            code: 'PERMISSION_DENIED',
            message: 'Not your appointment.',
            httpStatus: 403,
          }),
        );
      }
    }

    const verdict = CancellationPolicy.decide({
      slotStartsAt: appt.snapshot.startsAt,
      now,
      windowHours: deps.env.APPOINTMENT_CANCEL_WINDOW_HOURS,
      isTerminal: appt.isTerminal,
    });
    if (verdict === 'forbidden') return err(new AppointmentTerminal());

    const cancelDeadline = CancellationPolicy.deadline(
      appt.snapshot.startsAt,
      deps.env.APPOINTMENT_CANCEL_WINDOW_HOURS,
    );
    const updated =
      input.actorRole === 'patient'
        ? appt.cancelByPatient({
            now,
            actorUserId: input.actorUserId,
            reason: input.reason,
            cancelDeadline,
          })
        : appt.cancelByClinic({
            now,
            actorUserId: input.actorUserId,
            reason: input.reason ?? 'cancelled by clinic',
          });

    await deps.appointments.save(updated);
    // Free the confirmed slot in the doctor-day DO so it can be re-booked.
    // releaseBooking is idempotent — a no-op if the booking record is
    // missing or the appointment id no longer matches.
    await deps.slotLock.releaseBooking({
      doctorId: deps.env.DEFAULT_DOCTOR_ID,
      startsAt: appt.snapshot.startsAt,
      appointmentId: appt.id,
    });

    const payload = {
      appointmentId: appt.id,
      serviceId: appt.snapshot.serviceId,
      startsAtIso: new Date(appt.snapshot.startsAt as number).toISOString(),
    };
    await deps.email.enqueue({
      toEmail: input.patientEmail,
      locale: input.locale,
      template: 'appointment_cancelled',
      payload,
      correlationId: input.correlationId,
    });
    if (input.patientPhoneE164) {
      await deps.sms.enqueue({
        toPhoneE164: input.patientPhoneE164,
        locale: input.locale,
        template: 'appointment_cancelled',
        payload,
        correlationId: input.correlationId,
      });
    }
    await deps.audit.record({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      action: 'update',
      entityType: 'appointment',
      entityId: appt.id,
      targetUserId: input.actorUserId,
      correlationId: input.correlationId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { transition: `confirmed→${updated.status}`, verdict },
    });

    return ok({ status: updated.status, verdict });
  };
