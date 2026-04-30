import type { MiddlewareHandler } from 'hono';

/**
 * Strict security headers for the API. The web app (Astro) sets its own CSP
 * in `apps/web/`; this middleware sets API-side defaults.
 *
 * The API serves only JSON, so a tight CSP is safe.
 */
export const securityHeadersMiddleware: MiddlewareHandler = async (c, next) => {
  await next();
  c.header('strict-transport-security', 'max-age=63072000; includeSubDomains; preload');
  c.header('x-content-type-options', 'nosniff');
  c.header('x-frame-options', 'DENY');
  c.header('referrer-policy', 'no-referrer');
  c.header('permissions-policy', 'geolocation=(), microphone=(), camera=()');
  c.header('cross-origin-opener-policy', 'same-origin');
  c.header('cross-origin-resource-policy', 'same-site');
  c.header('content-security-policy', "default-src 'none'; frame-ancestors 'none'");
};
