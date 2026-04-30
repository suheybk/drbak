/**
 * UploadTokenMinter — HMAC-signed token bound to a specific patient document.
 *
 * Why a port: the upload route needs to verify the same token the use case
 * minted. Putting signing in one half of the codebase (the use case) and
 * verification in the other (the route) without a port leaves both halves
 * importing the same crypto helper and silently drifting. With a port, both
 * halves resolve the same adapter from the DI container.
 *
 * Token shape (production adapter): base64url(payload) + '.' + base64url(hmac)
 * where payload is `<docId>|<patientId>|<r2Key>|<expiresAtMs>` and the HMAC
 * key derives from a Worker secret rotated on the standard schedule.
 *
 * Tokens are short-lived (5 min). They authenticate the *upload destination*
 * — the route still cross-checks that the authenticated user owns the
 * document row before honouring the PUT.
 */

export interface UploadTokenInput {
  readonly docId: string;
  readonly patientId: string;
  readonly r2Key: string;
}

export interface MintedUploadToken {
  readonly token: string;
  readonly expiresAtMs: number;
}

export interface UploadTokenMinter {
  mint(input: UploadTokenInput & { ttlSeconds: number; nowMs: number }): Promise<MintedUploadToken>;
  verify(input: UploadTokenInput & { token: string; nowMs: number }): Promise<boolean>;
}
