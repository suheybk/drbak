/**
 * Use case: mint a presigned R2 URL so the patient can PUT their document directly.
 * The Worker never streams the upload (size + CPU budget).
 *
 * Steps:
 *   1. Patient profile exists, email verified.
 *   2. Validate filename + mime + size.
 *   3. Insert `patient_documents` row with status=pending.
 *   4. Mint HMAC-signed upload token (via UploadTokenMinter port) valid for 5 minutes.
 *   5. Audit + return.
 *
 * The `_upload` route verifies the same token via the same port before
 * accepting the PUT — no implicit trust between use case and route.
 */

import type { R2Bucket } from '@cloudflare/workers-types';
import { DomainError, type Result, err, ok } from '../../../domain/shared/errors.js';
import type { CorrelationId, UserId } from '../../../domain/shared/ids.js';
import type { Db } from '../../../infrastructure/db/client.js';
import { patientDocuments } from '../../../infrastructure/db/schema.js';
import type {
  AuditLogger,
  Clock,
  IdGenerator,
  PatientRepository,
  UploadTokenMinter,
} from '../../ports/index.js';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
  'application/dicom',
  'text/plain',
]);
const MAX_BYTES = 50 * 1024 * 1024;

export interface RequestDocumentUploadDeps {
  readonly db: Db;
  readonly r2: R2Bucket;
  readonly patients: PatientRepository;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly audit: AuditLogger;
  readonly uploadTokens: UploadTokenMinter;
}

export interface RequestDocumentUploadInput {
  readonly actorUserId: UserId;
  readonly filename: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly description: string | null;
  readonly appointmentId: string | null;
  readonly correlationId: CorrelationId;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

export interface PresignedUpload {
  readonly documentId: string;
  readonly uploadUrl: string;
  readonly expiresAtIso: string;
  readonly requiredHeaders: Record<string, string>;
}

export const requestDocumentUpload =
  (deps: RequestDocumentUploadDeps) =>
  async (input: RequestDocumentUploadInput): Promise<Result<PresignedUpload, DomainError>> => {
    if (!ALLOWED_MIME.has(input.mimeType)) {
      return err(
        new DomainError({
          code: 'VALIDATION_FAILED',
          message: 'Unsupported file type.',
          httpStatus: 400,
          field: 'mimeType',
        }),
      );
    }
    if (input.sizeBytes > MAX_BYTES) {
      return err(
        new DomainError({
          code: 'VALIDATION_FAILED',
          message: 'File too large.',
          httpStatus: 400,
          field: 'sizeBytes',
        }),
      );
    }
    const patient = await deps.patients.findByUserId(input.actorUserId);
    if (!patient) {
      return err(
        new DomainError({ code: 'NOT_FOUND', message: 'Patient missing.', httpStatus: 404 }),
      );
    }
    if (!patient.isEmailVerified) {
      return err(
        new DomainError({
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Verify your email first.',
          httpStatus: 403,
        }),
      );
    }

    const now = deps.clock.now();
    const docId = deps.ids.generate();
    const safeName = input.filename.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 200);
    const r2Key = `patients/${patient.id}/${docId}/${safeName}`;

    await deps.db.insert(patientDocuments).values({
      id: docId,
      patientId: patient.id,
      uploadedByUserId: input.actorUserId,
      filename: safeName,
      mimeType: input.mimeType,
      mimeKind: mimeKindOf(input.mimeType),
      sizeBytes: input.sizeBytes,
      r2Key,
      scanStatus: 'pending',
      description: input.description,
      appointmentId: input.appointmentId,
      createdAt: new Date(now as number),
    });

    const minted = await deps.uploadTokens.mint({
      docId,
      patientId: patient.id,
      r2Key,
      ttlSeconds: 5 * 60,
      nowMs: now as number,
    });
    const uploadUrl = `/api/v1/patient/me/documents/${docId}/_upload?token=${encodeURIComponent(minted.token)}`;

    await deps.audit.record({
      actorUserId: input.actorUserId,
      actorRole: 'patient',
      action: 'document_upload',
      entityType: 'patient_document',
      entityId: docId,
      targetUserId: input.actorUserId,
      correlationId: input.correlationId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { filename: safeName, sizeBytes: input.sizeBytes },
    });

    return ok({
      documentId: docId,
      uploadUrl,
      expiresAtIso: new Date(minted.expiresAtMs).toISOString(),
      requiredHeaders: { 'content-type': input.mimeType },
    });
  };

const mimeKindOf = (m: string): 'image' | 'pdf' | 'dicom' | 'text' | 'other' => {
  if (m.startsWith('image/')) return 'image';
  if (m === 'application/pdf') return 'pdf';
  if (m === 'application/dicom') return 'dicom';
  if (m.startsWith('text/')) return 'text';
  return 'other';
};
