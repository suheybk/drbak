# ADR-0001 — Edge-native TypeScript stack on Cloudflare

**Date:** 2026-04-30
**Status:** Accepted
**Deciders:** Phase 0 sign-off (user), authored by build team

## Context

We need a doctor's website + appointment-booking platform serving 5 locales (TR, AR, EN, FR, ES), handling slot-locking under concurrency, storing health-special-category data under KVKK + GDPR, and sustaining ~50–200 RPS with 1k RPS peaks. Lighthouse ≥95 on every locale, p50 edge response <100ms.

## Decision

### Runtime: Cloudflare Workers
- Sub-50ms TTFB globally. Patients in Maghreb/Gulf get the same experience as patients in Istanbul.
- No Node.js runtime — forces stateless design, which we want anyway.
- Native binding ecosystem: KV, R2, Durable Objects, Queues, Cron, AI, Hyperdrive — every platform primitive we need lives in one config (`wrangler.toml`).
- Pay-per-request — economics work at low launch volume *and* at scale.

### HTTP framework: Hono
- Smallest API surface among Workers-native frameworks. ~20kb gzipped.
- First-class Workers support, including type-safe bindings via `Env` generic.
- Middleware composition matches NestJS `Guards` / `Interceptors` mental model.
- Zod-validator middleware out of the box.

### NestJS-style DI without `reflect-metadata`
- `reflect-metadata` is unreliable on Workers. We emulate Nest's modules/providers/controllers/guards/pipes pattern via a tiny functional DI container — see [ADR-0003](./0003-di-on-workers.md).
- Net effect: developers familiar with Nest get the same separation of concerns; nobody ships a Node-only dependency.

### Database: Drizzle + Neon Postgres EU
- **Drizzle** — TypeScript-first, no codegen step, generates SQL we can read in PR review. Migrations are plain SQL files versioned in git.
- **Neon EU (Frankfurt)** — Postgres in EU jurisdiction (KVKK + GDPR safe). Branch-per-PR for safe schema iteration. Serverless driver works in Workers.
- **Hyperdrive** in front of Neon — connection pooling + read caching at edge.

### Frontend: Astro + React islands
- Astro SSR on Workers — best-in-class Lighthouse scores out of the box.
- React islands only where genuinely interactive (booking flow, patient portal forms, admin tables). 90% of the site is static HTML at request time.
- Works natively with locale-prefixed routes.
- Tailwind v4 for styling; CSS variables for the design tokens (Sage Clinical palette per discovery §5).

### Edge primitives
- **KV** — sessions, rate-limit counters, idempotency keys, cached read paths, OAuth state.
- **R2** — patient document uploads, testimonial videos, Q&A media. Signed-URL only (1h TTL).
- **Durable Objects** — slot locking. One DO instance per `(doctorId, date)` is the consistency boundary for booking conflicts.
- **Queues** — email/SMS/WhatsApp outbox with retry + DLQ.
- **Cron Triggers** — appointment reminders (T-24h, T-1h), cleanup of expired holds, daily KVKK audit-log archival.

## Consequences

### Positive
- One vendor for compute + edge state + queues + cron. Dramatically reduces operational surface.
- TypeScript end-to-end. Shared types between API and web app via a workspace package.
- Performance ceiling is platform-bound (Cloudflare's, which is high), not framework-bound.

### Negative
- Cloudflare Worker CPU limit (50ms unbusted, 30s with bursting). Heavy operations (PDF generation, video transcode) must be offloaded to Queues + DO + external service.
- No Node-native libraries. Some npm packages don't work — we audit and replace at install time (e.g., Argon2 via WebCrypto + WASM, not the Node bindings).
- Vendor lock-in to Cloudflare. Mitigation: hexagonal architecture isolates Workers-specific code in `infrastructure/cf/`. Migrating to another edge runtime would be a 2–3-week port, not a rewrite.

### Rejected alternatives

| Stack | Why not |
|---|---|
| Next.js on Vercel | Heavier runtime, weaker Workers parity, more expensive at projected volume, no native slot-locking primitive. |
| NestJS on Fly.io | Real Node runtime — gives us Argon2-Node, OAuth libraries, etc. — but loses sub-50ms TTFB globally and doubles ops surface. |
| Remix on Cloudflare | Lighter than Next, but no Astro-class static-first model for content-heavy locale pages. |
| SvelteKit | Excellent runtime; team unfamiliarity adds risk for a 5-locale launch. |
| Pure-Cloudflare Pages Functions | Insufficient — need Hono's middleware composition for guards/pipes. |
