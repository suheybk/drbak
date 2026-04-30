import type { DeliveryMode } from '../../domain/appointment/Appointment.js';
import type { ServiceId } from '../../domain/shared/ids.js';

export interface ServiceCatalogueEntry {
  readonly id: ServiceId;
  readonly slug: string;
  readonly pillar: string;
  readonly durationMinutes: number;
  readonly deliveryModes: ReadonlyArray<DeliveryMode>;
  readonly requiresTmsScreening: boolean;
  readonly minPatientAgeYears: number;
  readonly maxPatientAgeYears: number | null;
}

export interface ServiceCatalogue {
  findById(id: ServiceId): Promise<ServiceCatalogueEntry | null>;
}
