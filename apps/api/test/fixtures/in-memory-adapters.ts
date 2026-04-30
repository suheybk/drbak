/**
 * In-memory implementations of every port. Used by use-case tests so they
 * exercise the real orchestration without real DBs/queues/workers.
 *
 * These adapters are explicit, simple, and reset per-test.
 */

import type {
  AppointmentRepository,
  AuditEvent,
  AuditLogger,
  Clock,
  ConsentRepository,
  EmailNotifier,
  IdGenerator,
  IdempotencyStore,
  OutboundEmail,
  OutboundSms,
  OutboundWhatsapp,
  PatientRepository,
  ServiceCatalogue,
  ServiceCatalogueEntry,
  SlotLockService,
  SmsNotifier,
  TelehealthRoom,
  TelehealthRoomFactory,
  TmsScreening,
  TmsScreeningRepository,
  WhatsappNotifier,
} from '../../src/application/ports/index.js';
import type { Appointment } from '../../src/domain/appointment/Appointment.js';
import {
  type ConsentPurpose,
  type ConsentRecord,
  isActive,
} from '../../src/domain/patient/Consent.js';
import { Patient, type PatientSnapshot } from '../../src/domain/patient/Patient.js';
import {
  type AppointmentId,
  asConsentDocumentId,
  asConsentRecordId,
  asPatientId,
  asUserId,
  type DoctorId,
  type IdempotencyKey,
  type PatientId,
  type ServiceId,
  type SlotHoldToken,
  type UserId,
} from '../../src/domain/shared/ids.js';
import { instantFromMillis, type Instant } from '../../src/domain/shared/time.js';

/* ──────────────── Clock + IdGenerator ──────────────── */

export class FixedClock implements Clock {
  constructor(private current: Instant) {}
  now(): Instant {
    return this.current;
  }
  set(t: Instant): void {
    this.current = t;
  }
  advance(ms: number): void {
    this.current = instantFromMillis((this.current as number) + ms);
  }
}

export class CountingIdGenerator implements IdGenerator {
  private n = 0;
  constructor(private readonly prefix = 'id_') {}
  generate(): string {
    this.n += 1;
    return `${this.prefix}${this.n.toString().padStart(8, '0')}`;
  }
}

/* ──────────────── Patient + Service ──────────────── */

export class InMemoryPatientRepo implements PatientRepository {
  private readonly byId = new Map<string, Patient>();
  private readonly byUserId = new Map<string, Patient>();
  put(p: Patient): void {
    this.byId.set(p.id, p);
    this.byUserId.set(p.snapshot.userId, p);
  }
  async findById(id: PatientId): Promise<Patient | null> {
    return this.byId.get(id) ?? null;
  }
  async findByUserId(userId: UserId): Promise<Patient | null> {
    return this.byUserId.get(userId) ?? null;
  }
}

export class InMemoryServiceCatalogue implements ServiceCatalogue {
  private readonly byId = new Map<string, ServiceCatalogueEntry>();
  put(s: ServiceCatalogueEntry): void {
    this.byId.set(s.id, s);
  }
  async findById(id: ServiceId): Promise<ServiceCatalogueEntry | null> {
    return this.byId.get(id) ?? null;
  }
}

/* ──────────────── Consent + TMS ──────────────── */

export class InMemoryConsentRepo implements ConsentRepository {
  readonly records: ConsentRecord[] = [];
  async listForUser(userId: UserId): Promise<ReadonlyArray<ConsentRecord>> {
    return this.records.filter((r) => r.userId === userId);
  }
  async record(input: {
    id: string;
    userId: UserId;
    purpose: ConsentPurpose;
    consentDocumentVersion: string;
    granted: boolean;
    ipAddress: string | null;
    userAgent: string | null;
    locale: 'tr' | 'ar' | 'en' | 'fr' | 'es';
  }): Promise<ConsentRecord> {
    const r: ConsentRecord = {
      id: asConsentRecordId(input.id),
      userId: input.userId,
      purpose: input.purpose,
      consentDocumentId: asConsentDocumentId(`doc_${input.consentDocumentVersion}`),
      granted: input.granted,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      locale: input.locale,
      grantedAt: instantFromMillis(Date.now()),
      withdrawnAt: null,
    };
    this.records.push(r);
    return r;
  }
  async withdraw(consentRecordId: string): Promise<void> {
    const r = this.records.find((r) => r.id === consentRecordId);
    if (r) {
      const idx = this.records.indexOf(r);
      this.records[idx] = { ...r, withdrawnAt: instantFromMillis(Date.now()) };
    }
  }
  countActiveFor(userId: UserId, purpose: ConsentPurpose): number {
    return this.records.filter(
      (r) => r.userId === userId && r.purpose === purpose && isActive(r),
    ).length;
  }
}

export class InMemoryTmsScreeningRepo implements TmsScreeningRepository {
  readonly screenings = new Map<string, TmsScreening>();
  private keyOf(p: PatientId, d: DoctorId): string {
    return `${p}::${d}`;
  }
  put(s: TmsScreening): void {
    this.screenings.set(this.keyOf(s.patientId, s.doctorId), s);
  }
  async findActive(p: PatientId, d: DoctorId, now: Instant): Promise<TmsScreening | null> {
    const s = this.screenings.get(this.keyOf(p, d));
    if (!s) return null;
    if ((s.expiresAt as number) < (now as number)) return null;
    return s;
  }
  async upsertFromEvaluation(): Promise<TmsScreening> {
    throw new Error('not used in createAppointment tests');
  }
}

/* ──────────────── Appointment + Slot ──────────────── */

export class InMemoryAppointmentRepo implements AppointmentRepository {
  readonly byId = new Map<string, Appointment>();
  readonly byIdempotencyKey = new Map<string, Appointment>();
  async findById(id: AppointmentId): Promise<Appointment | null> {
    return this.byId.get(id) ?? null;
  }
  async findByIdempotencyKey(k: IdempotencyKey): Promise<Appointment | null> {
    return this.byIdempotencyKey.get(k) ?? null;
  }
  async listForPatient(): Promise<ReadonlyArray<Appointment>> {
    return [...this.byId.values()];
  }
  async save(a: Appointment): Promise<void> {
    this.byId.set(a.id, a);
    if (a.snapshot.idempotencyKey) this.byIdempotencyKey.set(a.snapshot.idempotencyKey, a);
  }
}

export class InMemorySlotLock implements SlotLockService {
  private holds = new Map<string, { token: string; expiresAt: Instant; doctorId: string; startsAt: Instant }>();
  private booked = new Map<string, { appointmentId: string }>(); // `${doctorId}:${startsAtMs}` → record
  forceExpireHolds(now: Instant): void {
    for (const [k, h] of this.holds) {
      if ((h.expiresAt as number) < (now as number)) this.holds.delete(k);
    }
  }
  async holdSlot(input: {
    doctorId: string;
    serviceId: string;
    startsAt: Instant;
    endsAt: Instant;
    holdTtlSeconds: number;
    now: Instant;
  }): Promise<{ token: SlotHoldToken; expiresAt: Instant } | null> {
    this.forceExpireHolds(input.now);
    const key = `${input.doctorId}:${input.startsAt as number}`;
    if (this.booked.has(key)) return null;
    if ([...this.holds.values()].some((h) => h.doctorId === input.doctorId && h.startsAt === input.startsAt))
      return null;
    const token = `hold_${this.holds.size + 1}` as SlotHoldToken;
    const expiresAt = instantFromMillis(
      (input.now as number) + input.holdTtlSeconds * 1000,
    );
    this.holds.set(token, {
      token,
      expiresAt,
      doctorId: input.doctorId,
      startsAt: input.startsAt,
    });
    return { token, expiresAt };
  }
  async confirmAppointment(input: {
    token: SlotHoldToken;
    doctorId: string;
    startsAt: Instant;
    endsAt: Instant;
    now: Instant;
    appointmentId: AppointmentId;
  }): Promise<'confirmed' | 'hold_expired' | 'hold_invalid' | 'slot_taken'> {
    const h = this.holds.get(input.token);
    if (!h) return 'hold_invalid';
    if (h.doctorId !== input.doctorId || h.startsAt !== input.startsAt) return 'hold_invalid';
    if ((h.expiresAt as number) < (input.now as number)) {
      this.holds.delete(input.token);
      return 'hold_expired';
    }
    const key = `${input.doctorId}:${input.startsAt as number}`;
    if (this.booked.has(key)) return 'slot_taken';
    this.booked.set(key, { appointmentId: input.appointmentId });
    this.holds.delete(input.token);
    return 'confirmed';
  }
  async releaseHold(input: { token: SlotHoldToken }): Promise<void> {
    this.holds.delete(input.token);
  }
  async releaseBooking(input: {
    doctorId: DoctorId;
    startsAt: Instant;
    appointmentId: AppointmentId;
  }): Promise<void> {
    const key = `${input.doctorId}:${input.startsAt as number}`;
    const booked = this.booked.get(key);
    if (booked && booked.appointmentId === input.appointmentId) {
      this.booked.delete(key);
    }
  }
}

/* ──────────────── Notifiers + audit + idempotency + telehealth ──────────────── */

export class CapturingEmailNotifier implements EmailNotifier {
  readonly sent: OutboundEmail[] = [];
  async enqueue(m: OutboundEmail): Promise<void> {
    this.sent.push(m);
  }
}
export class CapturingSmsNotifier implements SmsNotifier {
  readonly sent: OutboundSms[] = [];
  async enqueue(m: OutboundSms): Promise<void> {
    this.sent.push(m);
  }
}
export class CapturingWhatsappNotifier implements WhatsappNotifier {
  readonly sent: OutboundWhatsapp[] = [];
  async enqueue(m: OutboundWhatsapp): Promise<void> {
    this.sent.push(m);
  }
}
export class CapturingAuditLogger implements AuditLogger {
  readonly events: AuditEvent[] = [];
  async record(e: AuditEvent): Promise<void> {
    this.events.push(e);
  }
}

export class InMemoryIdempotency implements IdempotencyStore {
  private store = new Map<string, { fingerprint: string; response?: string }>();
  async claim(input: { key: string; fingerprint: string; ttlSeconds: number }) {
    const existing = this.store.get(input.key);
    if (!existing) {
      this.store.set(input.key, { fingerprint: input.fingerprint });
      return 'fresh' as const;
    }
    return existing.fingerprint === input.fingerprint
      ? ('duplicate_match' as const)
      : ('duplicate_mismatch' as const);
  }
  async loadResponse(key: string): Promise<string | null> {
    return this.store.get(key)?.response ?? null;
  }
  async storeResponse(key: string, body: string): Promise<void> {
    const e = this.store.get(key);
    if (e) e.response = body;
  }
}

export class FakeTelehealthFactory implements TelehealthRoomFactory {
  async createRoom(input: { appointmentId: string; startsAt: Instant; endsAt: Instant }): Promise<TelehealthRoom> {
    return {
      roomId: `room-${input.appointmentId}`,
      joinUrl: `https://meet.test/${input.appointmentId}`,
      expiresAt: instantFromMillis((input.endsAt as number) + 30 * 60_000),
    };
  }
}

/* ──────────────── Builders ──────────────── */

export const buildVerifiedAdultPatient = (overrides: Partial<PatientSnapshot> = {}): Patient => {
  const now = instantFromMillis(Date.UTC(2026, 0, 1));
  const snap: PatientSnapshot = {
    id: asPatientId('pat_001'),
    userId: asUserId('usr_001'),
    fullName: 'Test Patient',
    dateOfBirth: '1985-06-15',
    gender: null,
    phoneE164: '+905001112233',
    addressLine1: null,
    addressLine2: null,
    city: 'Istanbul',
    postalCode: null,
    countryIso2: 'TR',
    emergencyContactName: null,
    emergencyContactPhoneE164: null,
    guardianPatientId: null,
    emailVerifiedAt: now,
    locale: 'tr',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
  return Patient.rehydrate(snap);
};
