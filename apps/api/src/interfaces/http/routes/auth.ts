/**
 * Auth routes — register, login, refresh, logout, verify-email, me, password reset.
 * OAuth (Google) lives in Drop 3c.
 */

import {
  LocaleSchema,
  LoginRequestSchema,
  PasswordResetConfirmSchema,
  PasswordResetRequestSchema,
  RegisterRequestSchema,
  VerifyEmailRequestSchema,
} from '@dr-bak/contracts';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';
import { z } from 'zod';
import {
  beginGoogleOauth,
  completeGoogleOauth,
} from '../../../application/use-cases/auth/googleOauth.js';
import { login } from '../../../application/use-cases/auth/login.js';
import { logout } from '../../../application/use-cases/auth/logout.js';
import {
  passwordResetConfirm,
  passwordResetRequest,
} from '../../../application/use-cases/auth/passwordReset.js';
import { refreshSession } from '../../../application/use-cases/auth/refreshSession.js';
import { registerPatient } from '../../../application/use-cases/auth/registerPatient.js';
import { verifyEmail } from '../../../application/use-cases/auth/verifyEmail.js';
import { Tx } from '../../../composition/buildContainer.js';
import type { Container } from '../../../composition/container.js';
import { T } from '../../../composition/tokens.js';
import { asCorrelationId, asUserId } from '../../../domain/shared/ids.js';
import type { Env } from '../../workers/env.js';
import { clientIp, localeOf, respond, userAgent } from '../helpers.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = new Hono<{ Bindings: Env }>();

const ACCESS_COOKIE = '__Secure-drbak_at';
const REFRESH_COOKIE = '__Secure-drbak_rt';

const setAuthCookies = (
  c: Parameters<typeof setCookie>[0],
  env: Env,
  tokens: { accessToken: string; refreshToken: string; refreshTokenExpiresAt: number },
) => {
  setCookie(c, ACCESS_COOKIE, tokens.accessToken, {
    path: '/',
    httpOnly: true,
    secure: env.ENVIRONMENT !== 'dev',
    sameSite: 'Strict',
    maxAge: Number(env.TOKEN_ACCESS_TTL_SECONDS),
  });
  setCookie(c, REFRESH_COOKIE, tokens.refreshToken, {
    path: '/api/v1/auth',
    httpOnly: true,
    secure: env.ENVIRONMENT !== 'dev',
    sameSite: 'Strict',
    maxAge: Number(env.TOKEN_REFRESH_TTL_SECONDS),
  });
};

authRouter.post('/register', zValidator('json', RegisterRequestSchema), async (c) => {
  const env = c.env;
  const container = c.get('container') as Container;
  const useCase = registerPatient({
    db: container.resolve(Tx.Db as never) as never,
    users: container.resolve(Tx.UserRepository),
    consents: container.resolve(T.ConsentRepository),
    hasher: container.resolve(Tx.PasswordHasher as never) as never,
    clock: container.resolve(T.Clock),
    ids: container.resolve(T.IdGenerator),
    tokens: container.resolve(Tx.OneTimeTokenStore),
    random: container.resolve(Tx.RandomTokens as never) as never,
    audit: container.resolve(T.AuditLogger),
    env: { CONSENT_DOCUMENT_VERSION: env.CONSENT_DOCUMENT_VERSION },
  });
  const body = c.req.valid('json');
  const r = await useCase({
    correlationId: asCorrelationId(c.get('correlationId')),
    email: body.email,
    password: body.password,
    fullName: body.fullName,
    dateOfBirth: body.dateOfBirth,
    locale: body.locale,
    phoneE164: body.phoneE164 ?? null,
    consents: {
      appointmentBooking: body.consents.appointmentBooking,
      healthDataProcessing: body.consents.healthDataProcessing,
      ...(body.consents.marketingCommunications !== undefined
        ? { marketingCommunications: body.consents.marketingCommunications }
        : {}),
    },
    consentDocumentVersion: body.consentDocumentVersion,
    ipAddress: clientIp(c),
    userAgent: userAgent(c),
  });
  if (!r.ok) return c.json({ error: r.error.toJSON() }, r.error.httpStatus as never);

  // Enqueue verification email
  const email = container.resolve(T.EmailNotifier);
  await email.enqueue({
    toEmail: body.email,
    locale: body.locale,
    template: 'email_verify',
    payload: {
      verifyUrl: `${env.PUBLIC_BASE_URL}/${body.locale}/giris/dogrula?token=${r.value.verificationToken}`,
    },
    correlationId: asCorrelationId(c.get('correlationId')),
  });

  return c.json({ userId: r.value.userId, emailSent: true }, 201);
});

authRouter.post('/login', zValidator('json', LoginRequestSchema), async (c) => {
  const env = c.env;
  const container = c.get('container') as Container;
  const useCase = login({
    clock: container.resolve(T.Clock),
    users: container.resolve(Tx.UserRepository),
    hasher: container.resolve(Tx.PasswordHasher as never) as never,
    tokenIssuer: container.resolve(Tx.TokenIssuer as never) as never,
    sessions: container.resolve(Tx.SessionStore),
    random: container.resolve(Tx.RandomTokens as never) as never,
    ids: container.resolve(T.IdGenerator),
    rateLimiter: container.resolve(Tx.RateLimiter),
    audit: container.resolve(T.AuditLogger),
    env: {
      TOKEN_ACCESS_TTL_SECONDS: Number(env.TOKEN_ACCESS_TTL_SECONDS),
      TOKEN_REFRESH_TTL_SECONDS: Number(env.TOKEN_REFRESH_TTL_SECONDS),
      RATE_LIMIT_LOGIN_PER_15M: Number(env.RATE_LIMIT_LOGIN_PER_15M),
      LOCKOUT_THRESHOLD_FAILURES: 10,
    },
  });
  const body = c.req.valid('json');
  const r = await useCase({
    correlationId: asCorrelationId(c.get('correlationId')),
    email: body.email,
    password: body.password,
    ipAddress: clientIp(c),
    userAgent: userAgent(c),
  });
  if (!r.ok) return c.json({ error: r.error.toJSON() }, r.error.httpStatus as never);
  setAuthCookies(c, env, {
    accessToken: r.value.accessToken,
    refreshToken: r.value.refreshToken,
    refreshTokenExpiresAt: r.value.refreshTokenExpiresAt as number,
  });
  return c.json({
    accessToken: r.value.accessToken,
    accessTokenExpiresAt: new Date(r.value.accessTokenExpiresAt as number).toISOString(),
  });
});

authRouter.post('/refresh', async (c) => {
  const env = c.env;
  const container = c.get('container') as Container;
  const cookieHeader = c.req.header('cookie') ?? '';
  const refreshToken = new RegExp(`${REFRESH_COOKIE}=([^;]+)`).exec(cookieHeader)?.[1];
  if (!refreshToken) {
    return c.json({ error: { code: 'TOKEN_INVALID', message: 'No refresh token.' } }, 401);
  }
  const useCase = refreshSession({
    clock: container.resolve(T.Clock),
    users: container.resolve(Tx.UserRepository),
    sessions: container.resolve(Tx.SessionStore),
    tokenIssuer: container.resolve(Tx.TokenIssuer as never) as never,
    random: container.resolve(Tx.RandomTokens as never) as never,
    env: {
      TOKEN_ACCESS_TTL_SECONDS: Number(env.TOKEN_ACCESS_TTL_SECONDS),
      TOKEN_REFRESH_TTL_SECONDS: Number(env.TOKEN_REFRESH_TTL_SECONDS),
      REFRESH_ROTATION_GRACE_SECONDS: 5 * 60,
    },
  });
  const r = await useCase(refreshToken);
  if (!r.ok) {
    deleteCookie(c, REFRESH_COOKIE, { path: '/api/v1/auth' });
    deleteCookie(c, ACCESS_COOKIE, { path: '/' });
    return c.json({ error: r.error.toJSON() }, r.error.httpStatus as never);
  }
  setAuthCookies(c, env, {
    accessToken: r.value.accessToken,
    refreshToken: r.value.refreshToken,
    refreshTokenExpiresAt: r.value.refreshTokenExpiresAt as number,
  });
  return c.json({
    accessToken: r.value.accessToken,
    accessTokenExpiresAt: new Date(r.value.accessTokenExpiresAt as number).toISOString(),
  });
});

authRouter.post('/logout', requireAuth(), async (c) => {
  const container = c.get('container') as Container;
  const auth = c.get('auth')!;
  const useCase = logout({
    clock: container.resolve(T.Clock),
    sessions: container.resolve(Tx.SessionStore),
    audit: container.resolve(T.AuditLogger),
  });
  await useCase({
    sessionId: auth.sessionId,
    userId: asUserId(auth.userId),
    role: auth.role,
    correlationId: asCorrelationId(c.get('correlationId')),
    ipAddress: clientIp(c),
    userAgent: userAgent(c),
  });
  deleteCookie(c, ACCESS_COOKIE, { path: '/' });
  deleteCookie(c, REFRESH_COOKIE, { path: '/api/v1/auth' });
  return c.body(null, 204);
});

authRouter.post('/email/verify', zValidator('json', VerifyEmailRequestSchema), async (c) => {
  const container = c.get('container') as Container;
  const useCase = verifyEmail({
    clock: container.resolve(T.Clock),
    users: container.resolve(Tx.UserRepository),
    tokens: container.resolve(Tx.OneTimeTokenStore),
    audit: container.resolve(T.AuditLogger),
  });
  const body = c.req.valid('json');
  const r = await useCase({
    correlationId: asCorrelationId(c.get('correlationId')),
    token: body.token,
    ipAddress: clientIp(c),
    userAgent: userAgent(c),
  });
  return respond(c, r);
});

authRouter.post(
  '/email/resend',
  zValidator('json', z.object({ email: z.string().email() })),
  async (c) => {
    // Rate-limited at 3/day. Always returns 204 — no enumeration.
    const env = c.env;
    const container = c.get('container') as Container;
    const rl = container.resolve(Tx.RateLimiter);
    const decision = await rl.consume({
      bucketKey: `verify:resend:${c.req.valid('json').email}`,
      limit: 3,
      windowSeconds: 24 * 3600,
      now: container.resolve(T.Clock).now(),
    });
    if (!decision.allowed) return c.body(null, 204);
    // Drop 3c implements the actual resend pipeline.
    void env;
    return c.body(null, 204);
  },
);

authRouter.post(
  '/password/reset/request',
  zValidator('json', PasswordResetRequestSchema),
  async (c) => {
    const env = c.env;
    const container = c.get('container') as Container;
    const body = c.req.valid('json');
    const useCase = passwordResetRequest({
      clock: container.resolve(T.Clock),
      users: container.resolve(Tx.UserRepository),
      tokens: container.resolve(Tx.OneTimeTokenStore),
      random: container.resolve(Tx.RandomTokens as never) as never,
      email: container.resolve(T.EmailNotifier),
      rateLimiter: container.resolve(Tx.RateLimiter),
      env: { PUBLIC_BASE_URL: env.PUBLIC_BASE_URL },
    });
    await useCase({
      email: body.email,
      locale: localeOf(c),
      correlationId: asCorrelationId(c.get('correlationId')),
    });
    return c.body(null, 204);
  },
);

authRouter.post(
  '/password/reset/confirm',
  zValidator('json', PasswordResetConfirmSchema),
  async (c) => {
    const container = c.get('container') as Container;
    const body = c.req.valid('json');
    const useCase = passwordResetConfirm({
      clock: container.resolve(T.Clock),
      users: container.resolve(Tx.UserRepository),
      tokens: container.resolve(Tx.OneTimeTokenStore),
      hasher: container.resolve(Tx.PasswordHasher as never) as never,
      sessions: container.resolve(Tx.SessionStore),
      audit: container.resolve(T.AuditLogger),
    });
    const r = await useCase({
      token: body.token,
      newPassword: body.newPassword,
      correlationId: asCorrelationId(c.get('correlationId')),
      ipAddress: clientIp(c),
      userAgent: userAgent(c),
    });
    return respond(c, r);
  },
);

// ─── Google OAuth ──────────────────────────────────────────

authRouter.get(
  '/oauth/google/begin',
  zValidator(
    'query',
    z.object({ redirectAfter: z.string().url().optional(), locale: LocaleSchema.optional() }),
  ),
  async (c) => {
    const env = c.env;
    const container = c.get('container') as Container;
    const q = c.req.valid('query');
    const useCase = beginGoogleOauth({
      google: container.resolve(Tx.GoogleOauthClient as never) as never,
      tokens: container.resolve(Tx.OneTimeTokenStore),
      clock: container.resolve(T.Clock),
      env: { PUBLIC_BASE_URL: env.PUBLIC_BASE_URL, API_BASE_URL: env.API_BASE_URL },
    });
    const { authUrl } = await useCase({
      redirectAfter: q.redirectAfter ?? `${env.PUBLIC_BASE_URL}/${q.locale ?? 'tr'}`,
      locale: q.locale ?? 'tr',
    });
    return c.redirect(authUrl, 302);
  },
);

authRouter.get(
  '/oauth/google/callback',
  zValidator('query', z.object({ code: z.string(), state: z.string() })),
  async (c) => {
    const env = c.env;
    const container = c.get('container') as Container;
    const q = c.req.valid('query');
    const useCase = completeGoogleOauth({
      google: container.resolve(Tx.GoogleOauthClient as never) as never,
      tokens: container.resolve(Tx.OneTimeTokenStore),
      users: container.resolve(Tx.UserRepository),
      sessions: container.resolve(Tx.SessionStore),
      tokenIssuer: container.resolve(Tx.TokenIssuer as never) as never,
      random: container.resolve(Tx.RandomTokens as never) as never,
      ids: container.resolve(T.IdGenerator),
      clock: container.resolve(T.Clock),
      audit: container.resolve(T.AuditLogger),
      env: {
        PUBLIC_BASE_URL: env.PUBLIC_BASE_URL,
        API_BASE_URL: env.API_BASE_URL,
        TOKEN_ACCESS_TTL_SECONDS: Number(env.TOKEN_ACCESS_TTL_SECONDS),
        TOKEN_REFRESH_TTL_SECONDS: Number(env.TOKEN_REFRESH_TTL_SECONDS),
      },
    });
    const r = await useCase({
      code: q.code,
      state: q.state,
      correlationId: asCorrelationId(c.get('correlationId')),
      ipAddress: clientIp(c),
      userAgent: userAgent(c),
    });
    if (!r.ok) return c.json({ error: r.error.toJSON() }, r.error.httpStatus as never);
    setAuthCookies(c, env, {
      accessToken: r.value.accessToken,
      refreshToken: r.value.refreshToken,
      refreshTokenExpiresAt: r.value.refreshTokenExpiresAt as number,
    });
    return c.redirect(r.value.redirectAfter, 302);
  },
);

authRouter.get('/me', requireAuth(), async (c) => {
  const auth = c.get('auth')!;
  return c.json({
    userId: auth.userId,
    role: auth.role,
    locale: auth.locale,
    emailVerified: auth.emailVerified,
  });
});
