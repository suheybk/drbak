/**
 * Drizzle adapter for the DoctorCatalogue port.
 *
 * Single-doctor MVP: `getDefault()` returns the lexicographically first row
 * (the seeded `doc_oguz_bak`). When we add doctors, switch this to a
 * `is_primary` flag and surface a `list()` method.
 */

import { asc } from 'drizzle-orm';
import type {
  DoctorCatalogue,
  DoctorRecord,
} from '../../../application/ports/DoctorCatalogue.js';
import { asDoctorId } from '../../../domain/shared/ids.js';
import type { Db } from '../client.js';
import { doctors } from '../schema.js';

export class DrizzleDoctorCatalogue implements DoctorCatalogue {
  constructor(private readonly db: Db) {}

  async getDefault(): Promise<DoctorRecord> {
    const rows = await this.db
      .select({
        id: doctors.id,
        fullName: doctors.fullName,
        titleShort: doctors.titleShort,
        primarySpecialty: doctors.primarySpecialty,
        subSpecialty: doctors.subSpecialty,
      })
      .from(doctors)
      .orderBy(asc(doctors.id))
      .limit(1);
    const row = rows[0];
    if (!row) {
      throw new Error('DoctorCatalogue.getDefault: doctors table is empty — seed required');
    }
    return {
      id: asDoctorId(row.id),
      fullName: row.fullName,
      titleShort: row.titleShort,
      primarySpecialty: row.primarySpecialty,
      subSpecialty: row.subSpecialty,
    };
  }
}
