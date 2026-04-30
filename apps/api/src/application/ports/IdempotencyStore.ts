/**
 * Idempotency dedupe across mutating endpoints. KV-backed in production.
 *
 * Contract: `claim(key, requestFingerprint, ttlSeconds)`
 *   - returns 'fresh' if no prior claim — caller proceeds
 *   - returns 'duplicate_match' if a prior claim exists with the SAME fingerprint
 *     — caller returns the cached response
 *   - returns 'duplicate_mismatch' if a prior claim exists with a DIFFERENT fingerprint
 *     — caller returns 409 IDEMPOTENCY_CONFLICT
 *
 * Use `storeResponse(key, body)` after a successful first execution so subsequent
 * duplicate-match requests can serve the same body.
 */

export type IdempotencyClaim = 'fresh' | 'duplicate_match' | 'duplicate_mismatch';

export interface IdempotencyStore {
  claim(input: {
    key: string;
    fingerprint: string;
    ttlSeconds: number;
  }): Promise<IdempotencyClaim>;
  loadResponse(key: string): Promise<string | null>;
  storeResponse(key: string, body: string): Promise<void>;
}
