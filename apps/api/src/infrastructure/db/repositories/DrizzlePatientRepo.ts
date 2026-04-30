import type { Locale } from '@dr-bak/contracts';
import { and, eq, isNull } from 'drizzle-orm';
import type { PatientRepository } from '../../../application/ports/index.js';
import { Patient } from '../../../domain/patient/Patient.js';
import { type PatientId, type UserId, asPatientId, asUserId } from '../../../domain/shared/ids.js';
import { instantFromMillis } from '../../../domain/shared/time.js';
import type { Db } from '../client.js';
import { patients, users } from '../schema.js';

const toPatient = (
  row: typeof patients.$inferSelect,
  user: { emailVerifiedAt: Date | null; locale: string },
): Patient =>
  Patient.rehydrate({
    id: asPatientId(row.id),
    userId: asUserId(row.userId),
    fullName: row.fullName,
    dateOfBirth: row.dateOfBirth, // already YYYY-MM-DD from pg date column
    gender: row.gender,
    phoneE164: row.phoneE164,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    city: row.city,
    postalCode: row.postalCode,
    countryIso2: row.countryIso2,
    emergencyContactName: row.emergencyContactName,
    emergencyContactPhoneE164: row.emergencyContactPhoneE164,
    guardianPatientId: row.guardianPatientId ? asPatientId(row.guardianPatientId) : null,
    emailVerifiedAt: user.emailVerifiedAt
      ? instantFromMillis(user.emailVerifiedAt.getTime())
      : null,
    locale: user.locale as Locale,
    createdAt: instantFromMillis(row.createdAt.getTime()),
    updatedAt: instantFromMillis(row.updatedAt.getTime()),
    deletedAt: row.deletedAt ? instantFromMillis(row.deletedAt.getTime()) : null,
  });

export class DrizzlePatientRepo implements PatientRepository {
  constructor(private readonly db: Db) {}

  async findById(id: PatientId): Promise<Patient | null> {
    const rows = await this.db
      .select({ p: patients, emailVerifiedAt: users.emailVerifiedAt, locale: users.locale })
      .from(patients)
      .innerJoin(users, eq(users.id, patients.userId))
      .where(and(eq(patients.id, id), isNull(patients.deletedAt)))
      .limit(1);
    return rows[0]
      ? toPatient(rows[0].p, {
          emailVerifiedAt: rows[0].emailVerifiedAt,
          locale: rows[0].locale,
        })
      : null;
  }

  async findByUserId(userId: UserId): Promise<Patient | null> {
    const rows = await this.db
      .select({ p: patients, emailVerifiedAt: users.emailVerifiedAt, locale: users.locale })
      .from(patients)
      .innerJoin(users, eq(users.id, patients.userId))
      .where(and(eq(patients.userId, userId), isNull(patients.deletedAt)))
      .limit(1);
    return rows[0]
      ? toPatient(rows[0].p, {
          emailVerifiedAt: rows[0].emailVerifiedAt,
          locale: rows[0].locale,
        })
      : null;
  }
}
