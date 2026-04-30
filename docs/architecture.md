# Architecture

> Companion to [discovery.md](./discovery.md). Read that first if you need clinical context.
> Decisions live in [adr/](./adr/). This document describes the system as it stands.

## 1. Assumptions (explicit)

These are bets we're making. If any are wrong, escalate before building deeper.

1. **Single-doctor practice today, multi-practitioner-ready tomorrow.** Aggregates and roles are designed for *N* practitioners; UI only exposes one until that changes. No retrofit later.
2. **The booking app is the front door.** First-party booking is the killer feature; DoktorTakvimi/DoktorSitesi become deprecated traffic destinations after migration.
3. **Patients book in their language; the doctor sees one consolidated language (TR) in the admin.** AR/EN/FR/ES patient-facing data is captured in the patient's locale and presented to clinic staff in TR with the original alongside.
4. **No live medical advice in the app.** Booking is an *appointment request*. All clinical interaction happens in person, via secure telehealth, or via signed home visit.
5. **All patient data lives in EU jurisdiction.** Neon Postgres EU (Frankfurt), R2 EU bucket, KV global with no PII. Any future analytics is server-side first, client-side only with consent.
6. **No long-lived connections, no stateful workers.** Everything is request-scoped or Durable-Object-mediated. Workers handlers are pure with side-effects via injected adapters.
7. **Idempotency is mandatory on writes.** Every mutating endpoint accepts an `Idempotency-Key` header (KV-backed dedupe within 24h). Required for payment-adjacent and booking-conflict-sensitive flows.
8. **Compliance is a deliverable, not a checkbox.** KVKK + GDPR + Sağlık Bakanlığı tanıtım rules are embedded in the model (consent records, audit log, never-fee-on-public-pages, gated before/after content).

## 2. System topology

```
                      ┌────────────────────────────────────────┐
                      │          Cloudflare Edge (global)      │
                      │                                        │
   Public web ───────▶│  Astro SSR + React islands             │
   (5 locales)        │  (apps/web on Workers)                 │
                      │                                        │
   Patient portal ───▶│  Hono API (apps/api on Workers)        │
   Admin panel        │   ├─ HTTP routes (interfaces/)         │
                      │   ├─ Use-cases (application/)          │
                      │   ├─ Domain (domain/) — pure           │
                      │   └─ Adapters (infrastructure/)        │
                      │           │           │           │     │
                      └───────────┼───────────┼───────────┼─────┘
                                  │           │           │
                ┌─────────────────┘           │           └────────────────┐
                ▼                             ▼                            ▼
        ┌──────────────┐               ┌──────────────┐            ┌──────────────┐
        │  Neon EU     │               │  Cloudflare  │            │  Cloudflare  │
        │  Postgres    │               │  KV          │            │  R2 (EU)     │
        │  (origin)    │               │  - sessions  │            │  - patient   │
        │  via         │               │  - rate-     │            │    documents │
        │  Hyperdrive  │               │    limits    │            │  - testimonials
        │              │               │  - idempot.  │            │  - Q&A media │
        │              │               │  - tokens    │            │              │
        └──────────────┘               └──────────────┘            └──────────────┘
                                                                          │
                ┌─────────────────────────────────────────────────────────┘
                │
                ▼
        ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
        │  Durable     │    │  Queues      │    │  Cron        │    │  External    │
        │  Objects     │    │  - email     │    │  Triggers    │    │  - Resend    │
        │  - Slot      │    │  - sms       │    │  - reminders │    │  - NetGSM    │
        │    locking   │    │  - webhooks  │    │  - cleanup   │    │  - Twilio    │
        │  - 1 per     │    │              │    │              │    │  - Meta WA   │
        │    doctor-   │    │              │    │              │    │  - Jitsi EU  │
        │    day       │    │              │    │              │    │  - Google    │
        │              │    │              │    │              │    │    OAuth     │
        └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

## 3. Data flow — booking happy path

```
1. Patient picks Service → /api/v1/services?locale=tr returns catalogue (KV-cached 5m)
2. Picks Date           → /api/v1/availability?serviceId=...&date=YYYY-MM-DD
                          (DO read; KV-cached 30s for popular dates)
3. Picks Slot           → /api/v1/slots/{slotId}/hold (DO write; 5-min hold token)
4. Fills patient form   → Zod-validated; consent checkbox required (special-cat data)
5. POST /api/v1/appointments
                          ├─ DO confirms slot (atomic; idempotency key)
                          ├─ Drizzle insert (transaction across appt + consent + audit)
                          ├─ Queue: email confirm + ICS attachment
                          ├─ Queue: SMS confirm via NetGSM (TR) / Twilio (intl)
                          ├─ Queue: WhatsApp confirm via Meta Cloud API
                          └─ Returns 201 + signed reschedule/cancel URLs
6. Cron T-24h           → reminders.run() → enqueues notifications for tomorrow
7. Cron T-1h            → final reminder (configurable per service)
8. Patient cancels      → signed-token URL → DO releases slot → queue cancellation notice
```

## 4. Hexagonal layers — what goes where

```
domain/            ← pure TypeScript. Zero dependencies on framework, DB, or HTTP.
                     Entities, value objects, domain services, errors, invariants.
                     Tested with Jest, no mocks needed.

application/       ← use-cases. One file per use case. Orchestrates domain
                     and ports. Depends on `domain/` and `application/ports/`.
                     Tested with in-memory adapters.

infrastructure/    ← adapters that implement the ports. Drizzle, Resend, R2,
                     Jitsi, Google OAuth, KV, DO clients. Side-effectful.
                     Tested with Miniflare integration tests.

interfaces/        ← Hono routes, middleware, OpenAPI handlers. Translates
                     HTTP → use-case input, use-case output → HTTP. Thin.
                     Tested with Miniflare + Playwright.
```

Dependency rule: arrows point inwards. `interfaces/` → `application/` → `domain/`. `infrastructure/` implements interfaces from `application/ports/`. **Domain never imports anything from outer layers.**

## 5. Multi-locale strategy

- Routing: `/{locale}/...` with locale in `[tr, ar, en, fr, es]`. `tr` is default; root `/` 302s to `/tr`.
- Astro SSR pre-renders the static shell per locale; React islands hydrate.
- API: every endpoint accepts `Accept-Language` and a `?locale=` query (query wins).
- DB: strings live in `*_translations` tables keyed by `(entity_id, locale)`. Fallback chain: requested → tr → first-available.
- AR: `dir="rtl"` on `<html>`, mirrored layout via `[dir="rtl"]` Tailwind variants. Numbers in dosing/dates stay Western per medical-safety convention.
- hreflang: every page emits the full reciprocal `<link rel="alternate" hreflang="...">` set + `x-default` → `tr`.

## 6. Identity & access

- **Patient auth:** email + password (Argon2id, OWASP params). Optional Google OAuth (state CSRF, account-linking guard). Email verification required before storing health data.
- **Staff/admin auth:** email + password + WebAuthn second factor (mandatory for admin role). No OAuth for staff.
- **Tokens:** short-lived JWT access (15 min, ES256, kid rotation), refresh token in KV (rotated on each refresh, family-revocation on reuse).
- **Authorization:** RBAC with `patient | staff | admin | doctor` roles, deny-by-default. Centralised guard middleware. No client-side enforcement.
- **Rate limits:** Cloudflare Rate Limiting Rules + per-route KV sliding window (anonymous: 60 rpm; authed: 600 rpm; auth endpoints: 5 attempts / 15 min / IP+email).

Full detail in Drop 2 (`docs/auth.md`).

## 7. Observability

- Structured JSON logs (one event per request). Fields: `traceId`, `spanId`, `route`, `userId?`, `tenantId?`, `latencyMs`, `status`, `errorCode?`. Sent to Cloudflare Logpush → R2 (and optionally Better Stack / Datadog).
- Correlation ID: `X-Correlation-ID` header — generated if absent, propagated to outbound calls.
- Metrics via Workers Analytics Engine: `auth.login`, `booking.created`, `booking.conflict`, `notification.sent`, `notification.failed`, `dlq.size`.
- No PII in logs ever. Patient identifiers logged as `sha256(userId + salt)[:16]`.

## 8. Anti-corruption boundaries

External systems we depend on (Resend, NetGSM, Twilio, Meta WA, Jitsi, Google OAuth, future Sağlık Bakanlığı integrations) sit behind ports + adapters. The domain knows about `EmailNotifier`, never about `Resend`. Swapping `Resend → SendGrid` is a one-file change in `infrastructure/`.

## 9. Failure modes — what fails how

| Component | Failure | Behaviour |
|---|---|---|
| Neon | unreachable | API serves cached read paths from KV; writes return 503 with `Retry-After` |
| Durable Object | overloaded | Booking creation 429s with backoff; reads degrade to KV cache |
| Resend | down | Email goes to outbox; queue retries 5×; DLQ at 6h |
| NetGSM | down | SMS goes to outbox; secondary Twilio fallback after 2 fails |
| Meta WA | down | WA confirmation skipped; logged; patient still receives email + SMS |
| KV | latency spike | request continues; cache miss = origin call |
| OAuth provider | down | Google login button disabled via feature flag; password login still works |

## 10. Capacity envelope (back-of-envelope)

- ~50 bookings/day at launch growing to ~200/day in 6 months.
- Reads dominated by SEO crawlers + IG-driven traffic. Estimate: ~50–200 RPS sustained, 1k RPS peak during reel virality.
- Cloudflare Workers comfortably absorbs this; Neon Hyperdrive caches read pool.
- Storage: R2 — testimonial videos ~50MB each × 50 videos = 2.5GB; patient documents ~5MB avg × 200 patients × 5 docs = 5GB; well within R2 free tier for year 1.
