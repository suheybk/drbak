import type { MiddlewareHandler } from 'hono';
import { ulid } from 'ulid';

/**
 * Reads `X-Correlation-ID` from the request (or mints one) and exposes it on
 * `c.get('correlationId')` + on the response header.
 */
export const correlationIdMiddleware: MiddlewareHandler = async (c, next) => {
  const incoming = c.req.header('x-correlation-id');
  const id = incoming && /^[A-Za-z0-9_\-:.]{8,64}$/.test(incoming) ? incoming : ulid();
  c.set('correlationId', id);
  c.header('x-correlation-id', id);
  await next();
};
