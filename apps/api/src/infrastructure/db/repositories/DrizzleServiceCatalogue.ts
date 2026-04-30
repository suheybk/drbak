import { eq } from 'drizzle-orm';
import type {
  ServiceCatalogue,
  ServiceCatalogueEntry,
} from '../../../application/ports/index.js';
import type { DeliveryMode } from '../../../domain/appointment/Appointment.js';
import { asServiceId, type ServiceId } from '../../../domain/shared/ids.js';
import type { Db } from '../client.js';
import { services } from '../schema.js';

const toEntry = (r: typeof services.$inferSelect): ServiceCatalogueEntry => ({
  id: asServiceId(r.id),
  slug: r.slug,
  pillar: r.pillar,
  durationMinutes: r.durationMinutes,
  deliveryModes: (r.deliveryModes as DeliveryMode[]) ?? [],
  requiresTmsScreening: r.requiresTmsScreening,
  minPatientAgeYears: r.minPatientAgeYears,
  maxPatientAgeYears: r.maxPatientAgeYears,
});

export class DrizzleServiceCatalogue implements ServiceCatalogue {
  constructor(private readonly db: Db) {}
  async findById(id: ServiceId): Promise<ServiceCatalogueEntry | null> {
    const rows = await this.db.select().from(services).where(eq(services.id, id)).limit(1);
    return rows[0] ? toEntry(rows[0]) : null;
  }
}
