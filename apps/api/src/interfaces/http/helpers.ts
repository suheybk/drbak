/**
 * Tiny helpers shared across route handlers.
 */

import type { Locale } from '@dr-bak/contracts';
import type { Context } from 'hono';
import type { Result } from '../../domain/shared/errors.js';
import { mapErrorToResponse } from './middleware/errorMapper.js';

export const clientIp = (c: Context): string | null =>
  c.req.header('cf-connecting-ip') ??
  c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
  null;

export const userAgent = (c: Context): string | null => c.req.header('user-agent') ?? null;

export const localeOf = (c: Context, fallback: Locale = 'tr'): Locale => {
  const q = c.req.query('locale') as Locale | undefined;
  if (q && ['tr', 'ar', 'en', 'fr', 'es'].includes(q)) return q;
  const h = c.req.header('accept-language')?.toLowerCase().slice(0, 2);
  if (h === 'tr' || h === 'ar' || h === 'en' || h === 'fr' || h === 'es') return h;
  return fallback;
};

export const idempotencyKey = (c: Context): string | null =>
  c.req.header('idempotency-key') ?? null;

export const respond = <T>(c: Context, r: Result<T>, status = 200): Response => {
  if (!r.ok) return mapErrorToResponse(r.error, c);
  return c.json(r.value as never, status as never);
};
