/**
 * Branded identifiers — phantom types so the type system catches
 * "passing a PatientId where an AppointmentId is expected" at compile time.
 *
 * Runtime representation is always a string (ULID — sortable, URL-safe).
 */

declare const __brand: unique symbol;
export type Brand<T, B> = T & { readonly [__brand]: B };

export type UserId = Brand<string, 'UserId'>;
export type PatientId = Brand<string, 'PatientId'>;
export type DoctorId = Brand<string, 'DoctorId'>;
export type ClinicId = Brand<string, 'ClinicId'>;
export type ServiceId = Brand<string, 'ServiceId'>;
export type ConditionId = Brand<string, 'ConditionId'>;
export type AppointmentId = Brand<string, 'AppointmentId'>;
export type SlotHoldToken = Brand<string, 'SlotHoldToken'>;
export type ConsentRecordId = Brand<string, 'ConsentRecordId'>;
export type ConsentDocumentId = Brand<string, 'ConsentDocumentId'>;
export type DocumentId = Brand<string, 'DocumentId'>;
export type TestimonialId = Brand<string, 'TestimonialId'>;
export type ContentEntryId = Brand<string, 'ContentEntryId'>;
export type TmsScreeningId = Brand<string, 'TmsScreeningId'>;
export type CorrelationId = Brand<string, 'CorrelationId'>;
export type IdempotencyKey = Brand<string, 'IdempotencyKey'>;

// Constructors — at the system boundary (HTTP/DB), use these to brand an unverified string.
// Domain code never constructs these manually; it receives them already branded.
export const asUserId = (s: string): UserId => s as UserId;
export const asPatientId = (s: string): PatientId => s as PatientId;
export const asDoctorId = (s: string): DoctorId => s as DoctorId;
export const asClinicId = (s: string): ClinicId => s as ClinicId;
export const asServiceId = (s: string): ServiceId => s as ServiceId;
export const asConditionId = (s: string): ConditionId => s as ConditionId;
export const asAppointmentId = (s: string): AppointmentId => s as AppointmentId;
export const asSlotHoldToken = (s: string): SlotHoldToken => s as SlotHoldToken;
export const asConsentRecordId = (s: string): ConsentRecordId => s as ConsentRecordId;
export const asConsentDocumentId = (s: string): ConsentDocumentId => s as ConsentDocumentId;
export const asDocumentId = (s: string): DocumentId => s as DocumentId;
export const asTestimonialId = (s: string): TestimonialId => s as TestimonialId;
export const asContentEntryId = (s: string): ContentEntryId => s as ContentEntryId;
export const asTmsScreeningId = (s: string): TmsScreeningId => s as TmsScreeningId;
export const asCorrelationId = (s: string): CorrelationId => s as CorrelationId;
export const asIdempotencyKey = (s: string): IdempotencyKey => s as IdempotencyKey;
