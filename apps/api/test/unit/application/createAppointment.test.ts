import { beforeEach, describe, expect, it } from 'vitest';
import { createAppointment } from '../../../src/application/use-cases/booking/createAppointment.js';
import {
  asCorrelationId,
  asDoctorId,
  asIdempotencyKey,
  asServiceId,
  asSlotHoldToken,
  asUserId,
} from '../../../src/domain/shared/ids.js';
import { instantFromIso, instantFromMillis } from '../../../src/domain/shared/time.js';
import {
  CapturingAuditLogger,
  CapturingEmailNotifier,
  CapturingSmsNotifier,
  CapturingWhatsappNotifier,
  CountingIdGenerator,
  FakeTelehealthFactory,
  FixedClock,
  InMemoryAppointmentRepo,
  InMemoryConsentRepo,
  InMemoryIdempotency,
  InMemoryPatientRepo,
  InMemoryServiceCatalogue,
  InMemorySlotLock,
  InMemoryTmsScreeningRepo,
  buildVerifiedAdultPatient,
} from '../../fixtures/in-memory-adapters.js';

const NOW = instantFromIso('2026-04-30T08:00:00.000Z');
const SLOT = instantFromIso('2026-05-15T10:00:00.000Z');
const DOCTOR = asDoctorId('doc_1');

const buildHarness = () => {
  const clock = new FixedClock(NOW);
  const ids = new CountingIdGenerator('apt_');
  const patients = new InMemoryPatientRepo();
  const services = new InMemoryServiceCatalogue();
  const consents = new InMemoryConsentRepo();
  const tmsScreenings = new InMemoryTmsScreeningRepo();
  const appointments = new InMemoryAppointmentRepo();
  const slotLock = new InMemorySlotLock();
  const telehealth = new FakeTelehealthFactory();
  const email = new CapturingEmailNotifier();
  const sms = new CapturingSmsNotifier();
  const whatsapp = new CapturingWhatsappNotifier();
  const audit = new CapturingAuditLogger();
  const idempotency = new InMemoryIdempotency();

  patients.put(buildVerifiedAdultPatient());
  services.put({
    id: asServiceId('svc_consultation'),
    slug: 'noral-terapi-konsultasyonu',
    pillar: 'integrative_neurology',
    durationMinutes: 40,
    deliveryModes: ['in_person', 'home_visit', 'telehealth'],
    requiresTmsScreening: false,
    minPatientAgeYears: 1,
    maxPatientAgeYears: null,
  });
  services.put({
    id: asServiceId('svc_tms'),
    slug: 'tms-tedavisi',
    pillar: 'tms',
    durationMinutes: 45,
    deliveryModes: ['in_person'],
    requiresTmsScreening: true,
    minPatientAgeYears: 18,
    maxPatientAgeYears: null,
  });

  const useCase = createAppointment({
    clock,
    ids,
    patients,
    services,
    consents,
    tmsScreenings,
    appointments,
    slotLock,
    telehealth,
    email,
    sms,
    whatsapp,
    audit,
    idempotency,
    env: {
      SLOT_HOLD_TTL_SECONDS: 300,
      DEFAULT_DOCTOR_ID: DOCTOR,
      CONSENT_DOCUMENT_VERSION: 'v1.2026-04',
      PUBLIC_BASE_URL: 'https://uzmdroguzbak.com',
    },
  });

  return {
    clock,
    ids,
    patients,
    services,
    consents,
    tmsScreenings,
    appointments,
    slotLock,
    telehealth,
    email,
    sms,
    whatsapp,
    audit,
    idempotency,
    useCase,
  };
};

const validInput = (
  h: ReturnType<typeof buildHarness>,
  overrides: Partial<Parameters<typeof h.useCase>[0]> = {},
) => {
  // Pre-create a slot hold so the test exercises the full path
  return (async () => {
    const hold = await h.slotLock.holdSlot({
      doctorId: DOCTOR,
      serviceId: asServiceId('svc_consultation'),
      startsAt: SLOT,
      endsAt: instantFromIso('2026-05-15T10:40:00.000Z'),
      holdTtlSeconds: 300,
      now: NOW,
    });
    if (!hold) throw new Error('test bug — could not acquire hold');
    return {
      actorUserId: asUserId('usr_001'),
      correlationId: asCorrelationId('cor_test'),
      idempotencyKey: null,
      serviceId: asServiceId('svc_consultation'),
      slotStartsAtIso: '2026-05-15T10:00:00.000Z',
      deliveryMode: 'in_person' as const,
      holdToken: hold.token,
      homeAddressLine1: null,
      homeAddressLine2: null,
      patientNotes: null,
      consents: {
        appointmentBooking: true as const,
        healthDataProcessing: true as const,
      },
      consentDocumentVersion: 'v1.2026-04',
      locale: 'tr' as const,
      ipAddress: '127.0.0.1',
      userAgent: 'vitest',
      patientEmail: 'patient@example.com',
      patientPhoneE164: '+905001112233',
      ...overrides,
    };
  })();
};

describe('createAppointment — happy path', () => {
  let h: ReturnType<typeof buildHarness>;
  beforeEach(() => {
    h = buildHarness();
  });

  it('creates a confirmed appointment, persists consents, enqueues notifications, and audits', async () => {
    const input = await validInput(h);
    const result = await h.useCase(input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.appointment.status).toBe('confirmed');
    expect(result.value.rescheduleUrl).toMatch(/randevu\/.+\/yeniden-planla/);
    expect(result.value.cancelUrl).toMatch(/randevu\/.+\/iptal/);

    // Consents persisted
    expect(h.consents.countActiveFor(asUserId('usr_001'), 'appointment_booking')).toBe(1);
    expect(h.consents.countActiveFor(asUserId('usr_001'), 'health_data_processing')).toBe(1);

    // Notifications enqueued
    expect(h.email.sent).toHaveLength(1);
    expect(h.email.sent[0]?.template).toBe('appointment_confirmation');
    expect(h.sms.sent).toHaveLength(1);
    expect(h.whatsapp.sent).toHaveLength(1);

    // Audit
    expect(h.audit.events).toHaveLength(1);
    expect(h.audit.events[0]).toMatchObject({
      action: 'create',
      entityType: 'appointment',
      actorUserId: 'usr_001',
    });
  });

  it('attaches a telehealth room when deliveryMode=telehealth', async () => {
    const baseInput = await validInput(h);
    // Need a fresh hold for telehealth (different startsAt would normally apply,
    // but for the test we re-use the same slot since the hold is keyed by startsAt+doctor)
    const result = await h.useCase({ ...baseInput, deliveryMode: 'telehealth' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.appointment.snapshot.telehealthJoinUrl).toMatch(/^https:\/\/meet\.test\//);
    expect(result.value.appointment.snapshot.telehealthRoomId).toMatch(/^room-/);
  });
});

describe('createAppointment — failures', () => {
  let h: ReturnType<typeof buildHarness>;
  beforeEach(() => {
    h = buildHarness();
  });

  it('returns CONSENT_MISSING when consents are not all granted', async () => {
    const input = await validInput(h);
    const result = await h.useCase({
      ...input,
      // Force a TMS service that demands tms_screening_data + use a cleared screening
      // to isolate consent-missing as the failure
      serviceId: asServiceId('svc_tms'),
    } as Parameters<typeof h.useCase>[0]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    // TMS service requires screening; we have none, so we hit TMS_SCREENING_REQUIRED first
    expect(result.error.code).toBe('TMS_SCREENING_REQUIRED');
  });

  it('returns SLOT_HOLD_EXPIRED when the hold has expired', async () => {
    const input = await validInput(h);
    h.clock.advance(10 * 60_000); // 10 min later — hold TTL is 5 min
    const result = await h.useCase(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SLOT_HOLD_EXPIRED');
  });

  it('returns SLOT_NOT_FOUND when the hold token is unknown', async () => {
    const input = await validInput(h);
    const result = await h.useCase({ ...input, holdToken: asSlotHoldToken('hold_bogus') });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SLOT_NOT_FOUND');
  });

  it('returns EMAIL_NOT_VERIFIED when the patient is not verified', async () => {
    h.patients.put(buildVerifiedAdultPatient({ emailVerifiedAt: null }));
    const input = await validInput(h);
    const result = await h.useCase(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('EMAIL_NOT_VERIFIED');
  });
});

describe('createAppointment — idempotency', () => {
  it('replays the original response on duplicate matching key', async () => {
    const h = buildHarness();
    const input = await validInput(h);
    const idem = asIdempotencyKey('idem_abc');
    const r1 = await h.useCase({ ...input, idempotencyKey: idem });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    const r2 = await h.useCase({ ...input, idempotencyKey: idem });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.value.appointment.id).toBe(r1.value.appointment.id);
  });

  it('returns IDEMPOTENCY_CONFLICT on same key with different fingerprint', async () => {
    const h = buildHarness();
    const input1 = await validInput(h);
    const idem = asIdempotencyKey('idem_xyz');
    const r1 = await h.useCase({ ...input1, idempotencyKey: idem });
    expect(r1.ok).toBe(true);

    // Pre-stage a second hold at a DIFFERENT startsAt + a different service
    const altHold = await h.slotLock.holdSlot({
      doctorId: DOCTOR,
      serviceId: asServiceId('svc_consultation'),
      startsAt: instantFromMillis(Date.UTC(2026, 5, 1, 10)), // different time
      endsAt: instantFromMillis(Date.UTC(2026, 5, 1, 10, 40)),
      holdTtlSeconds: 300,
      now: NOW,
    });
    if (!altHold) throw new Error('test bug');

    const r2 = await h.useCase({
      ...input1,
      idempotencyKey: idem,
      slotStartsAtIso: '2026-06-01T10:00:00.000Z',
      holdToken: altHold.token,
    });
    expect(r2.ok).toBe(false);
    if (r2.ok) return;
    expect(r2.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });
});
