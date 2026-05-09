import { z } from 'zod';
import { LocaleSchema } from './locale.js';

export const DeliveryModeSchema = z.enum(['in_person', 'home_visit', 'telehealth']);
export type DeliveryMode = z.infer<typeof DeliveryModeSchema>;

export const SlotKindSchema = z.enum([
  'consultation_30',
  'consultation_15',
  'tms_session_45',
  'iv_therapy_60',
  'home_visit_90',
]);
export type SlotKind = z.infer<typeof SlotKindSchema>;

/* ---------- Public read DTOs ---------- */

export const ServiceSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  pillar: z.string(),
  title: z.string(),
  leadParagraph: z.string().nullable(),
  durationMinutes: z.number().int().positive(),
  deliveryModes: z.array(DeliveryModeSchema).min(1),
  requiresTmsScreening: z.boolean(),
  minPatientAgeYears: z.number().int().nonnegative(),
  maxPatientAgeYears: z.number().int().positive().nullable(),
});
export type ServiceSummary = z.infer<typeof ServiceSummarySchema>;

export const AvailabilityQuerySchema = z.object({
  serviceId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deliveryMode: DeliveryModeSchema,
  locale: LocaleSchema.optional(),
});
export type AvailabilityQuery = z.infer<typeof AvailabilityQuerySchema>;

export const SlotSchema = z.object({
  id: z.string(), // synthetic; encodes (doctorId, startsAt, serviceId)
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  available: z.boolean(),
  reason: z.string().optional(), // present iff !available
});
export type Slot = z.infer<typeof SlotSchema>;

export const AvailabilityResponseSchema = z.object({
  date: z.string(),
  serviceId: z.string(),
  slots: z.array(SlotSchema),
});
export type AvailabilityResponse = z.infer<typeof AvailabilityResponseSchema>;

/* ---------- Hold + appointment write DTOs ---------- */

export const HoldSlotRequestSchema = z.object({
  serviceId: z.string(),
  startsAt: z.string().datetime(),
  deliveryMode: DeliveryModeSchema,
});
export type HoldSlotRequest = z.infer<typeof HoldSlotRequestSchema>;

export const SlotHoldSchema = z.object({
  holdToken: z.string(),
  expiresAt: z.string().datetime(),
});
export type SlotHold = z.infer<typeof SlotHoldSchema>;

export const CreateAppointmentRequestSchema = z.object({
  // Slot identification — the client picked these in the booking flow and
  // must echo them back so the API can re-derive the slot, validate it
  // against the held DO record, and look up the service for duration +
  // delivery-mode rules. Without these the route reads them as empty
  // strings and findById('') returns null → SLOT_NOT_FOUND ("Seçilen
  // saat artık uygun değil"), which made booking impossible.
  serviceId: z.string().min(1),
  startsAt: z.string().datetime(),
  deliveryMode: DeliveryModeSchema,
  holdToken: z.string(),
  patientNotes: z.string().max(2000).optional(),
  homeAddressLine1: z.string().max(200).optional(),
  homeAddressLine2: z.string().max(200).optional(),
  consents: z
    .object({
      appointmentBooking: z.literal(true),
      healthDataProcessing: z.literal(true),
      videoConsultationRecording: z.boolean().optional(), // required iff telehealth and being recorded
    })
    .strict(),
  consentDocumentVersion: z.string(),
  locale: LocaleSchema,
});
export type CreateAppointmentRequest = z.infer<typeof CreateAppointmentRequestSchema>;

export const AppointmentStatusSchema = z.enum([
  'created',
  'confirmed',
  'rescheduled',
  'cancelled_by_patient',
  'cancelled_by_clinic',
  'late_cancellation',
  'no_show',
  'completed',
]);
export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;

export const AppointmentSchema = z.object({
  id: z.string(),
  serviceId: z.string(),
  serviceTitle: z.string(),
  doctorId: z.string(),
  doctorName: z.string(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  deliveryMode: DeliveryModeSchema,
  status: AppointmentStatusSchema,
  locale: LocaleSchema,
  telehealthJoinUrl: z.string().url().nullable(),
  rescheduleUrl: z.string().url().nullable(),
  cancelUrl: z.string().url().nullable(),
  createdAt: z.string().datetime(),
});
export type Appointment = z.infer<typeof AppointmentSchema>;

export const RescheduleAppointmentRequestSchema = z.object({
  holdToken: z.string(),
  reason: z.string().max(500).optional(),
});
export type RescheduleAppointmentRequest = z.infer<typeof RescheduleAppointmentRequestSchema>;

export const CancelAppointmentRequestSchema = z.object({
  reason: z.string().max(500).optional(),
});
export type CancelAppointmentRequest = z.infer<typeof CancelAppointmentRequestSchema>;

/* ---------- TMS pre-screening ---------- */

export const TmsScreeningAnswersSchema = z
  .object({
    hasMetalImplantsInHead: z.boolean(),
    hasCochlearImplant: z.boolean(),
    hasPacemaker: z.boolean(),
    hasNeurostimulator: z.boolean(),
    hasMedicationPump: z.boolean(),
    isPregnant: z.boolean().nullable(), // null = not applicable
    hasHistoryOfSeizures: z.boolean(),
    seizureDetails: z.string().max(1000).optional(),
    currentMedications: z.string().max(2000).optional(),
    hasSubstanceUseDisorder: z.boolean(),
    notes: z.string().max(2000).optional(),
  })
  .strict();
export type TmsScreeningAnswers = z.infer<typeof TmsScreeningAnswersSchema>;
