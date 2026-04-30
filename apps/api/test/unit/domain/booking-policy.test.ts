import { describe, expect, it } from 'vitest';
import {
  type BookingContext,
  BookingPolicy,
} from '../../../src/domain/appointment/BookingPolicy.js';
import type { ConsentPurpose } from '../../../src/domain/patient/Consent.js';
import { instantFromIso } from '../../../src/domain/shared/time.js';

const NOW = instantFromIso('2026-04-30T12:00:00.000Z');

const baseCtx = (overrides: Partial<BookingContext> = {}): BookingContext => ({
  patient: {
    id: 'pat_1',
    dateOfBirth: '1985-06-15',
    emailVerified: true,
    hasGuardian: false,
    guardianEmailVerified: false,
  },
  service: {
    id: 'svc_1',
    minPatientAgeYears: 1,
    maxPatientAgeYears: null,
    deliveryModes: ['in_person', 'telehealth'],
    requiresTmsScreening: false,
  },
  chosenDeliveryMode: 'in_person',
  slotStartsAt: instantFromIso('2026-05-01T10:00:00.000Z'),
  now: NOW,
  tmsScreeningStatus: 'none',
  grantedConsentPurposes: new Set<ConsentPurpose>([
    'appointment_booking',
    'health_data_processing',
  ]),
  ...overrides,
});

describe('BookingPolicy.decide', () => {
  it('allows a fully-eligible adult booking', () => {
    expect(BookingPolicy.decide(baseCtx()).kind).toBe('allowed');
  });

  it('denies if email not verified', () => {
    const d = BookingPolicy.decide(
      baseCtx({
        patient: { ...baseCtx().patient, emailVerified: false },
      }),
    );
    expect(d).toEqual({ kind: 'denied', reason: 'EMAIL_NOT_VERIFIED' });
  });

  it('denies if slot is in the past', () => {
    const d = BookingPolicy.decide(
      baseCtx({ slotStartsAt: instantFromIso('2024-01-01T00:00:00.000Z') }),
    );
    expect(d).toEqual({ kind: 'denied', reason: 'SLOT_IN_PAST' });
  });

  it('denies a delivery mode the service does not offer', () => {
    const d = BookingPolicy.decide(baseCtx({ chosenDeliveryMode: 'home_visit' }));
    expect(d).toEqual({ kind: 'denied', reason: 'DELIVERY_MODE_NOT_OFFERED' });
  });

  it('denies an underage patient with no guardian', () => {
    const d = BookingPolicy.decide(
      baseCtx({
        patient: {
          id: 'pat_kid',
          dateOfBirth: '2015-01-01', // 11 years old at NOW
          emailVerified: true,
          hasGuardian: false,
          guardianEmailVerified: false,
        },
      }),
    );
    expect(d).toEqual({ kind: 'denied', reason: 'GUARDIAN_REQUIRED' });
  });

  it('requires guardian_consent for minors with guardian', () => {
    const d = BookingPolicy.decide(
      baseCtx({
        patient: {
          id: 'pat_kid',
          dateOfBirth: '2015-01-01',
          emailVerified: true,
          hasGuardian: true,
          guardianEmailVerified: true,
        },
        // base set lacks 'guardian_consent'
      }),
    );
    expect(d.kind).toBe('denied');
    if (d.kind === 'denied') {
      expect(d.reason).toBe('CONSENT_MISSING');
      expect(d.missingConsents).toContain('guardian_consent');
    }
  });

  it('requires TMS screening to be cleared for TMS service', () => {
    const ctx = baseCtx({
      service: {
        id: 'svc_tms',
        minPatientAgeYears: 18,
        maxPatientAgeYears: null,
        deliveryModes: ['in_person'],
        requiresTmsScreening: true,
      },
      tmsScreeningStatus: 'none',
    });
    expect(BookingPolicy.decide(ctx)).toEqual({
      kind: 'denied',
      reason: 'TMS_SCREENING_REQUIRED',
    });
  });

  it('blocks when TMS screening is denied', () => {
    const ctx = baseCtx({
      service: {
        id: 'svc_tms',
        minPatientAgeYears: 18,
        maxPatientAgeYears: null,
        deliveryModes: ['in_person'],
        requiresTmsScreening: true,
      },
      tmsScreeningStatus: 'denied',
    });
    expect(BookingPolicy.decide(ctx)).toEqual({
      kind: 'denied',
      reason: 'TMS_SCREENING_DENIED',
    });
  });

  it('allows TMS booking with cleared screening AND tms_screening_data consent', () => {
    const ctx = baseCtx({
      service: {
        id: 'svc_tms',
        minPatientAgeYears: 18,
        maxPatientAgeYears: null,
        deliveryModes: ['in_person'],
        requiresTmsScreening: true,
      },
      tmsScreeningStatus: 'cleared',
      grantedConsentPurposes: new Set<ConsentPurpose>([
        'appointment_booking',
        'health_data_processing',
        'tms_screening_data',
      ]),
    });
    expect(BookingPolicy.decide(ctx).kind).toBe('allowed');
  });

  it('respects the maxPatientAgeYears upper bound', () => {
    const ctx = baseCtx({
      patient: {
        id: 'pat_old',
        dateOfBirth: '1900-01-01',
        emailVerified: true,
        hasGuardian: false,
        guardianEmailVerified: false,
      },
      service: {
        id: 'svc_pediatric',
        minPatientAgeYears: 1,
        maxPatientAgeYears: 17,
        deliveryModes: ['in_person'],
        requiresTmsScreening: false,
      },
    });
    expect(BookingPolicy.decide(ctx).kind).toBe('denied');
  });
});
