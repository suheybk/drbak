import type { Appointment } from '../../domain/appointment/Appointment.js';
import type { AppointmentId, IdempotencyKey, PatientId } from '../../domain/shared/ids.js';

export interface AppointmentRepository {
  findById(id: AppointmentId): Promise<Appointment | null>;
  findByIdempotencyKey(key: IdempotencyKey): Promise<Appointment | null>;
  listForPatient(patientId: PatientId): Promise<ReadonlyArray<Appointment>>;
  save(appointment: Appointment): Promise<void>;
}
