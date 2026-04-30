import { type DomainError, type Result, ok } from '../../../domain/shared/errors.js';
import type { CorrelationId, UserId } from '../../../domain/shared/ids.js';
import type { AuditLogger, Clock, SessionStore } from '../../ports/index.js';

export interface LogoutDeps {
  readonly clock: Clock;
  readonly sessions: SessionStore;
  readonly audit: AuditLogger;
}

export const logout =
  (deps: LogoutDeps) =>
  async (input: {
    sessionId: string;
    userId: UserId;
    role: 'patient' | 'staff' | 'admin' | 'doctor';
    correlationId: CorrelationId;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<Result<void, DomainError>> => {
    await deps.sessions.revokeSession(input.sessionId);
    await deps.audit.record({
      actorUserId: input.userId,
      actorRole: input.role,
      action: 'logout',
      entityType: 'user',
      entityId: input.userId,
      targetUserId: input.userId,
      correlationId: input.correlationId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
    return ok(undefined);
  };
