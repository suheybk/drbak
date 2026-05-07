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
): ErrEnvelope => {
  const correlationId = c.get('correlationId') as string | undefined;
  return {
    error: {
      code,
      message,
      ...(correlationId !== undefined ? { correlationId } : {}),
      ...extra,
    },
  };
};

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
  // In non-production environments, surface the underlying message + stack
  // in `details` so OAuth/login failures can be diagnosed without
  // `wrangler tail` (which is unreachable from networks that block
  // Cloudflare websocket endpoints — see memory/dr-bak-tr-isp-dns-block.md).
  // Production keeps the bare envelope so stack traces never leak.
  const env = (c.env as { ENVIRONMENT?: string } | undefined) ?? {};
  const debugExtra =
    env.ENVIRONMENT && env.ENVIRONMENT !== 'production'
      ? {
          details: {
            debugMessage: e instanceof Error ? e.message : String(e),
            debugName: e instanceof Error ? e.name : 'unknown',
            debugStack: e instanceof Error ? (e.stack ?? '').split('\n').slice(0, 8) : [],
          },
        }
      : {};
  return new Response(JSON.stringify(envelope('INTERNAL', 'Unexpected error.', c, debugExtra)), {
    status: 500,
    headers: { 'content-type': 'application/json' },
  });
};
