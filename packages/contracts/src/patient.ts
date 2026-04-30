import { z } from 'zod';
import { LocaleSchema } from './locale.js';

export const PatientProfileSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.string().nullable(),
  phoneE164: z.string().nullable(),
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  city: z.string().nullable(),
  postalCode: z.string().nullable(),
  countryIso2: z.string().length(2),
  emergencyContactName: z.string().nullable(),
  emergencyContactPhoneE164: z.string().nullable(),
  guardianPatientId: z.string().nullable(),
  locale: LocaleSchema,
  emailVerified: z.boolean(),
});
export type PatientProfile = z.infer<typeof PatientProfileSchema>;

export const PatientUpdateRequestSchema = z.object({
  fullName: z.string().min(2).max(160).optional(),
  phoneE164: z.string().regex(/^\+\d{8,15}$/).nullable().optional(),
  addressLine1: z.string().max(200).nullable().optional(),
  addressLine2: z.string().max(200).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
  countryIso2: z.string().length(2).optional(),
  emergencyContactName: z.string().max(160).nullable().optional(),
  emergencyContactPhoneE164: z
    .string()
    .regex(/^\+\d{8,15}$/)
    .nullable()
    .optional(),
  locale: LocaleSchema.optional(),
});
export type PatientUpdateRequest = z.infer<typeof PatientUpdateRequestSchema>;

/* ---------- Documents ---------- */

export const DocumentMimeKindSchema = z.enum(['image', 'pdf', 'dicom', 'text', 'other']);
export const DocumentScanStatusSchema = z.enum(['pending', 'clean', 'infected', 'failed']);

export const PatientDocumentSchema = z.object({
  id: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  mimeKind: DocumentMimeKindSchema,
  sizeBytes: z.number().int().positive(),
  scanStatus: DocumentScanStatusSchema,
  description: z.string().nullable(),
  appointmentId: z.string().nullable(),
  createdAt: z.string().datetime(),
  // signed URL is fetched on demand via /patient/me/documents/:id/url
});
export type PatientDocument = z.infer<typeof PatientDocumentSchema>;

// Direct upload uses presigned R2 PUT — no body upload through the Worker
export const RequestUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(127),
  sizeBytes: z.number().int().positive().max(50 * 1024 * 1024), // 50 MB cap
  description: z.string().max(500).optional(),
  appointmentId: z.string().optional(),
});
export type RequestUpload = z.infer<typeof RequestUploadSchema>;

export const PresignedUploadSchema = z.object({
  documentId: z.string(),
  uploadUrl: z.string().url(),
  expiresAt: z.string().datetime(),
  requiredHeaders: z.record(z.string()),
});
export type PresignedUpload = z.infer<typeof PresignedUploadSchema>;
