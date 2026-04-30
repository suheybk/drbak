/**
 * HMAC-SHA256 signed-URL minter for emailed appointment cancel/reschedule links.
 * Server-side validation hits a route that decodes + verifies HMAC, then redirects
 * to the SPA action page.
 *
 * Token format: base64url( appointmentId + '|' + action + '|' + expIso ) + '.' + sigB64
 */

import type { SignedUrlMinter } from '../../application/ports/index.js';
import { type Instant, instantFromIso } from '../../domain/shared/time.js';

const enc = new TextEncoder();

const b64url = (bytes: Uint8Array): string => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromB64url = (s: string): Uint8Array => {
  const pad = s + '==='.slice((s.length + 3) % 4);
  const bin = atob(pad.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

export class HmacSignedUrlMinter implements SignedUrlMinter {
  private keyPromise: Promise<CryptoKey> | null = null;

  constructor(
    private readonly secret: string,
    private readonly publicBaseUrl: string,
  ) {}

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

  async mintAppointmentLink(input: {
    appointmentId: string;
    action: 'reschedule' | 'cancel';
    expiresAt: Instant;
  }): Promise<string> {
    const expIso = new Date(input.expiresAt as number).toISOString();
    const payload = `${input.appointmentId}|${input.action}|${expIso}`;
    const payloadB64 = b64url(enc.encode(payload));
    const sig = await crypto.subtle.sign('HMAC', await this.key(), enc.encode(payload));
    const sigB64 = b64url(new Uint8Array(sig));
    const path = input.action === 'cancel' ? 'iptal' : 'yeniden-planla';
    return `${this.publicBaseUrl}/r/${path}/${payloadB64}.${sigB64}`;
  }

  async verifyAppointmentLink(token: string) {
    const [payloadB64, sigB64] = token.split('.');
    if (!payloadB64 || !sigB64) return null;
    const payloadBytes = fromB64url(payloadB64);
    const sigBytes = fromB64url(sigB64);
    const valid = await crypto.subtle.verify('HMAC', await this.key(), sigBytes, payloadBytes);
    if (!valid) return null;
    const decoded = new TextDecoder().decode(payloadBytes);
    const [appointmentId, action, expIso] = decoded.split('|');
    if (!appointmentId || !action || !expIso) return null;
    if (action !== 'reschedule' && action !== 'cancel') return null;
    const expiresAt = instantFromIso(expIso);
    if ((expiresAt as number) < Date.now()) return null;
    return { appointmentId, action, expiresAt };
  }
}
