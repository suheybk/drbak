/**
 * Centralised error → ApiError envelope mapper.
 * Catches DomainError + ZodError + unknown; never leaks stacks.
 */
import type { Context } from 'hono';
import { ZodError } from 'zod';
import { DomainError } from '../../../domain/shared/errors.js';

interface ErrEnvelope {
  error: {
    code: string;
    message: string;
    field?: string;
    correlationId?: string;
    details?: Record<string, unknown>;
  };
}

const envelope = (
  code: string,
  message: string,
  c: Context,
  extra: Partial<ErrEnvelope['error']> = {},
): ErrEnvelope => ({
  error: {
    code,
    message,
    correlationId: (c.get('correlationId') as string | undefined) ?? undefined,
    ...extra,
  },
});

export const mapErrorToResponse = (e: unknown, c: Context): Response => {
  if (e instanceof DomainError) {
    return new Response(
      JSON.stringify(
        envelope(e.code, e.message, c, {
          ...(e.field !== undefined ? { field: e.field } : {}),
          ...(e.details !== undefined ? { details: e.details } : {}),
        }),
      ),
      { status: e.httpStatus, headers: { 'content-type': 'application/json' } },
    );
  }
  if (e instanceof ZodError) {
    return new Response(
      JSON.stringify(
        envelope('VALIDATION_FAILED', 'Request body failed validation.', c, {
          details: { issues: e.issues },
        }),
      ),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );
  }
  console.error('unhandled error', e);
  return new Response(
    JSON.stringify(envelope('INTERNAL', 'Unexpected error.', c)),
    { status: 500, headers: { 'content-type': 'application/json' } },
  );
};
