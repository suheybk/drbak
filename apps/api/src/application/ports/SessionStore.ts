import type { UserId } from '../../domain/shared/ids.js';
import type { Instant } from '../../domain/shared/time.js';

export interface RefreshTokenRecord {
  readonly token: string;
  readonly userId: UserId;
  readonly sessionId: string;
  readonly familyId: string;
  readonly createdAt: Instant;
  readonly expiresAt: Instant;
  readonly usedAt: Instant | null;
}

export type RefreshConsumeResult =
  | { kind: 'ok'; record: RefreshTokenRecord }
  | { kind: 'expired' }
  | { kind: 'unknown' }
  | { kind: 'reuse_detected'; familyId: string };

export interface SessionStore {
  /** Issue a new refresh token in a NEW family (login / OAuth complete). */
  issueRoot(input: {
    token: string;
    userId: UserId;
    sessionId: string;
    familyId: string;
    ttlSeconds: number;
    now: Instant;
  }): Promise<void>;

  /** Issue a new refresh token in an EXISTING family (rotation). */
  issueRotation(input: {
    newToken: string;
    previousToken: string;
    userId: UserId;
    sessionId: string;
    familyId: string;
    ttlSeconds: number;
    now: Instant;
    rotationGraceSeconds: number;
  }): Promise<void>;

  /** Consume = verify + mark used. Triggers family-revocation on reuse-after-grace. */
  consume(token: string, now: Instant): Promise<RefreshConsumeResult>;

  revokeFamily(familyId: string): Promise<void>;
  revokeSession(sessionId: string): Promise<void>;
}
