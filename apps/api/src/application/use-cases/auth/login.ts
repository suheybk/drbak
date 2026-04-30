/**
 * Use case: email + password login.
 *
 * Steps:
 *   1. Per-IP+email rate limit (5 / 15min). Return generic error on hit.
 *   2. Load user by normalized email. (No enumeration: same generic error.)
 *   3. If locked → generic error.
 *   4. Verify password (Argon2id). Wrong → record failure, generic error,
 *      escalate to lockout above threshold.
 *   5. Issue access JWT (15 min) + refresh token (14 days, KV).
 *   6. Audit `login`.
 *
 * Caller is responsible for setting the refresh-token cookie on the HTTP response.
 */

import type { Locale } from '@dr-bak/contracts';
import { DomainError, type Result, err, ok } from '../../../domain/shared/errors.js';
import type { CorrelationId, UserId } from '../../../domain/shared/ids.js';
import { type Instant, instantFromMillis } from '../../../domain/shared/time.js';
import type {
  AuditLogger,
  Clock,
  IdGenerator,
  PasswordHasher,
  RandomTokenGenerator,
  RateLimiter,
  SessionStore,
  TokenIssuer,
  UserRepository,
} from '../../ports/index.js';

export interface LoginDeps {
  readonly clock: Clock;
  readonly users: UserRepository;
  readonly hasher: PasswordHasher;
  readonly tokenIssuer: TokenIssuer;
  readonly sessions: SessionStore;
  readonly random: RandomTokenGenerator;
  readonly ids: IdGenerator;
  readonly rateLimiter: RateLimiter;
  readonly audit: AuditLogger;
  readonly env: {
    TOKEN_ACCESS_TTL_SECONDS: number;
    TOKEN_REFRESH_TTL_SECONDS: number;
    RATE_LIMIT_LOGIN_PER_15M: number;
    LOCKOUT_THRESHOLD_FAILURES: number;
  };
}

export interface LoginInput {
  readonly correlationId: CorrelationId;
  readonly email: string;
  readonly password: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

export interface LoginOutput {
  readonly accessToken: string;
  readonly accessTokenExpiresAt: Instant;
  readonly refreshToken: string;
  readonly refreshTokenExpiresAt: Instant;
  readonly userId: UserId;
  readonly role: string;
  readonly locale: Locale;
}

export const login =
  (deps: LoginDeps) =>
  async (input: LoginInput): Promise<Result<LoginOutput, DomainError>> => {
    const now = deps.clock.now();
    const emailNorm = input.email.trim().toLowerCase();
    const ip = input.ipAddress ?? 'unknown';

    // 1. Rate limit
    const rl = await deps.rateLimiter.consume({
      bucketKey: `login:${ip}|${emailNorm}`,
      limit: deps.env.RATE_LIMIT_LOGIN_PER_15M,
      windowSeconds: 15 * 60,
      now,
    });
    if (!rl.allowed) {
      return err(
        new DomainError({
          code: 'RATE_LIMITED',
          message: 'Too many attempts. Please try again later.',
          httpStatus: 429,
          details: { retryAfterSeconds: rl.retryAfterSeconds },
        }),
      );
    }

    // 2. Load user (no enumeration)
    const user = await deps.users.findByEmail(emailNorm);
    if (!user) return err(invalidCredentials());

    // 3. Lockout check
    if (user.lockedUntil && (user.lockedUntil as number) > (now as number)) {
      return err(invalidCredentials());
    }

    // 4. Password verification
    if (!user.passwordHash) return err(invalidCredentials());
    const v = await deps.hasher.verify(input.password, user.passwordHash);
    if (!v.ok) {
      // Record failure with conditional lock
      const nextFailureCount = user.failedLoginCount + 1;
      const lockUntil = computeLockUntil(
        nextFailureCount,
        deps.env.LOCKOUT_THRESHOLD_FAILURES,
        now,
      );
      await deps.users.recordLoginFailure(user.id, lockUntil);
      return err(invalidCredentials());
    }

    if (v.needsRehash) {
      const newHash = await deps.hasher.hash(input.password);
      await deps.users.updatePasswordHash(user.id, newHash, now);
    }

    // 5. Issue tokens
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

    // 6. Bookkeeping + audit
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
    });

    return ok({
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt,
      refreshToken,
      refreshTokenExpiresAt: refreshExp,
      userId: user.id,
      role: user.role,
      locale: user.locale,
    });
  };

const invalidCredentials = (): DomainError =>
  new DomainError({
    code: 'INVALID_CREDENTIALS',
    message: 'Email or password is incorrect.',
    httpStatus: 401,
  });

const computeLockUntil = (failures: number, threshold: number, now: Instant): Instant | null => {
  if (failures < threshold) return null;
  // 2^(failures - threshold) minutes, capped at 24h
  const minutes = Math.min(2 ** (failures - threshold), 24 * 60);
  return instantFromMillis((now as number) + minutes * 60_000);
};
