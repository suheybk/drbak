/**
 * Production adapter for UploadTokenMinter.
 *
 * Uses HMAC-SHA256 over the canonical payload string. Key is the JWT signing
 * key (already in env, already on the rotation schedule documented in the
 * runbook). Constant-time comparison comes free from `crypto.subtle.verify`.
 */

import type {
  MintedUploadToken,
  UploadTokenInput,
  UploadTokenMinter,
} from '../../application/ports/UploadTokenMinter.js';

const enc = new TextEncoder();
const dec = new TextDecoder();

const b64url = (bytes: Uint8Array): string => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromB64url = (s: string): Uint8Array | null => {
  try {
    const pad = s + '==='.slice((s.length + 3) % 4);
    const bin = atob(pad.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
};

const canonical = (input: UploadTokenInput, expiresAtMs: number): string =>
  `${input.docId}|${input.patientId}|${input.r2Key}|${expiresAtMs}`;

export class HmacUploadTokenMinter implements UploadTokenMinter {
  private keyPromise: Promise<CryptoKey> | null = null;

  constructor(private readonly secret: string) {}

  private async key(): Promise<CryptoKey> {
    if (!this.keyPromise) {
      this.keyPromise = crypto.subtle.importKey(
        'raw',
        enc.encode(this.secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify'],
      );
    }
    return this.keyPromise;
  }

  async mint(
    input: UploadTokenInput & { ttlSeconds: number; nowMs: number },
  ): Promise<MintedUploadToken> {
    const expiresAtMs = input.nowMs + input.ttlSeconds * 1000;
    const payload = canonical(input, expiresAtMs);
    const sig = await crypto.subtle.sign('HMAC', await this.key(), enc.encode(payload));
    const token = `${b64url(enc.encode(payload))}.${b64url(new Uint8Array(sig))}`;
    return { token, expiresAtMs };
  }

  async verify(
    input: UploadTokenInput & { token: string; nowMs: number },
  ): Promise<boolean> {
    const [payloadB64, sigB64] = input.token.split('.');
    if (!payloadB64 || !sigB64) return false;
    const payloadBytes = fromB64url(payloadB64);
    const sigBytes = fromB64url(sigB64);
    if (!payloadBytes || !sigBytes) return false;
    const decoded = dec.decode(payloadBytes);
    const parts = decoded.split('|');
    if (parts.length !== 4) return false;
    const [docId, patientId, r2Key, expiresAtMsStr] = parts as [string, string, string, string];
    if (docId !== input.docId || patientId !== input.patientId || r2Key !== input.r2Key) {
      return false;
    }
    const expiresAtMs = Number(expiresAtMsStr);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= input.nowMs) return false;
    return crypto.subtle.verify('HMAC', await this.key(), sigBytes, payloadBytes);
  }
}
