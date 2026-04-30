import { describe, expect, it } from 'vitest';
import { Appointment } from '../../../src/domain/appointment/Appointment.js';
import {
  asAppointmentId,
  asCorrelationId,
  asDoctorId,
  asPatientId,
  asServiceId,
  asUserId,
} from '../../../src/domain/shared/ids.js';
import {
  durationMinutes,
  instantFromIso,
  instantFromMillis,
} from '../../../src/domain/shared/time.js';
import { DomainError } from '../../../src/domain/shared/errors.js';

const baseInput = () => ({
  id: asAppointmentId('apt_1'),
  patientId: asPatientId('pat_1'),
  doctorId: asDoctorId('doc_1'),
  serviceId: asServiceId('svc_1'),
  deliveryMode: 'in_person' as const,
  startsAt: instantFromIso('2026-06-01T10:00:00.000Z'),
  durationMinutes: durationMinutes(40),
  correlationId: asCorrelationId('cor_1'),
  idempotencyKey: null,
  locale: 'tr' as const,
  now: instantFromIso('2026-05-01T08:00:00.000Z'),
});

describe('Appointment.create', () => {
  it('starts in CREATED with one transition entry', () => {
    const a = Appointment.create(baseInput());
    expect(a.status).toBe('created');
    expect(a.snapshot.statusHistory).toHaveLength(1);
    expect(a.snapshot.statusHistory[0]).toMatchObject({ from: null, to: 'created' });
  });

  it('computes endsAt from startsAt + duration', () => {
    const a = Appointment.create(baseInput());
    expect(a.snapshot.endsAt).toBe(instantFromIso('2026-06-01T10:40:00.000Z'));
  });

  it('rejects home_visit without homeAddressLine1', () => {
    expect(() =>
      Appointment.create({ ...baseInput(), deliveryMode: 'home_visit' }),
    ).toThrow(/home visit requires homeAddressLine1/);
  });
});

describe('Appointment.confirm', () => {
  it('moves CREATED → CONFIRMED and records the transition', () => {
    const a = Appointment.create(baseInput()).confirm({
      now: instantFromIso('2026-05-01T08:00:01.000Z'),
      actorUserId: asUserId('usr_1'),
    });
    expect(a.status).toBe('confirmed');
    expect(a.snapshot.statusHistory).toHaveLength(2);
    expect(a.snapshot.statusHistory[1]).toMatchObject({ from: 'created', to: 'confirmed' });
  });
});

describe('Appointment.cancelByPatient', () => {
  const confirmed = () =>
    Appointment.create(baseInput()).confirm({
      now: instantFromIso('2026-05-01T08:00:01.000Z'),
      actorUserId: asUserId('usr_1'),
    });

  it('within window → CANCELLED_BY_PATIENT', () => {
    const a = confirmed().cancelByPatient({
      now: instantFromIso('2026-05-31T09:00:00.000Z'), // > 24h before slot
      actorUserId: asUserId('usr_1'),
      reason: 'cant make it',
      cancelDeadline: instantFromIso('2026-05-31T10:00:00.000Z'),
    });
    expect(a.status).toBe('cancelled_by_patient');
    expect(a.snapshot.cancelReason).toBe('cant make it');
    expect(a.snapshot.cancelledAt).not.toBeNull();
  });

  it('outside window → LATE_CANCELLATION', () => {
    const a = confirmed().cancelByPatient({
      now: instantFromIso('2026-06-01T09:30:00.000Z'),
      actorUserId: asUserId('usr_1'),
      reason: 'sick',
      cancelDeadline: instantFromIso('2026-05-31T10:00:00.000Z'),
    });
    expect(a.status).toBe('late_cancellation');
  });

  it('rejects when already terminal', () => {
    const a = confirmed().cancelByPatient({
      now: instantFromIso('2026-05-15T10:00:00.000Z'),
      actorUserId: asUserId('usr_1'),
      reason: null,
      cancelDeadline: instantFromIso('2026-05-31T10:00:00.000Z'),
    });
    expect(() =>
      a.cancelByPatient({
        now: instantFromIso('2026-05-16T10:00:00.000Z'),
        actorUserId: asUserId('usr_1'),
        reason: null,
        cancelDeadline: instantFromIso('2026-05-31T10:00:00.000Z'),
      }),
    ).toThrow();
  });
});

describe('Appointment.markCompleted', () => {
  it('completes a confirmed appointment', () => {
    const a = Appointment.create(baseInput())
      .confirm({ now: instantFromIso('2026-05-01T08:00:01.000Z'), actorUserId: null })
      .markCompleted({
        now: instantFromIso('2026-06-01T10:45:00.000Z'),
        actorUserId: asUserId('usr_staff'),
      });
    expect(a.status).toBe('completed');
    expect(a.snapshot.completedAt).not.toBeNull();
  });

  it('refuses to complete a non-confirmed appointment', () => {
    const a = Appointment.create(baseInput());
    expect(() =>
      a.markCompleted({
        now: instantFromIso('2026-06-01T10:45:00.000Z'),
        actorUserId: null,
      }),
    ).toThrow(DomainError);
  });
});

describe('Appointment.markNoShow', () => {
  const confirmed = () =>
    Appointment.create(baseInput()).confirm({
      now: instantFromIso('2026-05-01T08:00:01.000Z'),
      actorUserId: null,
    });

  it('rejects within startsAt + 30min grace', () => {
    expect(() =>
      confirmed().markNoShow({
        now: instantFromIso('2026-06-01T10:15:00.000Z'),
        actorUserId: null,
      }),
    ).toThrow();
  });

  it('accepts after startsAt + 30min', () => {
    const a = confirmed().markNoShow({
      now: instantFromIso('2026-06-01T10:31:00.000Z'),
      actorUserId: null,
    });
    expect(a.status).toBe('no_show');
  });
});

describe('Appointment.attachTelehealth', () => {
  it('rejects on non-telehealth delivery mode', () => {
    const a = Appointment.create(baseInput());
    expect(() =>
      a.attachTelehealth({
        roomId: 'r1',
        joinUrl: 'https://meet.test/r1',
        expiresAt: instantFromMillis(Date.UTC(2026, 5, 1, 11)),
        now: instantFromIso('2026-05-01T08:00:01.000Z'),
      }),
    ).toThrow(DomainError);
  });

  it('attaches room data on telehealth delivery mode', () => {
    const a = Appointment.create({ ...baseInput(), deliveryMode: 'telehealth' });
    const updated = a.attachTelehealth({
      roomId: 'r1',
      joinUrl: 'https://meet.test/r1',
      expiresAt: instantFromMillis(Date.UTC(2026, 5, 1, 11)),
      now: instantFromIso('2026-05-01T08:00:01.000Z'),
    });
    expect(updated.snapshot.telehealthRoomId).toBe('r1');
    expect(updated.snapshot.telehealthJoinUrl).toBe('https://meet.test/r1');
  });
});

describe('Appointment status machine', () => {
  it('rejects forbidden transitions (e.g., completed → cancelled)', () => {
    const completed = Appointment.create(baseInput())
      .confirm({ now: instantFromIso('2026-05-01T08:00:01.000Z'), actorUserId: null })
      .markCompleted({
        now: instantFromIso('2026-06-01T10:45:00.000Z'),
        actorUserId: null,
      });
    expect(() =>
      completed.cancelByPatient({
        now: instantFromIso('2026-06-02T08:00:00.000Z'),
        actorUserId: asUserId('usr_1'),
        reason: null,
        cancelDeadline: instantFromIso('2026-06-02T08:00:00.000Z'),
      }),
    ).toThrow();
  });
});
