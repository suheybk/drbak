# Authentication & Authorization

> Companion to [architecture.md](./architecture.md) §6. This document is the spec the `application/use-cases/auth/*`, `interfaces/http/middleware/auth.ts` + `rbac.ts`, and `infrastructure/crypto/*` files implement.

## Threat model (what we're defending against)

| Threat | Mitigation |
|---|---|
| Credential stuffing | Per-IP+email sliding-window limit (5 attempts / 15 min); generic error message; no enumeration |
| Brute-force password | Argon2id (high cost params); account lockout after 10 failed attempts; exponential backoff |
| Session hijack | Short-lived JWT (15 min); HttpOnly + Secure + SameSite=Strict cookies for refresh; signed and rotated refresh tokens; family-revocation on reuse |
| CSRF | SameSite=Strict cookies; per-form CSRF token for cookie-auth flows; Authorization-header flow not vulnerable |
| Token forgery | ES256 with rotated kid; public key published in JWKS; signature verified server-side every request |
| OAuth replay / misuse | `state` CSRF param; `nonce` for ID-token; aud/iss/exp/iat all verified; PKCE for the public Astro client |
| Account takeover via OAuth-link | Linking new OAuth account requires existing-session re-auth; provider email must equal verified email or trigger an email-confirm step |
| Pediatric account misuse | Patients <18 require linked guardian Patient with verified email; guardian re-confirms KVKK consent on every booking |
| Admin compromise | WebAuthn second factor MANDATORY for `admin` and `staff` roles; no password-only admin login allowed |
| Privilege escalation | RBAC checked server-side at the use-case boundary; deny-by-default; no role data ever read from JWT claims (always re-loaded from DB) |
| Session fixation | New session id on every login; refresh-token rotation invalidates the old token immediately |
| Replay of API requests (booking conflict, double-charge analogue) | `Idempotency-Key` header (KV-deduped 24h) on all mutating endpoints |

## Identities and roles

```
patient   ← public sign-up, default role
staff     ← clinic reception, invite-only via admin
admin     ← clinic owner / Dr. Bak / lead office manager, bootstrap from env var
doctor    ← optional doctor login (read-only access to own appointments)
```

Deny-by-default: a route without an explicit `@allow(role)` (in Hono terms, without a route-mounted RBAC guard) returns 403.

## Tokens

### Access token

- Format: JWT, `alg = ES256`, `kid` rotated quarterly.
- TTL: **15 minutes** (`TOKEN_ACCESS_TTL_SECONDS=900`).
- Claims:
  ```
  iss   "https://api.uzmdroguzbak.com"
  aud   "drbak-app"
  sub   <userId>
  jti   <ULID>          ← used for revocation lookup if needed
  iat   <unix>
  exp   <unix>
  sid   <sessionId>     ← refresh-family identifier
  rol   <role>          ← convenience hint; ALWAYS re-checked server-side
  loc   <locale>
  ```
- Carried in `Authorization: Bearer <jwt>` for SPA / patient-portal calls.
- For Astro SSR shell pages it can also live in a HttpOnly `__Secure-drbak_at` cookie (Cookie auth flow) — set `SameSite=Strict; Secure; Path=/; HttpOnly`.
- Signature verification on every request via JWKS published at `/.well-known/jwks.json`.

### Refresh token

- Format: opaque random 32-byte string, base64url-encoded; never a JWT.
- Storage: KV `KV_SESSIONS` keyed by `refresh:<token>` → `{userId, sessionId, familyId, createdAt, expiresAt}`. TTL 14 days.
- Carried in HttpOnly `__Secure-drbak_rt` cookie. Path scoped to `/api/v1/auth/refresh`.
- **Rotated on every refresh.** New token issued, old token marked `usedAt` and kept for 5 minutes (rotation grace).
- **Family revocation:** if a refresh token is presented after its `usedAt + 5min`, every refresh token in the same `familyId` is invalidated. Mitigates token theft.
- Maximum sessions per user: 5 (oldest evicted on overflow).

### CSRF token

- Only required for cookie-auth flows (Astro SSR forms posting to API).
- Format: random 16-byte base64url, set in `__Host-drbak_csrf` cookie + injected as `<input name="_csrf">` by the SSR layer.
- Verified by `csrfMiddleware` on every state-changing route.

### One-time-use tokens (email verification, password reset, magic link)

- Random 32-byte, stored in KV with single-use semantics + TTL.
- Email verification: 24h TTL.
- Password reset: 1h TTL.
- Reschedule/cancel signed URLs (sent in confirmation emails): 30-day TTL, scope-bound to one appointment + one action.

## Password rules

- Minimum length 12, no maximum, all Unicode allowed (UTF-8 NFC normalised first).
- Banned: top-10k common passwords (zxcvbn check at registration; re-checked on password reset).
- Hashing: **Argon2id** via WebCrypto + WASM (`argon2-browser`). Params:
  - `time = 3`
  - `mem = 19456 KiB (~19 MB)` — within Workers 128 MB envelope; comfortable margin
  - `parallelism = 1` — single isolate thread
  - `hashLen = 32`
  - Salt: 16 random bytes, stored in the encoded hash string
- Re-hash on login if params have been raised since last hash.

## Lockout policy

- **Per-account lockout:** after 10 failed logins, lock for `2^(failures-10)` minutes (capped at 24h).
- **Per-IP+email rate limit:** 5 attempts / 15 minutes / `(ip, email)`. KV-counter with sliding window.
- Lockouts are cleared on a successful password reset (which proves email control).
- Auth response is generic: `INVALID_CREDENTIALS` for bad-password OR locked OR not-found OR not-verified — never reveals which.

## Email verification

- Required before any health data can be persisted (enforced at the `Patient` aggregate).
- A user can browse, register, and start a booking without verification — but **POST /api/v1/appointments returns 403 `EMAIL_NOT_VERIFIED`** if the user's email isn't verified.
- Verification email sent on registration; resendable with rate limit (3/day).
- Token: KV `verifyemail:<token>` → `userId`. TTL 24h. Single-use.

## OAuth (Google)

Flow: Authorization Code with PKCE.

1. Client requests `/api/v1/auth/oauth/google/begin`.
   - Server generates `state` (random 16B) + `codeVerifier` (random 32B), stores `{userId?, redirectAfter, codeVerifier}` in KV `oauth:state:<state>` (TTL 10 min).
   - Returns Google authorization URL with `state` + `code_challenge` (S256 of verifier).
2. User authorizes; Google redirects to `/api/v1/auth/oauth/google/callback?code=...&state=...`.
3. Server:
   - Loads KV by `state`. If missing → 400.
   - Exchanges `code` + `code_verifier` for tokens.
   - Verifies ID token: `iss=https://accounts.google.com`, `aud=GOOGLE_CLIENT_ID`, `exp > now`, `email_verified=true`.
   - **Account-linking guard:**
     - If `email` matches an existing user with no `oauth_accounts` row → require password re-auth before linking (sets a pending-link KV entry; user is redirected to `/giris/baglama` to confirm).
     - If `email` matches an existing user with an `oauth_accounts` row for a different `providerAccountId` → reject with `OAUTH_ACCOUNT_MISMATCH`.
     - If new user → create `users` + `oauth_accounts`, mark `emailVerifiedAt = now` (Google has already verified).
4. Issue access + refresh tokens, redirect to `redirectAfter` (validated against allowlist).

## RBAC matrix

Server-enforced at the use-case boundary. Every use-case takes an `actor: AuthContext` and validates.

| Action | patient | staff | admin | doctor | anon |
|---|---|---|---|---|---|
| `GET /public/services` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET /public/availability` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `POST /booking/holds` | ✓ | ✓ | ✓ | – | ✓ (anonymous holds OK; appointment requires auth) |
| `POST /appointments` | ✓ (self) | ✓ (any patient) | ✓ | – | – |
| `POST /appointments/:id/reschedule` | ✓ (self) | ✓ | ✓ | – | – |
| `POST /appointments/:id/cancel` | ✓ (self) | ✓ | ✓ | – | – |
| `GET /patient/me` | ✓ (self) | ✓ (any) | ✓ | – | – |
| `GET /patient/me/appointments` | ✓ (self) | ✓ (any) | ✓ | – | – |
| `POST /patient/me/documents` | ✓ (self) | ✓ (any) | ✓ | – | – |
| `GET /patient/me/documents/:id` | ✓ (self) | ✓ (any) | ✓ | ✓ (own appts only) | – |
| `GET /admin/appointments` | – | ✓ | ✓ | ✓ (own only) | – |
| `GET /admin/appointments.csv` | – | ✓ | ✓ | – | – |
| `POST /admin/content` | – | – | ✓ | – | – |
| `POST /admin/testimonials/:id/approve` | – | ✓ | ✓ | – | – |
| `POST /admin/services` | – | – | ✓ | – | – |
| `POST /admin/dsar/erase/:userId` | – | – | ✓ | – | – |

`✓ (self)` = allowed only when `actor.userId === resource.ownerUserId`.

## Audit trail

Every read or write of patient data writes one row to `audit_log`:

```ts
{
  actorUserId, actorRole, action, entityType, entityId,
  targetUserId,        // whose data was touched (may differ from actor)
  correlationId, ipAddress, userAgent,
  metadataJson,        // action-specific (e.g., {fields: ['address_line1']})
  at,
}
```

The repository layer enforces this — there is no escape hatch. Tests verify that every patient-data-touching use-case writes exactly the expected audit rows.

## Signed-URL design (R2 documents)

- Generated on demand at read time.
- TTL: 1 hour.
- HMAC-SHA256 over `(r2Key, exp, requestingUserId, action)` using `JWT_SIGNING_PRIVATE_KEY`.
- Verified by an R2-fronting Worker route — never serve R2 publicly.
- Audit-logged on issuance AND on download (the request hitting the R2 fronting Worker).

## Notable failure modes

| Failure | Surface | Behaviour |
|---|---|---|
| KV unavailable when checking refresh | `/auth/refresh` | Return 503 `Retry-After: 5`; access token still valid for up-to 15 min so most users don't see this |
| KV unavailable when checking lockout | `/auth/login` | Fail closed (deny login) — accepting logins blind violates the threat model |
| OAuth provider token endpoint slow | callback | 8s timeout; user redirected to `/giris?error=oauth_timeout` |
| WebAuthn lost (admin loses passkey) | n/a | Recovery is out-of-band: a second admin re-provisions; if no second admin exists, KV `admin:bootstrap` flag enables one-time recovery via the bootstrap email |

## Open items deferred

- WebAuthn implementation details (covered by `@simplewebauthn/server` port; Drop 3).
- e-prescription auth (Sağlık Bakanlığı integration; not in launch scope).
- mTLS for any outbound calls to medical systems (not in launch scope).
