import type { KVNamespace } from '@cloudflare/workers-types';
import type { IdempotencyClaim, IdempotencyStore } from '../../application/ports/index.js';

interface Entry {
  fingerprint: string;
  response?: string;
}

export class KVIdempotencyStore implements IdempotencyStore {
  constructor(private readonly kv: KVNamespace) {}

  async claim(input: {
    key: string;
    fingerprint: string;
    ttlSeconds: number;
  }): Promise<IdempotencyClaim> {
    const k = `idem:${input.key}`;
    const existing = await this.kv.get<Entry>(k, 'json');
    if (existing) {
      return existing.fingerprint === input.fingerprint
        ? 'duplicate_match'
        : 'duplicate_mismatch';
    }
    const newEntry: Entry = { fingerprint: input.fingerprint };
    await this.kv.put(k, JSON.stringify(newEntry), {
      expirationTtl: input.ttlSeconds,
    });
    return 'fresh';
  }

  async loadResponse(key: string): Promise<string | null> {
    const e = await this.kv.get<Entry>(`idem:${key}`, 'json');
    return e?.response ?? null;
  }

  async storeResponse(key: string, body: string): Promise<void> {
    const k = `idem:${key}`;
    const existing = await this.kv.get<Entry>(k, 'json');
    if (!existing) return; // claim was reaped — caller already returned
    await this.kv.put(k, JSON.stringify({ ...existing, response: body }), {
      expirationTtl: 24 * 3600,
    });
  }
}
