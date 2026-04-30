/**
 * Refresh-token session store backed by Cloudflare KV.
 *
 * Keys:
 *   refresh:{token}       → RefreshTokenRecord  (TTL = refresh TTL)
 *   family:{familyId}     → 'live' | 'revoked'  (TTL = refresh TTL)
 *   session:{sessionId}   → familyId            (for revokeSession)
 *
 * Family-revocation rule: if a token is `consume`d after `usedAt + rotationGrace`,
 * we mark the whole family revoked and refuse the consume.
 */

import type { KVNamespace } from '@cloudflare/workers-types';
import type {
  RefreshConsumeResult,
  RefreshTokenRecord,
  SessionStore,
} from '../../application/ports/index.js';
import type { Instant } from '../../domain/shared/time.js';
import { instantFromMillis } from '../../domain/shared/time.js';
import type { UserId } from '../../domain/shared/ids.js';
import { asUserId } from '../../domain/shared/ids.js';

interface Stored {
  userId: string;
  sessionId: string;
  familyId: string;
  createdAtMs: number;
  expiresAtMs: number;
  usedAtMs: number | null;
}

export class KVSessionStore implements SessionStore {
  constructor(private readonly kv: KVNamespace) {}

  async issueRoot(input: {
    token: string;
    userId: UserId;
    sessionId: string;
    familyId: string;
    ttlSeconds: number;
    now: Instant;
  }): Promise<void> {
    const expMs = (input.now as number) + input.ttlSeconds * 1000;
    const stored: Stored = {
      userId: input.userId,
      sessionId: input.sessionId,
      familyId: input.familyId,
      createdAtMs: input.now as number,
      expiresAtMs: expMs,
      usedAtMs: null,
    };
    await Promise.all([
      this.kv.put(`refresh:${input.token}`, JSON.stringify(stored), {
        expirationTtl: input.ttlSeconds,
      }),
      this.kv.put(`family:${input.familyId}`, 'live', {
        expirationTtl: input.ttlSeconds,
      }),
      this.kv.put(`session:${input.sessionId}`, input.familyId, {
        expirationTtl: input.ttlSeconds,
      }),
    ]);
  }

  async issueRotation(input: {
    newToken: string;
    previousToken: string;
    userId: UserId;
    sessionId: string;
    familyId: string;
    ttlSeconds: number;
    now: Instant;
    rotationGraceSeconds: number;
  }): Promise<void> {
    // Mark the previous token as used; keep it for grace
    const prev = await this.kv.get<Stored>(`refresh:${input.previousToken}`, 'json');
    if (prev) {
      prev.usedAtMs = input.now as number;
      await this.kv.put(`refresh:${input.previousToken}`, JSON.stringify(prev), {
        expirationTtl: input.rotationGraceSeconds,
      });
    }
    const expMs = (input.now as number) + input.ttlSeconds * 1000;
    const stored: Stored = {
      userId: input.userId,
      sessionId: input.sessionId,
      familyId: input.familyId,
      createdAtMs: input.now as number,
      expiresAtMs: expMs,
      usedAtMs: null,
    };
    await this.kv.put(`refresh:${input.newToken}`, JSON.stringify(stored), {
      expirationTtl: input.ttlSeconds,
    });
  }

  async consume(token: string, now: Instant): Promise<RefreshConsumeResult> {
    const stored = await this.kv.get<Stored>(`refresh:${token}`, 'json');
    if (!stored) return { kind: 'unknown' };
    if (stored.expiresAtMs <= (now as number)) return { kind: 'expired' };

    const familyState = await this.kv.get(`family:${stored.familyId}`);
    if (familyState === 'revoked') return { kind: 'reuse_detected', familyId: stored.familyId };

    if (stored.usedAtMs !== null) {
      // Reuse beyond grace = compromise. Revoke whole family.
      await this.revokeFamily(stored.familyId);
      return { kind: 'reuse_detected', familyId: stored.familyId };
    }

    return {
      kind: 'ok',
      record: {
        token,
        userId: asUserId(stored.userId),
        sessionId: stored.sessionId,
        familyId: stored.familyId,
        createdAt: instantFromMillis(stored.createdAtMs),
        expiresAt: instantFromMillis(stored.expiresAtMs),
        usedAt: stored.usedAtMs !== null ? instantFromMillis(stored.usedAtMs) : null,
      },
    };
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.kv.put(`family:${familyId}`, 'revoked', {
      expirationTtl: 14 * 24 * 3600,
    });
  }

  async revokeSession(sessionId: string): Promise<void> {
    const familyId = await this.kv.get(`session:${sessionId}`);
    if (familyId) await this.revokeFamily(familyId);
  }
}
