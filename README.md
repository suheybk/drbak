# Uzm. Dr. Oğuz Bak — AĞRI ve KRONİK HASTALIKLAR KLİNİĞİ

Edge-deployed website + appointment-booking platform for Uzm. Dr. Oğuz Bak (Neurology · Algoloji), based in Kartal, İstanbul. Five locales (TR · AR · EN · FR · ES) with full RTL for Arabic. KVKK + GDPR compliant by design.

> **Status:** in active build. Phase 0 (Discovery) signed off; Phase 1 in progress. See [docs/discovery.md](./docs/discovery.md) for the full clinical and brand brief.

## What this repo contains

| Path | What |
|---|---|
| [`apps/api`](./apps/api) | Hono on Cloudflare Workers — booking, auth, CMS API, admin |
| [`apps/web`](./apps/web) | Astro + React islands SSR on Workers — public site, booking flow, patient portal, admin |
| [`packages/contracts`](./packages/contracts) | Zod DTOs shared between API and web |
| [`packages/i18n-keys`](./packages/i18n-keys) | Typed translation keys + RTL helpers |
| [`packages/ui`](./packages/ui) | Shared React + Tailwind primitives |
| [`marketing/`](./marketing) | Phase 2 deliverables (campaign, calendar, sequences, copy) |
| [`docs/`](./docs) | Architecture, ADRs, domain model, DB schema, ops runbooks |

## Quick start (local)

```bash
# Prerequisites: Node 20.11+, pnpm 9, a Cloudflare account, a Neon dev branch.
# Windows users: WSL2 recommended for wrangler dev.

git clone <repo> drbak && cd drbak
pnpm install

# 1. Copy and fill env files
cp apps/api/.dev.vars.example apps/api/.dev.vars        # API secrets
cp apps/web/.env.example apps/web/.env                  # web env

# 2. Run migrations against your Neon dev branch
DATABASE_URL=postgres://... pnpm db:migrate

# 3. Start everything
pnpm dev          # api on :8787, web on :4321
```

## Tech stack at a glance

- **Runtime:** Cloudflare Workers (no Node runtime; sub-50ms TTFB globally)
- **HTTP:** Hono with Zod-validated routes, NestJS-style DI (see [ADR-0003](./docs/adr/0003-di-on-workers.md))
- **DB:** Drizzle ORM + Neon Postgres EU (Frankfurt) via Hyperdrive pooling
- **Edge state:** KV (sessions, rate limits, idempotency, cache), R2 (documents, media)
- **Concurrency:** Durable Objects for slot-locking (one DO per `doctor × day`)
- **Async:** Cloudflare Queues for email/SMS/WhatsApp; Cron for reminders
- **Frontend:** Astro 5 SSR + React 19 islands + Tailwind 4
- **Auth:** JWT (ES256, short-lived) + KV-backed refresh tokens; Google OAuth; Argon2id (WebCrypto)
- **i18n:** route-prefixed locales, AR-RTL verified end-to-end
- **Testing:** Vitest (unit + integration via Miniflare), Playwright (e2e + a11y + RTL)
- **Lint/format:** Biome (one tool, no eslint+prettier sprawl)
- **Deploy:** GitHub Actions → `wrangler deploy` per env

Read [docs/architecture.md](./docs/architecture.md) for the full picture.

## Scripts

```bash
pnpm dev                 # api + web in parallel
pnpm dev:api             # api only
pnpm dev:web             # web only

pnpm test                # all tests, all packages
pnpm test:unit
pnpm test:integration
pnpm test:e2e            # Playwright

pnpm lint                # biome check
pnpm lint:fix
pnpm typecheck

pnpm db:generate         # generate migration from schema diff
pnpm db:migrate          # apply migrations
pnpm db:studio           # open Drizzle Studio

pnpm deploy:staging
pnpm deploy:prod         # CI-gated by tag
```

## Key documents (start here as a new contributor)

1. [docs/discovery.md](./docs/discovery.md) — clinical & brand brief; the source of truth for what we're building and why
2. [docs/architecture.md](./docs/architecture.md) — system topology, data flow, failure modes
3. [docs/domain-model.md](./docs/domain-model.md) — entities, aggregates, invariants, ubiquitous language
4. [docs/db-schema.md](./docs/db-schema.md) — table-by-table reference
5. [docs/adr/](./docs/adr/) — every non-trivial architectural decision, dated and rationale-backed

## Compliance baseline

Every change touches a system that processes Turkish health data. Three rules, no exceptions:

1. **No code path may persist health data without a corresponding `consent_records` row** for the relevant `consent_purpose`. Enforced at the repository layer; bypasses fail in CI.
2. **No log line may contain raw PII.** Patient identifiers are hashed (`sha256(userId+salt)[:16]`) before logging.
3. **No before/after media or named testimonials may render publicly without `status='approved'`** plus a linked `consent_record` of purpose `testimonial_publication`. Default to gated.

See [docs/auth.md](./docs/auth.md) (Drop 2) and [docs/discovery.md §10](./docs/discovery.md) for the full regulatory model.

## License

Proprietary. © 2026 Uzm. Dr. Oğuz Bak. All rights reserved.
