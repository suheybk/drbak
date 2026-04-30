import type { Instant } from '../../domain/shared/time.js';

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterSeconds: number;
}

export interface RateLimiter {
  /** Sliding-window counter. Returns whether the call may proceed. */
  consume(input: {
    bucketKey: string; // e.g., 'login:ip+email:1.2.3.4|user@x'
    limit: number;
    windowSeconds: number;
    now: Instant;
  }): Promise<RateLimitDecision>;
}
