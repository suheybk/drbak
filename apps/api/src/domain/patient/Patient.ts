import type { PatientId, UserId } from '../shared/ids.js';
import type { Instant } from '../shared/time.js';
import { calculateAgeYears } from '../appointment/BookingPolicy.js';

export interface PatientSnapshot {
  readonly id: PatientId;
  readonly userId: UserId;
  readonly fullName: string;
  readonly dateOfBirth: string; // YYYY-MM-DD
  readonly gender: string | null;
  readonly phoneE164: string | null;
  readonly addressLine1: string | null;
  readonly addressLine2: string | null;
  readonly city: string | null;
  readonly postalCode: string | null;
  readonly countryIso2: string;
  readonly emergencyContactName: string | null;
  readonly emergencyContactPhoneE164: string | null;
  readonly guardianPatientId: PatientId | null;
  readonly emailVerifiedAt: Instant | null;
  readonly locale: 'tr' | 'ar' | 'en' | 'fr' | 'es';
  readonly createdAt: Instant;
  readonly updatedAt: Instant;
  readonly deletedAt: Instant | null;
}

export class Patient {
  private constructor(private readonly s: PatientSnapshot) {}

  static rehydrate(s: PatientSnapshot): Patient {
    return new Patient(s);
  }

  get snapshot(): PatientSnapshot {
    return this.s;
  }

  get id(): PatientId {
    return this.s.id;
  }

  get isEmailVerified(): boolean {
    return this.s.emailVerifiedAt !== null;
  }

  ageAt(now: Instant): number {
    return calculateAgeYears(this.s.dateOfBirth, now);
  }

  isMinor(now: Instant): boolean {
    return this.ageAt(now) < 18;
  }
}
