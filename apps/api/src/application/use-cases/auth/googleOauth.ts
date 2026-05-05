/**
 * Google OAuth use cases — begin + complete with PKCE + account-linking guard.
 */

import type { Locale } from '@dr-bak/contracts';
import { DomainError, type Result, err, ok } from '../../../domain/shared/errors.js';
import { type CorrelationId, type UserId, asUserId } from '../../../domain/shared/ids.js';
import { type Instant, instantFromMillis } from '../../../domain/shared/time.js';
import type { GoogleOauthClient } from '../../../infrastructure/oauth/GoogleOauthClient.js';
import type {
  AuditLogger,
  Clock,
  IdGenerator,
  OneTimeTokenStore,
  RandomTokenGenerator,
  SessionStore,
  TokenIssuer,
  UserRepository,
} from '../../ports/index.js';

// ─── Begin ──────────────────────────────────────────────────

export interface BeginGoogleOauthDeps {
  readonly google: GoogleOauthClient;
  readonly tokens: OneTimeTokenStore;
  readonly clock: Clock;
  readonly env: {
    PUBLIC_BASE_URL: string;
    /** Optional override for the API origin used in OAuth redirect URIs. */
    API_BASE_URL?: string | undefined;
  };
}

export interface BeginGoogleOauthInput {
  readonly redirectAfter: string;
  readonly locale: Locale;
}

export const beginGoogleOauth =
  (deps: BeginGoogleOauthDeps) =>
  async (input: BeginGoogleOauthInput): Promise<{ authUrl: string }> => {
    const now = deps.clock.now();
    const { codeVerifier, codeChallenge } = await deps.google.generatePkce();
    const stateBytes = new Uint8Array(16);
    crypto.getRandomValues(stateBytes);
    const state = Array.from(stateBytes, (b) => b.toString(16).padStart(2, '0')).join('');

    const allowedRedirects = new Set([deps.env.PUBLIC_BASE_URL, `${deps.env.PUBLIC_BASE_URL}/`]);
    const redirectAfter =
      input.redirectAfter && [...allowedRedirects].some((p) => input.redirectAfter.startsWith(p))
        ? input.redirectAfter
        : `${deps.env.PUBLIC_BASE_URL}/${input.locale}`;

    await deps.tokens.put({
      purpose: 'oauth_state',
      token: state,
      payload: JSON.stringify({ codeVerifier, redirectAfter, locale: input.locale }),
      ttlSeconds: 10 * 60,
      now,
    });

    const apiBase =
      deps.env.API_BASE_URL ?? deps.env.PUBLIC_BASE_URL.replace(/^https?:\/\//, 'https://api.');
    const redirectUri = `${apiBase.replace(/\/$/, '')}/api/v1/auth/oauth/google/callback`;
    const authUrl = deps.google.buildAuthUrl({
      state,
      codeChallenge,
      redirectUri,
      locale: input.locale,
    });
    return { authUrl };
  };

// ─── Complete ──────────────────────────────────────────────

export interface CompleteGoogleOauthDeps {
  readonly google: GoogleOauthClient;
  readonly tokens: OneTimeTokenStore;
  readonly users: UserRepository;
  readonly sessions: SessionStore;
  readonly tokenIssuer: TokenIssuer;
  readonly random: RandomTokenGenerator;
  readonly ids: IdGenerator;
  readonly clock: Clock;
  readonly audit: AuditLogger;
  readonly env: {
    PUBLIC_BASE_URL: string;
    /** Optional override for the API origin used in OAuth redirect URIs. */
    API_BASE_URL?: string | undefined;
    TOKEN_ACCESS_TTL_SECONDS: number;
    TOKEN_REFRESH_TTL_SECONDS: number;
  };
}

export interface CompleteGoogleOauthInput {
  readonly code: string;
  readonly state: string;
  readonly correlationId: CorrelationId;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

export interface CompleteGoogleOauthOutput {
  readonly userId: UserId;
  readonly accessToken: string;
  readonly accessTokenExpiresAt: Instant;
  readonly refreshToken: string;
  readonly refreshTokenExpiresAt: Instant;
  readonly redirectAfter: string;
  readonly role: string;
  readonly locale: string;
}

export const completeGoogleOauth =
  (deps: CompleteGoogleOauthDeps) =>
  async (
    input: CompleteGoogleOauthInput,
  ): Promise<Result<CompleteGoogleOauthOutput, DomainError>> => {
    const stateRaw = await deps.tokens.consume({ purpose: 'oauth_state', token: input.state });
    if (!stateRaw) {
      return err(
        new DomainError({
          code: 'OAUTH_STATE_INVALID',
          message: 'OAuth state invalid or expired.',
          httpStatus: 400,
        }),
      );
    }
    const stateData = JSON.parse(stateRaw) as {
      codeVerifier: string;
      redirectAfter: string;
      locale: Locale;
    };

    const apiBase =
      deps.env.API_BASE_URL ?? deps.env.PUBLIC_BASE_URL.replace(/^https?:\/\//, 'https://api.');
    const redirectUri = `${apiBase.replace(/\/$/, '')}/api/v1/auth/oauth/google/callback`;
    let claims: { sub: string; email: string; email_verified?: boolean; name?: string };
    try {
      const { idToken } = await deps.google.exchangeCode({
        code: input.code,
        codeVerifier: stateData.codeVerifier,
        redirectUri,
      });
      claims = await deps.google.verifyIdToken(idToken, deps.clock.now() as number);
    } catch {
      return err(
        new DomainError({
          code: 'OAUTH_STATE_INVALID',
          message: 'OAuth verification failed.',
          httpStatus: 400,
        }),
      );
    }

    const now = deps.clock.now();
    const emailNorm = claims.email.trim().toLowerCase();

    // Account-linking guard
    const byOauth = await deps.users.findByOauthAccount('google', claims.sub);
    let user = byOauth;
    if (!user) {
      const byEmail = await deps.users.findByEmail(emailNorm);
      if (byEmail) {
        // Email matches an existing user without OAuth — require password re-auth
        // before linking. We surface OAUTH_ACCOUNT_MISMATCH and let the SPA
        // route the user to a confirm-link flow (Phase 1 Drop 4).
        return err(
          new DomainError({
            code: 'OAUTH_ACCOUNT_MISMATCH',
            message:
              'An account with this email already exists. Sign in with password to link Google.',
            httpStatus: 409,
            details: { existingUserId: byEmail.id },
          }),
        );
      }
      // Brand new user — provision
      user = await deps.users.create({
        id: asUserId(deps.ids.generate()),
        email: claims.email,
        passwordHash: null, // OAuth-only
        role: 'patient',
        locale: stateData.locale,
        emailVerifiedAt: now,
        now,
      });
      await deps.users.linkOauthAccount({
        userId: user.id,
        provider: 'google',
        providerAccountId: claims.sub,
        email: claims.email,
        now,
      });
    }

    // Issue tokens (mirrors login.ts)
    const sessionId = deps.ids.generate();
    const familyId = deps.ids.generate();
    const access = await deps.tokenIssuer.issueAccess(
      { sub: user.id, sid: sessionId, rol: user.role, loc: user.locale },
      deps.env.TOKEN_ACCESS_TTL_SECONDS,
      now,
    );
    const refreshToken = deps.random.generate(32);
    const refreshExp = instantFromMillis(
      (now as number) + deps.env.TOKEN_REFRESH_TTL_SECONDS * 1000,
    );
    await deps.sessions.issueRoot({
      token: refreshToken,
      userId: user.id,
      sessionId,
      familyId,
      ttlSeconds: deps.env.TOKEN_REFRESH_TTL_SECONDS,
      now,
    });

    await deps.users.recordLoginSuccess(user.id, now);
    await deps.audit.record({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'login',
      entityType: 'user',
      entityId: user.id,
      targetUserId: user.id,
      correlationId: input.correlationId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { method: 'oauth_google' },
    });

    return ok({
      userId: user.id,
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt,
      refreshToken,
      refreshTokenExpiresAt: refreshExp,
      redirectAfter: stateData.redirectAfter,
      role: user.role,
      locale: user.locale,
    });
  };
