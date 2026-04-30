import type { Instant } from '../../domain/shared/time.js';

export interface PasswordHasher {
  hash(plaintext: string): Promise<string>;
  /** Returns true on match. Also returns whether the hash needs upgrading. */
  verify(plaintext: string, storedHash: string): Promise<{ ok: boolean; needsRehash: boolean }>;
}

export interface JwtClaims {
  readonly sub: string; // userId
  readonly sid: string; // sessionId
  readonly rol: string; // role hint (server re-checks)
  readonly loc: string; // locale
}

export interface IssuedToken {
  readonly token: string;
  readonly expiresAt: Instant;
  readonly jti: string;
}

export interface TokenIssuer {
  issueAccess(claims: JwtClaims, ttlSeconds: number, now: Instant): Promise<IssuedToken>;
  verifyAccess(token: string, now: Instant): Promise<JwtClaims | null>;
}

export interface RandomTokenGenerator {
  /** Cryptographically random base64url-encoded token of `bytes` bytes. */
  generate(bytes: number): string;
}
