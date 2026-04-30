import { z } from 'zod';

/**
 * Wire-format error envelope. Every non-2xx API response uses this shape.
 * `code` is stable and i18n-keyable on the client. `message` is server-default
 * English (we leave localisation to the client via the `code`).
 */
export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  field: z.string().optional(),
  correlationId: z.string(),
  details: z.record(z.unknown()).optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export const ApiErrorResponseSchema = z.object({
  error: ApiErrorSchema,
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

/**
 * Error codes catalogue. Mirrors `domain/shared/errors.ts`.
 * Keep these stable; clients translate via `errors.<code>` i18n keys.
 */
export const ERROR_CODES = {
  // Auth
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  OAUTH_ACCOUNT_MISMATCH: 'OAUTH_ACCOUNT_MISMATCH',
  OAUTH_STATE_INVALID: 'OAUTH_STATE_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  REFRESH_REUSE_DETECTED: 'REFRESH_REUSE_DETECTED',

  // Authorization
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RATE_LIMITED: 'RATE_LIMITED',

  // Validation
  VALIDATION_FAILED: 'VALIDATION_FAILED',

  // Booking
  SLOT_NOT_FOUND: 'SLOT_NOT_FOUND',
  SLOT_CONFLICT: 'SLOT_CONFLICT',
  SLOT_IN_PAST: 'SLOT_IN_PAST',
  SLOT_HOLD_EXPIRED: 'SLOT_HOLD_EXPIRED',
  TMS_SCREENING_REQUIRED: 'TMS_SCREENING_REQUIRED',
  TMS_SCREENING_DENIED: 'TMS_SCREENING_DENIED',
  CONSENT_MISSING: 'CONSENT_MISSING',
  GUARDIAN_REQUIRED: 'GUARDIAN_REQUIRED',
  RESCHEDULE_WINDOW_PASSED: 'RESCHEDULE_WINDOW_PASSED',
  CANCEL_WINDOW_PASSED: 'CANCEL_WINDOW_PASSED',
  APPOINTMENT_NOT_FOUND: 'APPOINTMENT_NOT_FOUND',
  APPOINTMENT_TERMINAL: 'APPOINTMENT_TERMINAL',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',

  // Generic
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL: 'INTERNAL',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
