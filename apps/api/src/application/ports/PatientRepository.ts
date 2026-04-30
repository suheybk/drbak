import type { Patient } from '../../domain/patient/Patient.js';
import type { PatientId, UserId } from '../../domain/shared/ids.js';

export interface PatientRepository {
  findById(id: PatientId): Promise<Patient | null>;
  findByUserId(userId: UserId): Promise<Patient | null>;
}
