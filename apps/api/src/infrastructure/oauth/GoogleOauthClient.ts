/**
 * Google OAuth (Authorization Code + PKCE) adapter.
 *
 * - `buildAuthUrl(state, codeChallenge)` returns the Google authorization URL.
 * - `exchangeCode(code, codeVerifier, redirectUri)` exchanges for tokens + ID-token.
 * - `verifyIdToken(idToken)` verifies signature + standard claims via Google's JWKS.
 *
 * We only need email + email_verified + sub from the ID token. We do NOT request
 * profile/photo scopes.
 */

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

export interface GoogleIdTokenClaims {
  readonly sub: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly name?: string;
  readonly aud: string;
  readonly iss: string;
  readonly exp: number;
  readonly iat: number;
}

export class GoogleOauthClient {
  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  buildAuthUrl(input: { state: string; codeChallenge: string; redirectUri: string; locale?: string }): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: input.redirectUri,
      response_type: 'code',
      scope: 'openid email',
      state: input.state,
      code_challenge: input.codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'online',
      prompt: 'select_account',
      ...(input.locale ? { hl: input.locale } : {}),
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCode(input: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<{ idToken: string }> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code: input.code,
      code_verifier: input.codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: input.redirectUri,
    });
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!res.ok) throw new Error(`google token exchange failed: ${res.status}`);
    const json = (await res.json()) as { id_token: string };
    return { idToken: json.id_token };
  }

  /**
   * Verify the ID token. Loads Google's JWKS, picks the matching kid,
   * verifies RS256 signature + standard claims.
   */
  async verifyIdToken(idToken: string, now: number): Promise<GoogleIdTokenClaims> {
    const [headerB64, payloadB64, sigB64] = idToken.split('.');
    if (!headerB64 || !payloadB64 || !sigB64) throw new Error('bad id_token');
    const header = JSON.parse(new TextDecoder().decode(fromB64url(headerB64))) as { kid: string; alg: string };
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(payloadB64))) as Record<string, unknown>;
    if (header.alg !== 'RS256') throw new Error('unsupported alg');

    const jwksRes = await fetch('https://www.googleapis.com/oauth2/v3/certs');
    const jwks = (await jwksRes.json()) as { keys: Array<JsonWebKey & { kid: string }> };
    const jwk = jwks.keys.find((k) => k.kid === header.kid);
    if (!jwk) throw new Error('no matching key');

    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const data = enc.encode(`${headerB64}.${payloadB64}`);
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, fromB64url(sigB64), data);
    if (!valid) throw new Error('bad signature');

    if (payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com')
      throw new Error('bad iss');
    if (payload.aud !== this.clientId) throw new Error('bad aud');
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < now) throw new Error('expired');
    if (payload.email_verified !== true) throw new Error('email not verified');

    return {
      sub: String(payload.sub),
      email: String(payload.email),
      emailVerified: true,
      name: typeof payload.name === 'string' ? payload.name : undefined,
      aud: String(payload.aud),
      iss: String(payload.iss),
      exp: payload.exp,
      iat: typeof payload.iat === 'number' ? payload.iat : 0,
    };
  }

  async generatePkce(): Promise<{ codeVerifier: string; codeChallenge: string }> {
    const verifierBytes = new Uint8Array(32);
    crypto.getRandomValues(verifierBytes);
    const codeVerifier = b64url(verifierBytes);
    const challengeBytes = new Uint8Array(
      await crypto.subtle.digest('SHA-256', enc.encode(codeVerifier)),
    );
    const codeChallenge = b64url(challengeBytes);
    return { codeVerifier, codeChallenge };
  }
}
