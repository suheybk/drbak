import { eq } from 'drizzle-orm';
import type { AppointmentRepository } from '../../../application/ports/index.js';
import { Appointment, type AppointmentSnapshot } from '../../../domain/appointment/Appointment.js';
import {
  asAppointmentId,
  asCorrelationId,
  asDoctorId,
  asIdempotencyKey,
  asPatientId,
  asServiceId,
  asUserId,
  type AppointmentId,
  type IdempotencyKey,
  type PatientId,
  type UserId,
} from '../../../domain/shared/ids.js';
import { instantFromMillis } from '../../../domain/shared/time.js';
import type { Db } from '../client.js';
import { appointments, appointmentStatusHistory } from '../schema.js';
import { ulid } from 'ulid';
import type { Locale } from '@dr-bak/contracts';

const toSnapshot = (
  a: typeof appointments.$inferSelect,
  history: Array<typeof appointmentStatusHistory.$inferSelect>,
): AppointmentSnapshot => ({
  id: asAppointmentId(a.id),
  patientId: asPatientId(a.patientId),
  doctorId: asDoctorId(a.doctorId),
  serviceId: asServiceId(a.serviceId),
  deliveryMode: a.deliveryMode,
  startsAt: instantFromMillis(a.startsAt.getTime()),
  endsAt: instantFromMillis(a.endsAt.getTime()),
  status: a.status,
  statusHistory: history.map((h) => ({
    from: h.fromStatus,
    to: h.toStatus,
    actorUserId: h.actorUserId ? asUserId(h.actorUserId) : null,
    reason: h.reason,
    at: instantFromMillis(h.at.getTime()),
  })),
  correlationId: asCorrelationId(a.correlationId),
  idempotencyKey: a.idempotencyKey ? asIdempotencyKey(a.idempotencyKey) : null,
  homeAddressLine1: a.homeAddressLine1,
  homeAddressLine2: a.homeAddressLine2,
  telehealthRoomId: a.telehealthRoomId,
  telehealthJoinUrl: a.telehealthJoinUrl,
  telehealthExpiresAt: a.telehealthExpiresAt
    ? instantFromMillis(a.telehealthExpiresAt.getTime())
    : null,
  patientNotes: a.patientNotes,
  cancelReason: a.cancelReason,
  cancelledAt: a.cancelledAt ? instantFromMillis(a.cancelledAt.getTime()) : null,
  completedAt: a.completedAt ? instantFromMillis(a.completedAt.getTime()) : null,
  createdAt: instantFromMillis(a.createdAt.getTime()),
  updatedAt: instantFromMillis(a.updatedAt.getTime()),
  locale: a.locale as Locale,
  rescheduledFromAppointmentId: a.rescheduledFromAppointmentId
    ? asAppointmentId(a.rescheduledFromAppointmentId)
    : null,
});

export class DrizzleAppointmentRepo implements AppointmentRepository {
  constructor(private readonly db: Db) {}

  async findById(id: AppointmentId): Promise<Appointment | null> {
    const apt = await this.db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id))
      .limit(1);
    if (!apt[0]) return null;
    const history = await this.db
      .select()
      .from(appointmentStatusHistory)
      .where(eq(appointmentStatusHistory.appointmentId, id));
    return Appointment.rehydrate(toSnapshot(apt[0], history));
  }

  async findByIdempotencyKey(key: IdempotencyKey): Promise<Appointment | null> {
    const apt = await this.db
      .select()
      .from(appointments)
      .where(eq(appointments.idempotencyKey, key))
      .limit(1);
    if (!apt[0]) return null;
    return this.findById(asAppointmentId(apt[0].id));
  }

  async listForPatient(patientId: PatientId): Promise<ReadonlyArray<Appointment>> {
    const rows = await this.db
      .select()
      .from(appointments)
      .where(eq(appointments.patientId, patientId));
    if (rows.length === 0) return [];
    // N+1 acceptable for small patient histories; pre-aggregate later if needed
    return Promise.all(
      rows.map(async (a) => {
        const history = await this.db
          .select()
          .from(appointmentStatusHistory)
          .where(eq(appointmentStatusHistory.appointmentId, a.id));
        return Appointment.rehydrate(toSnapshot(a, history));
      }),
    );
  }

  async save(a: Appointment): Promise<void> {
    const s = a.snapshot;
    const existing = await this.db
      .select({ id: appointments.id })
      .from(appointments)
      .where(eq(appointments.id, s.id))
      .limit(1);

    if (existing.length === 0) {
      // Insert appointment + initial transition history
      await this.db.insert(appointments).values({
        id: s.id,
        patientId: s.patientId,
        doctorId: s.doctorId,
        serviceId: s.serviceId,
        deliveryMode: s.deliveryMode,
        startsAt: new Date(s.startsAt as number),
        endsAt: new Date(s.endsAt as number),
        status: s.status,
        locale: s.locale,
        patientNotes: s.patientNotes,
        homeAddressLine1: s.homeAddressLine1,
        homeAddressLine2: s.homeAddressLine2,
        telehealthRoomId: s.telehealthRoomId,
        telehealthJoinUrl: s.telehealthJoinUrl,
        telehealthExpiresAt: s.telehealthExpiresAt
          ? new Date(s.telehealthExpiresAt as number)
          : null,
        rescheduledFromAppointmentId: s.rescheduledFromAppointmentId,
        cancelReason: s.cancelReason,
        cancelledAt: s.cancelledAt ? new Date(s.cancelledAt as number) : null,
        completedAt: s.completedAt ? new Date(s.completedAt as number) : null,
        correlationId: s.correlationId,
        idempotencyKey: s.idempotencyKey,
        createdAt: new Date(s.createdAt as number),
        updatedAt: new Date(s.updatedAt as number),
      });
      await this.db.insert(appointmentStatusHistory).values(
        s.statusHistory.map((h) => ({
          id: ulid(),
          appointmentId: s.id,
          fromStatus: h.from,
          toStatus: h.to,
          actorUserId: h.actorUserId,
          reason: h.reason,
          at: new Date(h.at as number),
        })),
      );
      return;
    }

    // Update path: rewrite the appointment row and append any new transitions
    await this.db
      .update(appointments)
      .set({
        status: s.status,
        telehealthRoomId: s.telehealthRoomId,
        telehealthJoinUrl: s.telehealthJoinUrl,
        telehealthExpiresAt: s.telehealthExpiresAt
          ? new Date(s.telehealthExpiresAt as number)
          : null,
        cancelReason: s.cancelReason,
        cancelledAt: s.cancelledAt ? new Date(s.cancelledAt as number) : null,
        completedAt: s.completedAt ? new Date(s.completedAt as number) : null,
        updatedAt: new Date(s.updatedAt as number),
      })
      .where(eq(appointments.id, s.id));

    const knownAt = await this.db
      .select({ at: appointmentStatusHistory.at })
      .from(appointmentStatusHistory)
      .where(eq(appointmentStatusHistory.appointmentId, s.id));
    const knownTimes = new Set(knownAt.map((r) => r.at.getTime()));
    const newTransitions = s.statusHistory.filter(
      (h) => !knownTimes.has(h.at as number),
    );
    if (newTransitions.length > 0) {
      await this.db.insert(appointmentStatusHistory).values(
        newTransitions.map((h) => ({
          id: ulid(),
          appointmentId: s.id,
          fromStatus: h.from,
          toStatus: h.to,
          actorUserId: h.actorUserId,
          reason: h.reason,
          at: new Date(h.at as number),
        })),
      );
    }
  }
}
