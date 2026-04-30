import type { KVNamespace } from '@cloudflare/workers-types';
import type { OneTimeTokenPurpose, OneTimeTokenStore } from '../../application/ports/index.js';
import type { Instant } from '../../domain/shared/time.js';

const keyOf = (purpose: OneTimeTokenPurpose, token: string) => `ott:${purpose}:${token}`;

export class KVOneTimeTokenStore implements OneTimeTokenStore {
  constructor(private readonly kv: KVNamespace) {}

  async put(input: {
    purpose: OneTimeTokenPurpose;
    token: string;
    payload: string;
    ttlSeconds: number;
    now: Instant;
  }): Promise<void> {
    await this.kv.put(keyOf(input.purpose, input.token), input.payload, {
      expirationTtl: input.ttlSeconds,
    });
  }

  async consume(input: {
    purpose: OneTimeTokenPurpose;
    token: string;
  }): Promise<string | null> {
    const k = keyOf(input.purpose, input.token);
    const value = await this.kv.get(k);
    if (!value) return null;
    await this.kv.delete(k);
    return value;
  }
}
