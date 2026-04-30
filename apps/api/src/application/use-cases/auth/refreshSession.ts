/**
 * Use case: rotate refresh token, issue new access JWT.
 *
 * On reuse-after-grace: revoke whole family + 401.
 */

import type { Locale } from '@dr-bak/contracts';
import { DomainError, type Result, err, ok } from '../../../domain/shared/errors.js';
import type { UserId } from '../../../domain/shared/ids.js';
import { type Instant, instantFromMillis } from '../../../domain/shared/time.js';
import type {
  Clock,
  RandomTokenGenerator,
  SessionStore,
  TokenIssuer,
  UserRepository,
} from '../../ports/index.js';

export interface RefreshDeps {
  readonly clock: Clock;
  readonly users: UserRepository;
  readonly sessions: SessionStore;
  readonly tokenIssuer: TokenIssuer;
  readonly random: RandomTokenGenerator;
  readonly env: {
    TOKEN_ACCESS_TTL_SECONDS: number;
    TOKEN_REFRESH_TTL_SECONDS: number;
    REFRESH_ROTATION_GRACE_SECONDS: number;
  };
}

export interface RefreshOutput {
  readonly accessToken: string;
  readonly accessTokenExpiresAt: Instant;
  readonly refreshToken: string;
  readonly refreshTokenExpiresAt: Instant;
  readonly userId: UserId;
  readonly role: string;
  readonly locale: Locale;
}

export const refreshSession =
  (deps: RefreshDeps) =>
  async (refreshToken: string): Promise<Result<RefreshOutput, DomainError>> => {
    const now = deps.clock.now();
    const consumed = await deps.sessions.consume(refreshToken, now);

    switch (consumed.kind) {
      case 'unknown':
        return err(
          new DomainError({
            code: 'TOKEN_INVALID',
            message: 'Refresh token unknown.',
            httpStatus: 401,
          }),
        );
      case 'expired':
        return err(
          new DomainError({
            code: 'TOKEN_EXPIRED',
            message: 'Refresh token expired.',
            httpStatus: 401,
          }),
        );
      case 'reuse_detected':
        return err(
          new DomainError({
            code: 'REFRESH_REUSE_DETECTED',
            message: 'Session compromised. Please log in again.',
            httpStatus: 401,
          }),
        );
    }

    const r = consumed.record;
    const user = await deps.users.findById(r.userId);
    if (!user || user.deletedAt) {
      await deps.sessions.revokeFamily(r.familyId);
      return err(
        new DomainError({
          code: 'TOKEN_INVALID',
          message: 'Account no longer active.',
          httpStatus: 401,
        }),
      );
    }

    const newRefresh = deps.random.generate(32);
    const refreshExp = instantFromMillis(
      (now as number) + deps.env.TOKEN_REFRESH_TTL_SECONDS * 1000,
    );
    await deps.sessions.issueRotation({
      newToken: newRefresh,
      previousToken: refreshToken,
      userId: user.id,
      sessionId: r.sessionId,
      familyId: r.familyId,
      ttlSeconds: deps.env.TOKEN_REFRESH_TTL_SECONDS,
      now,
      rotationGraceSeconds: deps.env.REFRESH_ROTATION_GRACE_SECONDS,
    });

    const access = await deps.tokenIssuer.issueAccess(
      { sub: user.id, sid: r.sessionId, rol: user.role, loc: user.locale },
      deps.env.TOKEN_ACCESS_TTL_SECONDS,
      now,
    );

    return ok({
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt,
      refreshToken: newRefresh,
      refreshTokenExpiresAt: refreshExp,
      userId: user.id,
      role: user.role,
      locale: user.locale,
    });
  };
