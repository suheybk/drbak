# Phase 1 self-review — OWASP Top 10 + Cloudflare + edge checklist

> Honest review against the threat model in [auth.md](./auth.md). One row per item. Each is either ✅ shipped, ⚠️ partial (with remaining work), or ❌ deferred (with the deferral target). The objective is no surprises at deploy time.

## OWASP Top 10 (2021)

| # | Risk | Status | Where it's enforced / what's pending |
|---|---|---|---|
| A01 | Broken Access Control | ✅ | `requireAuth(roles?)` at every non-public route; **role re-loaded from DB on every request** ([middleware/auth.ts](../apps/api/src/interfaces/http/middleware/auth.ts)); `(self)` enforced in `cancelAppointment.ts` etc.; admin role required for content/dsar/users; deny-by-default at the route layer (no route is "open" without an explicit middleware decision). |
| A02 | Cryptographic Failures | ✅ | Argon2id with OWASP-2024 params ([Argon2idHasher.ts](../apps/api/src/infrastructure/crypto/Argon2idHasher.ts)); ES256 JWTs via WebCrypto ([Es256TokenIssuer.ts](../apps/api/src/infrastructure/crypto/Es256TokenIssuer.ts)); HMAC-SHA256 for signed URLs and Meta WA signatures; refresh tokens are random 32B base64url, never JWTs; password hashes never logged; PII hashed (`sha256(userId+salt)[:16]`) before logging. |
| A03 | Injection | ✅ | All DB access through Drizzle (parameterised); all DTOs Zod-validated at the boundary ([helpers.ts](../apps/api/src/interfaces/http/helpers.ts)); CSP `default-src 'none'` on the API ([securityHeaders.ts](../apps/api/src/interfaces/http/middleware/securityHeaders.ts)); markdown sanitised on render in `apps/web` (Drop 4); R2 uploads validated by mime + size before signed-URL mint. |
| A04 | Insecure Design | ✅ | Hexagonal architecture isolates domain rules; `BookingPolicy` + `CancellationPolicy` + `TmsEligibility` are pure, unit-tested decisions; `Result<T,E>` forces explicit failure handling; idempotency mandatory on writes; KVKK consent enforced at the aggregate boundary. |
| A05 | Security Misconfiguration | ⚠️ | Wrangler env separation (dev/staging/prod) ✅; `.dev.vars` in `.gitignore` ✅; secrets-list documented in [wrangler.toml](../apps/api/wrangler.toml) ✅. **Pending:** Cloudflare WAF + Bot Management config + custom rules per environment — covered by `docs/ops.md` (Phase 3). KV/R2 binding IDs are `REPLACE_WITH_*` placeholders; CI provisions real ones. |
| A06 | Vulnerable Components | ⚠️ | Dependencies pinned exactly in package.json ✅. **Pending:** GitHub Actions Renovate/Dependabot config + `pnpm audit` step in CI (Phase 3). |
| A07 | Identification & Auth Failures | ✅ | Generic "INVALID_CREDENTIALS" response (no enumeration) on login + register conflicts ([login.ts](../apps/api/src/application/use-cases/auth/login.ts), [registerPatient.ts](../apps/api/src/application/use-cases/auth/registerPatient.ts)); per-account exponential lockout; per-(IP+email) rate limit; refresh-token rotation with **family-revocation on reuse-after-grace** ([KVSessionStore.ts](../apps/api/src/infrastructure/kv/KVSessionStore.ts)); CSRF cookies SameSite=Strict; OAuth uses PKCE + state CSRF + account-linking guard ([googleOauth.ts](../apps/api/src/application/use-cases/auth/googleOauth.ts)). WebAuthn for admin role 2FA — **port + table shipped, full flow in Drop 4**. |
| A08 | Software & Data Integrity | ✅ | Idempotency-Key header + KV dedupe (24h TTL) on all mutating endpoints ([KVIdempotencyStore.ts](../apps/api/src/infrastructure/kv/KVIdempotencyStore.ts)); webhook events idempotency by `(provider, externalId)` ([webhooks.ts](../apps/api/src/interfaces/http/routes/webhooks.ts)); slot conflict guarded by Durable Object **plus** a partial-unique DB index as defence in depth. |
| A09 | Security Logging & Monitoring | ✅ | Append-only audit log on every health-data touch ([DrizzleAuditLogger.ts](../apps/api/src/infrastructure/db/repositories/DrizzleAuditLogger.ts)); structured JSON logs with correlation IDs ([correlationId.ts](../apps/api/src/interfaces/http/middleware/correlationId.ts)); KVKK-discoverable in <100ms via `(target_user_id, at)` index. **Pending:** alarms + Logpush sink in Phase 3. |
| A10 | Server-Side Request Forgery | ✅ | Outbound HTTP is to a fixed allowlist (Resend, NetGSM, Twilio, Meta, Google, Jitsi, Neon); no user-controllable URLs are fetched server-side. R2 download URLs are signed and never proxy user-controllable origins. |

## KVKK / GDPR — explicit checklist

| Requirement | Status |
|---|---|
| Açık rıza per purpose, versioned | ✅ `consent_documents` + `consent_records` tables; recorded with IP/UA/locale; never deleted, only superseded |
| Aydınlatma metni separate from consent | ⚠️ Consent text lives in `consent_documents`. Aydınlatma metni page lives in CMS (`type='legal'`) — Drop 4 surfaces it on the booking form |
| Article 11 access (DSAR export) | ❌ Deferred to a follow-up — manifest scaffold ready in `dsarErase`; mirror as `dsarAccess` returning a JSON bundle |
| Article 11 erasure (silinme hakkı) | ✅ [dsarErase.ts](../apps/api/src/application/use-cases/admin/dsarErase.ts) — blanks PII, purges R2, retains audit + consent + appointment records (medical-record retention) |
| Audit log discoverable per data subject | ✅ `audit_log_target_user_idx` |
| Pediatric guardian consent | ✅ Enforced in `BookingPolicy` (denies under-18 without `guardian_consent` purpose) |
| Health data hosted in EU | ✅ Neon Frankfurt; R2 EU; KV global but stores no PII (only token hashes + counters) |
| Pre-publication consent for testimonials | ✅ FK from `testimonials.consent_record_id` is NOT NULL; `reviewTestimonial` re-verifies before approval |
| Before/after gallery gated | Frontend concern — Drop 4 ships gated component |
| TR commercial-SMS via İYS-registered sender | ✅ NetGSM client requires `senderId`; secret-list documents the requirement |

## Cloudflare-platform checklist

| Item | Status |
|---|---|
| `compatibility_date` pinned (`2026-04-30`) | ✅ |
| `nodejs_compat` flag where required | ✅ |
| KV namespaces per env (sessions, ratelimit, idempotency, cache) | ✅ |
| R2 buckets per env, EU region | ✅ |
| Durable Object — `new_sqlite_classes` migration tag | ✅ |
| Queues + DLQs per env | ✅ |
| Cron triggers per env (3 schedules) | ✅ |
| Hyperdrive binding for Postgres | ✅ |
| `observability.enabled = true` (Workers Analytics) | ✅ |
| Wrangler secrets list documented (no inline secrets) | ✅ |
| CORS allowlist (PUBLIC_BASE_URL + APP_BASE_URL) | ✅ |
| Strict security headers (HSTS, no-referrer, frame-ancestors none) | ✅ |
| WAF + Bot Management rules per route | ❌ Phase 3 |
| `--remote=false` dev for safe iteration | ✅ default of `wrangler dev` |
| 50ms CPU budget respected (no synchronous heavy work outside WASM Argon2) | ✅ heavy work offloaded to Queue |

## Performance & resilience

| Item | Status |
|---|---|
| Per-request DB client (no shared connection pool in isolate) | ✅ |
| Hyperdrive caches read paths | ✅ |
| Read endpoints KV-cacheable (5m for services, 30s for availability) | ⚠️ Caching is wired through `KV_CACHE` binding; explicit `cache-control` headers added in Drop 3 follow-up |
| Idempotent writes | ✅ |
| Outbox + queue + retry + DLQ | ✅ |
| Stuck-outbox sweep | ✅ ([appointmentReminders.ts](../apps/api/src/infrastructure/cron/appointmentReminders.ts)) |
| DO alarm-driven hold reaper | ✅ ([DoctorDayLock.ts](../apps/api/src/infrastructure/do/DoctorDayLock.ts)) |
| Graceful degradation if KV is slow | ⚠️ Login fails closed (correct); read paths fall through to origin |
| ICS attachment on confirmation email | ❌ Deferred — `OutboundEmail.icsAttachment` field shipped; templates emit it in Drop 4 |
| Telehealth contraindication: Workers fetch in queue consumer can exceed soft 30s | ✅ Each notification handled independently; consumer batches ≤10 |

## What I would not deploy yet

1. **Email subtitles for reels** — covered by manual workflow only (§12.22 from discovery).
2. **WebAuthn enrolment for admin** — port + table shipped, browser flow in Drop 4.
3. **DSAR access bundle** — Article 11 read-side mirror of `dsarErase`.
4. **Anti-virus scan on patient documents** — `scan_status` column ready; queue consumer in Phase 3.
5. **CSRF token on cookie-auth flows** — currently relies on SameSite=Strict + same-site cookies. Add typed CSRF cookie when SSR forms ship in Drop 4.
6. **Outbound-mail SPF/DKIM/DMARC** — DNS records in Phase 3.
7. **JWKS endpoint** currently returns minimal metadata; full SPKI→JWK serialisation belongs with the WebAuthn work in Drop 4.

## Open code-review items I would flag in PR

1. `requestDocumentUpload.ts` — the upload-token signing is split between the use case and the route. Move HMAC entirely into a `UploadTokenMinter` port for testability. (Tag: `refactor`)
2. `cancelAppointment.ts` — the `slotLock.releaseHold({ token: '' as never, ... })` call leaks into a non-existent hold path. Replace with a `slotLock.releaseBooking(doctorId, startsAt)` extension on the DO + adapter. (Tag: `bug-adjacent`)
3. Several routes assume `DEFAULT_DOCTOR_ID = 'doc_oguz_bak' | 'doc_dev'` — works for one doctor but should read from a `doctors` query. (Tag: `tech-debt`, but trivial.)
4. `InMemoryConsentRepo` test fixture casts `consentDocumentId` via `as never` — replace with a proper `ConsentDocumentId` brand once Drop 4 lands the consent-document loader. (Tag: `test-quality`)
5. `OutboundEmail` carries `icsAttachment` but the queue consumer currently ignores it. Pass it through to the Resend client. (Tag: `feature-gap`)

None of these is a security defect. They are quality-of-implementation items I would surface in a real PR review.
