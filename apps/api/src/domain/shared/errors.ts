/**
 * Typed domain errors. Never `throw new Error('foo')` — every failure is one of these,
 * with a stable `code` that maps to `packages/contracts/src/errors.ts ERROR_CODES`
 * and to i18n keys on the client.
 */

import type { CorrelationId } from './ids.js';

export type DomainErrorCode =
  // Auth / authz
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_VERIFIED'
  | 'ACCOUNT_LOCKED'
  | 'OAUTH_ACCOUNT_MISMATCH'
  | 'OAUTH_STATE_INVALID'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'REFRESH_REUSE_DETECTED'
  | 'PERMISSION_DENIED'
  | 'RATE_LIMITED'
  // Booking
  | 'SLOT_NOT_FOUND'
  | 'SLOT_CONFLICT'
  | 'SLOT_IN_PAST'
  | 'SLOT_HOLD_EXPIRED'
  | 'TMS_SCREENING_REQUIRED'
  | 'TMS_SCREENING_DENIED'
  | 'CONSENT_MISSING'
  | 'GUARDIAN_REQUIRED'
  | 'RESCHEDULE_WINDOW_PASSED'
  | 'CANCEL_WINDOW_PASSED'
  | 'APPOINTMENT_NOT_FOUND'
  | 'APPOINTMENT_TERMINAL'
  | 'IDEMPOTENCY_CONFLICT'
  // Generic
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_FAILED'
  | 'INTERNAL'
  | 'SERVICE_UNAVAILABLE';

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly field?: string;
  readonly correlationId?: CorrelationId;
  readonly httpStatus: number;
  readonly details?: Record<string, unknown>;

  constructor(opts: {
    code: DomainErrorCode;
    message: string;
    httpStatus: number;
    field?: string;
    correlationId?: CorrelationId;
    details?: Record<string, unknown>;
  }) {
    super(opts.message);
    this.name = 'DomainError';
    this.code = opts.code;
    this.httpStatus = opts.httpStatus;
    if (opts.field !== undefined) this.field = opts.field;
    if (opts.correlationId !== undefined) this.correlationId = opts.correlationId;
    if (opts.details !== undefined) this.details = opts.details;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.field ? { field: this.field } : {}),
      ...(this.correlationId ? { correlationId: this.correlationId } : {}),
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

/**
 * Result type — preferred return for use cases that have multiple expected
 * failure modes. `throw` is reserved for impossible/programmer errors.
 */
export type Ok<T> = { ok: true; value: T };
export type Err<E = DomainError> = { ok: false; error: E };
export type Result<T, E = DomainError> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E = DomainError>(error: E): Err<E> => ({ ok: false, error });
