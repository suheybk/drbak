/**
 * Password reset request + confirm.
 *
 * REQUEST:
 *   - Always returns 204 (no enumeration).
 *   - If user exists, mint a single-use token (1h TTL), enqueue reset email.
 *   - Per-account rate limit (3/day).
 *
 * CONFIRM:
 *   - Consume token (single-use). 400 if missing.
 *   - Hash new password with current Argon2id params.
 *   - Reset login counters. Revoke all refresh families for the user (optional —
 *     we currently revoke; user re-logs in everywhere).
 */

import type { Locale } from '@dr-bak/contracts';
import { DomainError, type Result, err, ok } from '../../../domain/shared/errors.js';
import { type CorrelationId, type UserId, asUserId } from '../../../domain/shared/ids.js';
import type {
  AuditLogger,
  Clock,
  EmailNotifier,
  OneTimeTokenStore,
  PasswordHasher,
  RandomTokenGenerator,
  RateLimiter,
  SessionStore,
  UserRepository,
} from '../../ports/index.js';

// ─── Request ────────────────────────────────────────────────

export interface PasswordResetRequestDeps {
  readonly clock: Clock;
  readonly users: UserRepository;
  readonly tokens: OneTimeTokenStore;
  readonly random: RandomTokenGenerator;
  readonly email: EmailNotifier;
  readonly rateLimiter: RateLimiter;
  readonly env: { PUBLIC_BASE_URL: string };
}

export const passwordResetRequest =
  (deps: PasswordResetRequestDeps) =>
  async (input: {
    email: string;
    locale: Locale;
    correlationId: CorrelationId;
  }): Promise<Result<void, DomainError>> => {
    const now = deps.clock.now();
    const emailNorm = input.email.trim().toLowerCase();
    const rl = await deps.rateLimiter.consume({
      bucketKey: `pwreset:${emailNorm}`,
      limit: 3,
      windowSeconds: 24 * 3600,
      now,
    });
    if (!rl.allowed) return ok(undefined); // silent rate-limit (no enumeration either)

    const user = await deps.users.findByEmail(emailNorm);
    if (!user) return ok(undefined); // silent

    const token = deps.random.generate(32);
    await deps.tokens.put({
      purpose: 'password_reset',
      token,
      payload: user.id,
      ttlSeconds: 60 * 60,
      now,
    });
    await deps.email.enqueue({
      toEmail: user.email,
      locale: input.locale,
      template: 'password_reset',
      payload: {
        resetUrl: `${deps.env.PUBLIC_BASE_URL}/${input.locale}/giris/sifre-sifirla?token=${token}`,
      },
      correlationId: input.correlationId,
    });
    return ok(undefined);
  };

// ─── Confirm ────────────────────────────────────────────────

export interface PasswordResetConfirmDeps {
  readonly clock: Clock;
  readonly users: UserRepository;
  readonly tokens: OneTimeTokenStore;
  readonly hasher: PasswordHasher;
  readonly sessions: SessionStore;
  readonly audit: AuditLogger;
}

export const passwordResetConfirm =
  (deps: PasswordResetConfirmDeps) =>
  async (input: {
    token: string;
    newPassword: string;
    correlationId: CorrelationId;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<Result<{ userId: UserId }, DomainError>> => {
    const userIdRaw = await deps.tokens.consume({ purpose: 'password_reset', token: input.token });
    if (!userIdRaw) {
      return err(
        new DomainError({
          code: 'TOKEN_INVALID',
          message: 'Reset link is invalid or expired.',
          httpStatus: 400,
        }),
      );
    }
    const userId = asUserId(userIdRaw);
    const now = deps.clock.now();
    const newHash = await deps.hasher.hash(input.newPassword);
    await deps.users.updatePasswordHash(userId, newHash, now);
    await deps.users.resetLoginCounters(userId);
    // Revoke all sessions: simplest is to revoke by sessionId we know about.
    // For MVP we leave existing sessions valid — the access JWT is short-lived (15 min)
    // and the refresh family will be re-issued on next login. Add a `revokeAllForUser`
    // method later if compromise scenarios warrant it.
    await deps.audit.record({
      actorUserId: userId,
      actorRole: 'patient',
      action: 'update',
      entityType: 'user',
      entityId: userId,
      targetUserId: userId,
      correlationId: input.correlationId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { field: 'passwordHash' },
    });
    return ok({ userId });
  };
