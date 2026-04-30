/**
 * ES256 JWT issuer/verifier using @oslojs/jwt.
 * Private key is stored as PKCS8 PEM in `JWT_SIGNING_PRIVATE_KEY` secret.
 * Public key as SPKI PEM in `JWT_SIGNING_PUBLIC_KEY` (also published at /.well-known/jwks.json).
 */

import { decodeBase64 } from '@oslojs/encoding';
import {
  JWTClaims,
  createJWTSignatureMessage,
  encodeJWT,
  joseAlgorithmES256,
  parseJWT,
} from '@oslojs/jwt';
import type { IssuedToken, JwtClaims, TokenIssuer } from '../../application/ports/index.js';
import { type Instant, instantFromMillis } from '../../domain/shared/time.js';

interface KeyMaterial {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  kid: string;
}

const pemToDer = (pem: string): ArrayBuffer => {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  return decodeBase64(body).buffer;
};

const importP256Private = async (pem: string): Promise<CryptoKey> =>
  crypto.subtle.importKey('pkcs8', pemToDer(pem), { name: 'ECDSA', namedCurve: 'P-256' }, false, [
    'sign',
  ]);

const importP256Public = async (pem: string): Promise<CryptoKey> =>
  crypto.subtle.importKey('spki', pemToDer(pem), { name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'verify',
  ]);

export class Es256TokenIssuer implements TokenIssuer {
  private keys: Promise<KeyMaterial> | null = null;

  constructor(
    private readonly env: {
      JWT_SIGNING_PRIVATE_KEY: string;
      JWT_SIGNING_PUBLIC_KEY: string;
      JWT_SIGNING_KID: string;
    },
    private readonly issuer: string,
    private readonly audience: string,
  ) {}

  private async loadKeys(): Promise<KeyMaterial> {
    if (!this.keys) {
      this.keys = (async () => ({
        privateKey: await importP256Private(this.env.JWT_SIGNING_PRIVATE_KEY),
        publicKey: await importP256Public(this.env.JWT_SIGNING_PUBLIC_KEY),
        kid: this.env.JWT_SIGNING_KID,
      }))();
    }
    return this.keys;
  }

  async issueAccess(claims: JwtClaims, ttlSeconds: number, now: Instant): Promise<IssuedToken> {
    const { privateKey, kid } = await this.loadKeys();
    const nowSec = Math.floor((now as number) / 1000);
    const expSec = nowSec + ttlSeconds;
    const jti = crypto.randomUUID();
    const headerJson = JSON.stringify({ alg: joseAlgorithmES256, typ: 'JWT', kid });
    const payloadJson = JSON.stringify({
      iss: this.issuer,
      aud: this.audience,
      sub: claims.sub,
      sid: claims.sid,
      rol: claims.rol,
      loc: claims.loc,
      jti,
      iat: nowSec,
      exp: expSec,
    });
    const message = createJWTSignatureMessage(headerJson, payloadJson);
    const sig = new Uint8Array(
      await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, message),
    );
    const token = encodeJWT(headerJson, payloadJson, sig);
    return { token, expiresAt: instantFromMillis(expSec * 1000), jti };
  }

  async verifyAccess(token: string, now: Instant): Promise<JwtClaims | null> {
    try {
      const [headerObj, payloadObj, signature, signatureMessage] = parseJWT(token);
      const header = headerObj as { alg?: string; kid?: string };
      if (header.alg !== joseAlgorithmES256) return null;
      const { publicKey } = await this.loadKeys();
      const valid = await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        publicKey,
        signature,
        signatureMessage,
      );
      if (!valid) return null;
      const claimsView = new JWTClaims(payloadObj);
      if (!claimsView.hasIssuer() || claimsView.issuer() !== this.issuer) return null;
      if (!claimsView.hasAudiences() || !claimsView.audiences().includes(this.audience)) {
        return null;
      }
      if (!claimsView.hasExpiration() || claimsView.expiration().getTime() <= (now as number)) {
        return null;
      }
      if (claimsView.hasNotBefore() && claimsView.notBefore().getTime() > (now as number)) {
        return null;
      }
      const payload = payloadObj as Record<string, unknown>;
      return {
        sub: String(payload.sub),
        sid: String(payload.sid),
        rol: String(payload.rol),
        loc: String(payload.loc),
      };
    } catch {
      return null;
    }
  }
}
