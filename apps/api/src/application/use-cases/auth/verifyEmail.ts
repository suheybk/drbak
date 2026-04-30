import type {
  AuditLogger,
  Clock,
  OneTimeTokenStore,
  UserRepository,
} from '../../ports/index.js';
import { DomainError, err, ok, type Result } from '../../../domain/shared/errors.js';
import { asUserId, type CorrelationId } from '../../../domain/shared/ids.js';

export interface VerifyEmailDeps {
  readonly clock: Clock;
  readonly users: UserRepository;
  readonly tokens: OneTimeTokenStore;
  readonly audit: AuditLogger;
}

export const verifyEmail =
  (deps: VerifyEmailDeps) =>
  async (input: {
    correlationId: CorrelationId;
    token: string;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<Result<{ userId: string }, DomainError>> => {
    const userIdRaw = await deps.tokens.consume({ purpose: 'email_verify', token: input.token });
    if (!userIdRaw) {
      return err(
        new DomainError({
          code: 'TOKEN_INVALID',
          message: 'Verification link is invalid or expired.',
          httpStatus: 400,
        }),
      );
    }
    const userId = asUserId(userIdRaw);
    const now = deps.clock.now();
    await deps.users.markEmailVerified(userId, now);
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
      metadata: { field: 'emailVerifiedAt' },
    });
    return ok({ userId });
  };
