import { DomainError } from '../shared/errors.js';
import type {
  AppointmentId,
  CorrelationId,
  DoctorId,
  IdempotencyKey,
  PatientId,
  ServiceId,
  UserId,
} from '../shared/ids.js';
import {
  type DurationMinutes,
  type Instant,
  addMinutes,
  isAfter,
  isBefore,
} from '../shared/time.js';
import { type AppointmentStatus, canTransition, isTerminal } from './AppointmentStatus.js';
import { AppointmentTerminal } from './errors.js';

export type DeliveryMode = 'in_person' | 'home_visit' | 'telehealth';

export interface StatusTransition {
  readonly from: AppointmentStatus | null;
  readonly to: AppointmentStatus;
  readonly actorUserId: UserId | null;
  readonly reason: string | null;
  readonly at: Instant;
}

export interface AppointmentSnapshot {
  readonly id: AppointmentId;
  readonly patientId: PatientId;
  readonly doctorId: DoctorId;
  readonly serviceId: ServiceId;
  readonly deliveryMode: DeliveryMode;
  readonly startsAt: Instant;
  readonly endsAt: Instant;
  readonly status: AppointmentStatus;
  readonly statusHistory: ReadonlyArray<StatusTransition>;
  readonly correlationId: CorrelationId;
  readonly idempotencyKey: IdempotencyKey | null;
  readonly homeAddressLine1: string | null;
  readonly homeAddressLine2: string | null;
  readonly telehealthRoomId: string | null;
  readonly telehealthJoinUrl: string | null;
  readonly telehealthExpiresAt: Instant | null;
  readonly patientNotes: string | null;
  readonly cancelReason: string | null;
  readonly cancelledAt: Instant | null;
  readonly completedAt: Instant | null;
  readonly createdAt: Instant;
  readonly updatedAt: Instant;
  readonly locale: 'tr' | 'ar' | 'en' | 'fr' | 'es';
  readonly rescheduledFromAppointmentId: AppointmentId | null;
}

/**
 * Aggregate root. Constructed via static `create` (new bookings) or `rehydrate` (from DB).
 * State changes go through methods that return a new Appointment + emit a transition.
 *
 * Invariants enforced here:
 *   1. startsAt < endsAt
 *   2. duration matches expected (caller asserts service duration; we assert positive)
 *   3. Status transitions follow the AppointmentStatus state machine
 *   4. No mutation after a terminal status
 *   5. Telehealth fields populated iff deliveryMode === 'telehealth'
 *
 * Cross-aggregate invariants (consents present, screening cleared, slot available)
 * are enforced by the createAppointment use case before constructing.
 */
export class Appointment {
  private constructor(private readonly s: AppointmentSnapshot) {}

  static create(input: {
    id: AppointmentId;
    patientId: PatientId;
    doctorId: DoctorId;
    serviceId: ServiceId;
    deliveryMode: DeliveryMode;
    startsAt: Instant;
    durationMinutes: DurationMinutes;
    correlationId: CorrelationId;
    idempotencyKey: IdempotencyKey | null;
    homeAddressLine1?: string | null;
    homeAddressLine2?: string | null;
    patientNotes?: string | null;
    locale: 'tr' | 'ar' | 'en' | 'fr' | 'es';
    now: Instant;
  }): Appointment {
    const endsAt = addMinutes(input.startsAt, input.durationMinutes);
    if (isAfter(input.startsAt, endsAt) || input.startsAt === endsAt) {
      throw new RangeError('startsAt must be < endsAt');
    }
    if (input.deliveryMode === 'home_visit' && !input.homeAddressLine1) {
      throw new RangeError('home visit requires homeAddressLine1');
    }

    const initialTransition: StatusTransition = {
      from: null,
      to: 'created',
      actorUserId: null,
      reason: null,
      at: input.now,
    };

    return new Appointment({
      id: input.id,
      patientId: input.patientId,
      doctorId: input.doctorId,
      serviceId: input.serviceId,
      deliveryMode: input.deliveryMode,
      startsAt: input.startsAt,
      endsAt,
      status: 'created',
      statusHistory: [initialTransition],
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      homeAddressLine1: input.homeAddressLine1 ?? null,
      homeAddressLine2: input.homeAddressLine2 ?? null,
      telehealthRoomId: null,
      telehealthJoinUrl: null,
      telehealthExpiresAt: null,
      patientNotes: input.patientNotes ?? null,
      cancelReason: null,
      cancelledAt: null,
      completedAt: null,
      createdAt: input.now,
      updatedAt: input.now,
      locale: input.locale,
      rescheduledFromAppointmentId: null,
    });
  }

  static rehydrate(snapshot: AppointmentSnapshot): Appointment {
    return new Appointment(snapshot);
  }

  get snapshot(): AppointmentSnapshot {
    return this.s;
  }

  get id(): AppointmentId {
    return this.s.id;
  }
  get status(): AppointmentStatus {
    return this.s.status;
  }
  get isTerminal(): boolean {
    return isTerminal(this.s.status);
  }

  /** Mark CONFIRMED — typically immediately after CREATED in the same use case. */
  confirm(opts: { now: Instant; actorUserId: UserId | null }): Appointment {
    return this.transition('confirmed', opts.actorUserId, null, opts.now);
  }

  /** Attach telehealth room. Only valid for telehealth delivery mode. */
  attachTelehealth(opts: {
    roomId: string;
    joinUrl: string;
    expiresAt: Instant;
    now: Instant;
  }): Appointment {
    if (this.s.deliveryMode !== 'telehealth') {
      throw new DomainError({
        code: 'CONFLICT',
        message: 'attachTelehealth only valid for telehealth deliveryMode',
        httpStatus: 409,
      });
    }
    if (this.isTerminal) {
      throw new AppointmentTerminal();
    }
    return new Appointment({
      ...this.s,
      telehealthRoomId: opts.roomId,
      telehealthJoinUrl: opts.joinUrl,
      telehealthExpiresAt: opts.expiresAt,
      updatedAt: opts.now,
    });
  }

  cancelByPatient(opts: {
    now: Instant;
    actorUserId: UserId;
    reason: string | null;
    cancelDeadline: Instant;
  }): Appointment {
    if (this.isTerminal) throw new AppointmentTerminal();
    const target: AppointmentStatus = isBefore(opts.now, opts.cancelDeadline)
      ? 'cancelled_by_patient'
      : 'late_cancellation';
    const next = this.transition(target, opts.actorUserId, opts.reason, opts.now);
    return new Appointment({
      ...next.s,
      cancelReason: opts.reason,
      cancelledAt: opts.now,
    });
  }

  cancelByClinic(opts: {
    now: Instant;
    actorUserId: UserId;
    reason: string;
  }): Appointment {
    if (this.isTerminal) throw new AppointmentTerminal();
    const next = this.transition('cancelled_by_clinic', opts.actorUserId, opts.reason, opts.now);
    return new Appointment({
      ...next.s,
      cancelReason: opts.reason,
      cancelledAt: opts.now,
    });
  }

  /**
   * Reschedule = create a NEW appointment for the new slot, mark THIS one as rescheduled.
   * Caller is responsible for both writes in one transaction.
   */
  markRescheduled(opts: {
    now: Instant;
    actorUserId: UserId;
    reason: string | null;
  }): Appointment {
    if (this.isTerminal) throw new AppointmentTerminal();
    return this.transition('rescheduled', opts.actorUserId, opts.reason, opts.now);
  }

  markCompleted(opts: { now: Instant; actorUserId: UserId | null }): Appointment {
    if (this.s.status !== 'confirmed') {
      throw new DomainError({
        code: 'CONFLICT',
        message: 'only confirmed appointments may be completed',
        httpStatus: 409,
      });
    }
    const next = this.transition('completed', opts.actorUserId, null, opts.now);
    return new Appointment({ ...next.s, completedAt: opts.now });
  }

  markNoShow(opts: { now: Instant; actorUserId: UserId | null }): Appointment {
    // Only valid past startsAt + 30min grace
    const minWhen = addMinutes(this.s.startsAt, 30 as DurationMinutes);
    if (isBefore(opts.now, minWhen)) {
      throw new DomainError({
        code: 'CONFLICT',
        message: 'no-show may only be marked after start time + 30min',
        httpStatus: 409,
      });
    }
    return this.transition('no_show', opts.actorUserId, null, opts.now);
  }

  private transition(
    to: AppointmentStatus,
    actorUserId: UserId | null,
    reason: string | null,
    now: Instant,
  ): Appointment {
    if (!canTransition(this.s.status, to)) {
      throw new DomainError({
        code: 'CONFLICT',
        message: `Forbidden transition: ${this.s.status} → ${to}`,
        httpStatus: 409,
        details: { from: this.s.status, to },
      });
    }
    const transition: StatusTransition = {
      from: this.s.status,
      to,
      actorUserId,
      reason,
      at: now,
    };
    return new Appointment({
      ...this.s,
      status: to,
      statusHistory: [...this.s.statusHistory, transition],
      updatedAt: now,
    });
  }
}
