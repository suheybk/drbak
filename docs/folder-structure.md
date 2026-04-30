# Folder structure

```
drbak/
├── apps/
│   ├── api/                          ← Hono + Workers backend (this is "the API")
│   │   ├── src/
│   │   │   ├── domain/               ← pure (see ADR-0002)
│   │   │   ├── application/
│   │   │   │   ├── ports/
│   │   │   │   └── use-cases/
│   │   │   ├── infrastructure/
│   │   │   │   ├── db/
│   │   │   │   ├── kv/
│   │   │   │   ├── r2/
│   │   │   │   ├── do/
│   │   │   │   ├── queues/
│   │   │   │   ├── cron/
│   │   │   │   ├── crypto/
│   │   │   │   ├── oauth/
│   │   │   │   └── notifiers/
│   │   │   ├── interfaces/
│   │   │   │   ├── http/
│   │   │   │   └── workers/         ← entry points (fetch/queue/scheduled/do)
│   │   │   └── composition/
│   │   ├── test/
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   └── fixtures/
│   │   ├── drizzle.config.ts
│   │   ├── wrangler.toml
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                          ← Astro + React islands frontend
│       ├── src/
│       │   ├── pages/
│       │   │   ├── [locale]/        ← static + SSR pages
│       │   │   │   ├── index.astro
│       │   │   │   ├── tedaviler/
│       │   │   │   ├── tms/         ← marquee TMS cluster (per discovery §6)
│       │   │   │   ├── rehber/
│       │   │   │   ├── randevu/     ← booking flow
│       │   │   │   ├── hesabim/     ← patient portal
│       │   │   │   └── yonetim/     ← admin
│       │   │   └── api/             ← Astro API routes (BFF only — proxies to apps/api)
│       │   ├── components/
│       │   │   ├── booking/
│       │   │   ├── content/
│       │   │   │   └── DoctorNote.astro   ← per discovery §3 first-party voice pattern
│       │   │   ├── ui/
│       │   │   └── i18n/
│       │   ├── content/             ← Astro content collections (blog, conditions)
│       │   │   ├── blog/
│       │   │   │   ├── tr/
│       │   │   │   ├── ar/
│       │   │   │   ├── en/
│       │   │   │   ├── fr/
│       │   │   │   └── es/
│       │   │   └── rehber/
│       │   ├── styles/
│       │   │   ├── tokens.css       ← Sage Clinical palette + Fraunces/Söhne stack
│       │   │   └── global.css
│       │   ├── i18n/
│       │   │   ├── tr.json
│       │   │   ├── ar.json
│       │   │   ├── en.json
│       │   │   ├── fr.json
│       │   │   └── es.json
│       │   └── lib/
│       │       └── api.ts           ← typed fetch client (uses @dr-bak/contracts)
│       ├── public/
│       │   ├── fonts/
│       │   └── og/
│       ├── astro.config.mjs
│       ├── wrangler.toml
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── contracts/                    ← Zod DTOs shared between API and web
│   │   ├── src/
│   │   │   ├── booking.ts
│   │   │   ├── auth.ts
│   │   │   ├── patient.ts
│   │   │   ├── content.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── i18n-keys/                    ← typed translation keys + RTL helpers
│   │   ├── src/
│   │   │   ├── keys.ts              ← keyof TR base (single source of truth)
│   │   │   ├── locales.ts
│   │   │   └── direction.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── ui/                           ← shared React + Tailwind primitives
│       ├── src/
│       │   ├── Button.tsx
│       │   ├── Field.tsx
│       │   ├── DateTimePicker.tsx
│       │   └── ...
│       ├── package.json
│       └── tsconfig.json
│
├── marketing/                        ← Phase 2 deliverables (not deployed)
│   ├── brand-voice-guide.md
│   ├── launch-campaign-plan.md
│   ├── content-calendar.md
│   ├── email-sequences/
│   │   ├── welcome-tr.md
│   │   ├── welcome-ar.md
│   │   ├── ...
│   ├── landing-copy/
│   │   └── per-service/per-locale/
│   └── seo-plan.md
│
├── docs/
│   ├── discovery.md                  ← Phase 0 output
│   ├── architecture.md
│   ├── domain-model.md
│   ├── db-schema.md
│   ├── auth.md                       ← Drop 2
│   ├── openapi.yaml                  ← Drop 2 (generated)
│   ├── ops.md                        ← Phase 3
│   ├── adr/
│   │   ├── 0001-tech-stack.md
│   │   ├── 0002-hexagonal-architecture.md
│   │   ├── 0003-di-on-workers.md
│   │   └── 0004-i18n-strategy.md     ← Drop 4
│   └── runbooks/
│       └── ...
│
├── .github/
│   └── workflows/
│       ├── ci.yml                    ← lint + typecheck + test
│       └── deploy.yml                ← deploy on tag
│
├── .gitignore
├── .editorconfig
├── biome.json                        ← linter + formatter
├── package.json                      ← root (pnpm workspace)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── README.md
└── info.txt, faq.txt, privacy-policy.txt   ← source content from owner
```
