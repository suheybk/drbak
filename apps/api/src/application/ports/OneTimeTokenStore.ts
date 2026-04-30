import type { Instant } from '../../domain/shared/time.js';

export type OneTimeTokenPurpose = 'email_verify' | 'password_reset' | 'oauth_state';

export interface OneTimeTokenStore {
  put(input: {
    purpose: OneTimeTokenPurpose;
    token: string;
    payload: string;
    ttlSeconds: number;
    now: Instant;
  }): Promise<void>;
  /** Look up + atomically delete (single-use). Returns null if missing/expired. */
  consume(input: { purpose: OneTimeTokenPurpose; token: string }): Promise<string | null>;
}
