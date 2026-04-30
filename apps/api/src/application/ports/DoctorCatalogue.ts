/**
 * DoctorCatalogue — read-side projection over the `doctors` table.
 *
 * Why this port: routes used to derive the active doctor id from
 * `env.ENVIRONMENT` (a hard-coded prod/dev string). That worked for a
 * single-doctor MVP but bound the runtime to the env shape, blocked any
 * multi-doctor expansion, and silently broke if the seed disagreed with
 * the env constant. Now: routes ask the catalogue at request time.
 *
 * For the launch (single-doctor clinic) `getDefault()` returns the
 * primary practitioner. When the clinic adds doctors, we extend with
 * `getById(id)` and a `list()` method.
 */

import type { DoctorId } from '../../domain/shared/ids.js';

export interface DoctorRecord {
  readonly id: DoctorId;
  readonly fullName: string;
  readonly titleShort: string;
  readonly primarySpecialty: string;
  readonly subSpecialty: string | null;
}

export interface DoctorCatalogue {
  /**
   * Returns the clinic's default/primary doctor. Throws if the table is
   * empty (which would be a deployment-time error, not a runtime one).
   */
  getDefault(): Promise<DoctorRecord>;
}
