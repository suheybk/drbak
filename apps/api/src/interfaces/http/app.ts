/**
 * Hono app composition root for the API.
 *
 * Wires:
 *  - global middleware (correlation id, security headers)
 *  - container injection (one container per request)
 *  - error mapping (DomainError + ZodError → ApiError envelope)
 *  - route mounts (Drop 3b fills these out — public/auth/booking/patient/admin/webhooks)
 *  - global 404 + 500 handlers
 *
 * The exported `buildApp(env, ctx)` is called from `interfaces/workers/fetch.ts`.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { ExecutionContext } from '@cloudflare/workers-types';
import type { Env } from '../workers/env.js';
import { buildContainer } from '../../composition/buildContainer.js';
import type { Container } from '../../composition/container.js';
import { correlationIdMiddleware } from './middleware/correlationId.js';
import { securityHeadersMiddleware } from './middleware/securityHeaders.js';
import { mapErrorToResponse } from './middleware/errorMapper.js';
import { publicRouter } from './routes/public.js';
import { authRouter } from './routes/auth.js';
import { patientRouter } from './routes/patient.js';
import { adminRouter } from './routes/admin.js';
import { webhookRouter } from './routes/webhooks.js';
import { signedLinksRouter } from './routes/signedLinks.js';

declare module 'hono' {
  interface ContextVariableMap {
    container: Container;
    correlationId: string;
    auth?: import('./middleware/auth.js').AuthContext;
  }
}

export const buildApp = (env: Env, ctx: ExecutionContext) => {
  const app = new Hono<{ Bindings: Env }>();

  // CORS — restrict to the public site and admin origins
  const allowedOrigins = [env.PUBLIC_BASE_URL, env.APP_BASE_URL];
  app.use('*', cors({
    origin: (origin) => (origin && allowedOrigins.includes(origin) ? origin : null),
    credentials: true,
    allowHeaders: ['authorization', 'content-type', 'x-correlation-id', 'idempotency-key'],
    maxAge: 600,
  }));

  app.use('*', correlationIdMiddleware);
  app.use('*', securityHeadersMiddleware);

  // Per-request container
  app.use('*', async (c, next) => {
    c.set('container', buildContainer(env, ctx));
    await next();
  });

  // Health
  app.get('/healthz', (c) => c.json({ ok: true, env: env.ENVIRONMENT }));
  app.get('/readyz', async (c) => {
    // TODO: ping KV + DB lightly
    return c.json({ ok: true });
  });

  // JWKS (public key publication for token verification by web/admin)
  app.get('/.well-known/jwks.json', (c) =>
    c.json({
      keys: [
        // Single ES256 P-256 key. Real `jwk` rendering of the SPKI key happens
        // in Drop 3b once the JWK serializer adapter lands. For now expose the
        // PEM for ops visibility — clients verify via the signed-cookie/Bearer
        // flow which calls the API directly, not via JWKS.
        { kid: env.JWT_SIGNING_KID, alg: 'ES256', use: 'sig', kty: 'EC' },
      ],
    }),
  );

  // ── Route mounts ─────────────────────────────────────────────
  app.route('/api/v1/public', publicRouter);
  app.route('/api/v1/auth', authRouter);
  app.route('/api/v1/patient', patientRouter);
  app.route('/api/v1/webhooks', webhookRouter);
  app.route('/api/v1/admin', adminRouter);
  app.route('/r', signedLinksRouter);

  app.notFound((c) =>
    c.json({ error: { code: 'NOT_FOUND', message: 'Not found.' } }, 404),
  );

  app.onError((err, c) => mapErrorToResponse(err, c));

  return app;
};
