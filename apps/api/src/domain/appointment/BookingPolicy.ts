import type { ConsentPurpose } from '../patient/Consent.js';
import { type Instant, isBefore } from '../shared/time.js';
/**
 * Pure decision: may this patient book this service at this slot?
 * No I/O. Caller assembles the inputs and acts on the answer.
 */
import type { DeliveryMode } from './Appointment.js';

export interface BookingContext {
  readonly patient: {
    readonly id: string;
    readonly dateOfBirth: string; // 'YYYY-MM-DD'
    readonly emailVerified: boolean;
    readonly hasGuardian: boolean;
    readonly guardianEmailVerified: boolean;
  };
  readonly service: {
    readonly id: string;
    readonly minPatientAgeYears: number;
    readonly maxPatientAgeYears: number | null;
    readonly deliveryModes: ReadonlyArray<DeliveryMode>;
    readonly requiresTmsScreening: boolean;
  };
  readonly chosenDeliveryMode: DeliveryMode;
  readonly slotStartsAt: Instant;
  readonly now: Instant;
  readonly tmsScreeningStatus:
    | 'cleared'
    | 'pending_review'
    | 'requires_review'
    | 'denied'
    | 'expired'
    | 'none';
  readonly grantedConsentPurposes: ReadonlySet<ConsentPurpose>;
}

export type BookingDecision =
  | { kind: 'allowed' }
  | {
      kind: 'denied';
      reason:
        | 'EMAIL_NOT_VERIFIED'
        | 'GUARDIAN_REQUIRED'
        | 'AGE_NOT_ELIGIBLE'
        | 'DELIVERY_MODE_NOT_OFFERED'
        | 'SLOT_IN_PAST'
        | 'TMS_SCREENING_REQUIRED'
        | 'TMS_SCREENING_DENIED'
        | 'CONSENT_MISSING';
      missingConsents?: ReadonlyArray<ConsentPurpose>;
    };

export const REQUIRED_CONSENTS_BASE: ReadonlyArray<ConsentPurpose> = [
  'appointment_booking',
  'health_data_processing',
];

export const calculateAgeYears = (dobIsoDate: string, now: Instant): number => {
  const dob = Date.parse(`${dobIsoDate}T00:00:00.000Z`);
  if (Number.isNaN(dob)) throw new RangeError(`bad dob: ${dobIsoDate}`);
  const ms = (now as number) - dob;
  return Math.floor(ms / (365.2425 * 24 * 3600 * 1000));
};

export class BookingPolicy {
  static decide(ctx: BookingContext): BookingDecision {
    if (!ctx.patient.emailVerified) {
      return { kind: 'denied', reason: 'EMAIL_NOT_VERIFIED' };
    }

    if (isBefore(ctx.slotStartsAt, ctx.now)) {
      return { kind: 'denied', reason: 'SLOT_IN_PAST' };
    }

    if (!ctx.service.deliveryModes.includes(ctx.chosenDeliveryMode)) {
      return { kind: 'denied', reason: 'DELIVERY_MODE_NOT_OFFERED' };
    }

    const age = calculateAgeYears(ctx.patient.dateOfBirth, ctx.now);
    if (age < ctx.service.minPatientAgeYears) {
      return { kind: 'denied', reason: 'AGE_NOT_ELIGIBLE' };
    }
    if (ctx.service.maxPatientAgeYears !== null && age > ctx.service.maxPatientAgeYears) {
      return { kind: 'denied', reason: 'AGE_NOT_ELIGIBLE' };
    }

    if (age < 18) {
      if (!ctx.patient.hasGuardian || !ctx.patient.guardianEmailVerified) {
        return { kind: 'denied', reason: 'GUARDIAN_REQUIRED' };
      }
    }

    if (ctx.service.requiresTmsScreening) {
      if (ctx.tmsScreeningStatus === 'denied') {
        return { kind: 'denied', reason: 'TMS_SCREENING_DENIED' };
      }
      if (ctx.tmsScreeningStatus !== 'cleared') {
        return { kind: 'denied', reason: 'TMS_SCREENING_REQUIRED' };
      }
    }

    const required: ConsentPurpose[] = [...REQUIRED_CONSENTS_BASE];
    if (age < 18) required.push('guardian_consent');
    if (ctx.service.requiresTmsScreening) required.push('tms_screening_data');

    const missing = required.filter((p) => !ctx.grantedConsentPurposes.has(p));
    if (missing.length > 0) {
      return { kind: 'denied', reason: 'CONSENT_MISSING', missingConsents: missing };
    }

    return { kind: 'allowed' };
  }
}
