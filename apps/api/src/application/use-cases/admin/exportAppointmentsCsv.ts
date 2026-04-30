/**
 * Use case: stream a CSV of appointments matching filters, audit each row.
 * Returns a CSV string (small clinic; <10k rows expected). For larger,
 * we'd switch to ReadableStream + R2 staging.
 */

import { and, eq, gte, lte } from 'drizzle-orm';
import type { AuditLogger } from '../../ports/index.js';
import type { CorrelationId, UserId } from '../../../domain/shared/ids.js';
import type { Db } from '../../../infrastructure/db/client.js';
import { appointments, patients, users } from '../../../infrastructure/db/schema.js';

export interface ExportAppointmentsCsvDeps {
  readonly db: Db;
  readonly audit: AuditLogger;
}

export interface ExportAppointmentsCsvInput {
  readonly actorUserId: UserId;
  readonly actorRole: 'admin' | 'staff';
  readonly correlationId: CorrelationId;
  readonly fromIso?: string;
  readonly toIso?: string;
  readonly status?: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

const csvCell = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export const exportAppointmentsCsv =
  (deps: ExportAppointmentsCsvDeps) =>
  async (input: ExportAppointmentsCsvInput): Promise<string> => {
    const conditions = [];
    if (input.fromIso) conditions.push(gte(appointments.startsAt, new Date(input.fromIso)));
    if (input.toIso) conditions.push(lte(appointments.startsAt, new Date(input.toIso)));
    if (input.status) conditions.push(eq(appointments.status, input.status as never));

    const rows = await deps.db
      .select({
        id: appointments.id,
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
        status: appointments.status,
        deliveryMode: appointments.deliveryMode,
        serviceId: appointments.serviceId,
        locale: appointments.locale,
        patientName: patients.fullName,
        patientPhone: patients.phoneE164,
        patientEmail: users.email,
        cancelReason: appointments.cancelReason,
        createdAt: appointments.createdAt,
      })
      .from(appointments)
      .innerJoin(patients, eq(patients.id, appointments.patientId))
      .innerJoin(users, eq(users.id, patients.userId))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const header = [
      'id', 'starts_at', 'ends_at', 'status', 'delivery_mode',
      'service_id', 'locale',
      'patient_name', 'patient_phone', 'patient_email',
      'cancel_reason', 'created_at',
    ].join(',');
    const body = rows.map((r) =>
      [
        r.id,
        r.startsAt.toISOString(),
        r.endsAt.toISOString(),
        r.status,
        r.deliveryMode,
        r.serviceId,
        r.locale,
        r.patientName,
        r.patientPhone,
        r.patientEmail,
        r.cancelReason,
        r.createdAt.toISOString(),
      ].map(csvCell).join(','),
    );

    await deps.audit.record({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      action: 'export',
      entityType: 'appointment',
      entityId: 'bulk',
      targetUserId: null,
      correlationId: input.correlationId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { rowCount: rows.length, fromIso: input.fromIso, toIso: input.toIso },
    });

    return [header, ...body].join('\n');
  };
