import type {
  AppointmentRepository,
  AuditLogger,
  PatientRepository,
} from '../../ports/index.js';
import { DomainError, err, ok, type Result } from '../../../domain/shared/errors.js';
import type {
  CorrelationId,
  UserId,
} from '../../../domain/shared/ids.js';
import type { Appointment } from '../../../domain/appointment/Appointment.js';

export interface GetMyAppointmentsDeps {
  readonly patients: PatientRepository;
  readonly appointments: AppointmentRepository;
  readonly audit: AuditLogger;
}

export const getMyAppointments =
  (deps: GetMyAppointmentsDeps) =>
  async (input: {
    actorUserId: UserId;
    actorRole: 'patient' | 'staff' | 'admin' | 'doctor';
    correlationId: CorrelationId;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<Result<ReadonlyArray<Appointment>, DomainError>> => {
    const patient = await deps.patients.findByUserId(input.actorUserId);
    if (!patient) {
      return err(new DomainError({ code: 'NOT_FOUND', message: 'Patient profile missing.', httpStatus: 404 }));
    }
    const list = await deps.appointments.listForPatient(patient.id);
    await deps.audit.record({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      action: 'read',
      entityType: 'appointment',
      entityId: patient.id,
      targetUserId: input.actorUserId,
      correlationId: input.correlationId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { count: list.length },
    });
    return ok(list);
  };
