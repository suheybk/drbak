/**
 * Sliding-window rate limiter on KV.
 * Counter approach: store count + windowStart; reset window when expired.
 *
 * NOT exactly atomic across regions — KV is eventually consistent, so under
 * concurrent load you may slightly exceed the limit. For login throttling this
 * is acceptable. For booking conflict, use the Durable Object instead.
 */

import type { KVNamespace } from '@cloudflare/workers-types';
import type { RateLimitDecision, RateLimiter } from '../../application/ports/index.js';
import type { Instant } from '../../domain/shared/time.js';

interface Bucket {
  count: number;
  windowStartMs: number;
}

export class KVRateLimiter implements RateLimiter {
  constructor(private readonly kv: KVNamespace) {}

  async consume(input: {
    bucketKey: string;
    limit: number;
    windowSeconds: number;
    now: Instant;
  }): Promise<RateLimitDecision> {
    const k = `rl:${input.bucketKey}`;
    const existing = await this.kv.get<Bucket>(k, 'json');
    const windowMs = input.windowSeconds * 1000;
    const nowMs = input.now as number;

    const isOpen = existing && nowMs - existing.windowStartMs < windowMs;
    const next: Bucket = isOpen
      ? { count: existing.count + 1, windowStartMs: existing.windowStartMs }
      : { count: 1, windowStartMs: nowMs };

    if (next.count > input.limit) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((next.windowStartMs + windowMs - nowMs) / 1000),
      );
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    await this.kv.put(k, JSON.stringify(next), {
      expirationTtl: input.windowSeconds,
    });
    return {
      allowed: true,
      remaining: input.limit - next.count,
      retryAfterSeconds: 0,
    };
  }
}
