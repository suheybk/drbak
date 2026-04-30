/**
 * Argon2id password hasher backed by `argon2-browser` (WebAssembly).
 * Workers-compatible. Params per OWASP 2024 / KVKK guidance for non-RAM-constrained:
 *   - time = 3 (iterations)
 *   - mem  = 19 MiB
 *   - parallelism = 1
 *   - hashLen = 32 bytes
 *
 * Stored format: `$argon2id$v=19$m=19456,t=3,p=1$<saltB64>$<hashB64>` (PHC).
 */

import argon2 from 'argon2-browser';
import type { PasswordHasher } from '../../application/ports/index.js';

const PARAMS = {
  type: argon2.ArgonType.Argon2id,
  time: 3,
  mem: 19_456,
  parallelism: 1,
  hashLen: 32,
} as const;

export class Argon2idHasher implements PasswordHasher {
  async hash(plaintext: string): Promise<string> {
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    const result = await argon2.hash({
      pass: plaintext,
      salt,
      ...PARAMS,
    });
    return result.encoded;
  }

  async verify(plaintext: string, storedHash: string) {
    try {
      await argon2.verify({ pass: plaintext, encoded: storedHash });
      return { ok: true, needsRehash: this.shouldRehash(storedHash) };
    } catch {
      return { ok: false, needsRehash: false };
    }
  }

  private shouldRehash(encoded: string): boolean {
    // PHC: $argon2id$v=19$m=19456,t=3,p=1$...
    const m = /\$argon2id\$v=\d+\$m=(\d+),t=(\d+),p=(\d+)\$/.exec(encoded);
    if (!m) return true;
    const [_, mem, time, par] = m;
    return (
      Number(mem) < PARAMS.mem || Number(time) < PARAMS.time || Number(par) !== PARAMS.parallelism
    );
  }
}
