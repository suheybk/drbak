import { and, desc, eq, gte } from 'drizzle-orm';
import type {
  TmsScreening,
  TmsScreeningRepository,
  TmsScreeningStatus,
} from '../../../application/ports/index.js';
import { type DoctorId, type PatientId, asPatientId, asDoctorId } from '../../../domain/shared/ids.js';
import { type Instant, instantFromMillis } from '../../../domain/shared/time.js';
import type { TmsEligibilityVerdict } from '../../../domain/tms/TmsEligibility.js';
import type { Db } from '../client.js';
import { tmsScreenings } from '../schema.js';
import { ulid } from 'ulid';

const toScreening = (r: typeof tmsScreenings.$inferSelect): TmsScreening => ({
  patientId: asPatientId(r.patientId),
  doctorId: asDoctorId(r.doctorId),
  status: r.status as TmsScreeningStatus,
  expiresAt: instantFromMillis(r.expiresAt.getTime()),
});

export class DrizzleTmsScreeningRepo implements TmsScreeningRepository {
  constructor(private readonly db: Db) {}

  async findActive(
    patientId: PatientId,
    doctorId: DoctorId,
    now: Instant,
  ): Promise<TmsScreening | null> {
    const rows = await this.db
      .select()
      .from(tmsScreenings)
      .where(
        and(
          eq(tmsScreenings.patientId, patientId),
          eq(tmsScreenings.doctorId, doctorId),
          gte(tmsScreenings.expiresAt, new Date(now as number)),
        ),
      )
      .orderBy(desc(tmsScreenings.createdAt))
      .limit(1);
    return rows[0] ? toScreening(rows[0]) : null;
  }

  async upsertFromEvaluation(input: {
    patientId: PatientId;
    doctorId: DoctorId;
    verdict: TmsEligibilityVerdict;
    now: Instant;
    validForDays: number;
  }): Promise<TmsScreening> {
    const expiresAt = new Date(
      (input.now as number) + input.validForDays * 24 * 3600 * 1000,
    );
    const inserted = await this.db
      .insert(tmsScreenings)
      .values({
        id: ulid(),
        patientId: input.patientId,
        doctorId: input.doctorId,
        answersJson: {} as never, // caller stores the answers separately if needed
        status:
          input.verdict === 'cleared'
            ? 'cleared'
            : input.verdict === 'denied'
              ? 'denied'
              : 'requires_review',
        expiresAt,
        createdAt: new Date(input.now as number),
      })
      .returning();
    if (!inserted[0]) throw new Error('tms screening insert returned no rows');
    return toScreening(inserted[0]);
  }
}
