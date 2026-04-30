/**
 * Jitsi-as-a-Service (JaaS) signed-room JWT factory.
 * Each appointment gets a unique room id; access requires a short-lived JWT
 * scoped to that room and email.
 */

import type {
  TelehealthRoom,
  TelehealthRoomFactory,
} from '../../application/ports/index.js';
import { type Instant, instantFromMillis } from '../../domain/shared/time.js';
import { encodeJWT } from '@oslojs/jwt';

const enc = new TextEncoder();

const b64url = (bytes: Uint8Array) => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export class JitsiTelehealthFactory implements TelehealthRoomFactory {
  constructor(
    private readonly appId: string,
    private readonly appSecret: string,
  ) {}

  async createRoom(input: {
    appointmentId: string;
    startsAt: Instant;
    endsAt: Instant;
    moderatorEmail: string;
    patientEmail: string;
  }): Promise<TelehealthRoom> {
    const roomId = `${this.appId}/${input.appointmentId}`;
    // JWT valid from 15min before to 30min after endsAt
    const nbf = Math.floor(((input.startsAt as number) - 15 * 60_000) / 1000);
    const exp = Math.floor(((input.endsAt as number) + 30 * 60_000) / 1000);

    // Build token for the patient (moderator gets a separate token via admin route)
    const header = { alg: 'HS256', typ: 'JWT', kid: `${this.appId}/default` };
    const payload = {
      iss: 'chat',
      aud: 'jitsi',
      sub: this.appId,
      room: input.appointmentId,
      exp,
      nbf,
      context: {
        user: { email: input.patientEmail, moderator: 'false' },
        features: { recording: 'false', livestreaming: 'false' },
      },
    };
    const headerJson = JSON.stringify(header);
    const payloadJson = JSON.stringify(payload);
    const signingInput = `${b64url(enc.encode(headerJson))}.${b64url(enc.encode(payloadJson))}`;
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(this.appSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(signingInput)));
    const token = `${signingInput}.${b64url(sig)}`;
    const joinUrl = `https://8x8.vc/${roomId}?jwt=${token}`;

    return {
      roomId,
      joinUrl,
      expiresAt: instantFromMillis(exp * 1000),
    };
  }
}
