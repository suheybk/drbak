# @dr-bak/web

Astro 5 + React 19 frontend for the Dr. Bak platform. Deploys to Cloudflare
Pages with SSR via the `@astrojs/cloudflare` adapter.

## Layout

```
src/
├── env.d.ts                    Astro type augmentation
├── lib/
│   ├── locales.{mjs,ts}        Locale constants (mjs for astro.config)
│   ├── i18n.ts                 loadDict + buildT (server-side translator)
│   ├── routes.ts               URL builder (locale-prefixed)
│   ├── api.ts                  apiFetch / serverFetch / errorMessageFor
│   └── markdown.ts             tiny safe markdown → HTML (CMS bodies)
├── layouts/BaseLayout.astro    <html>, head, header, footer, skip-link
├── components/
│   ├── Header.astro            sticky brand + nav + locale switcher
│   └── Footer.astro            contact, links, copyright
├── views/                      shared page bodies (re-used by /<route> and /<locale>/<route>)
│   ├── ServicesPage.astro
│   ├── ServiceDetailPage.astro
│   ├── ConditionsPage.astro
│   ├── ConditionDetailPage.astro
│   ├── AboutPage.astro
│   ├── ContactPage.astro
│   ├── BlogPage.astro
│   ├── BlogPostPage.astro
│   ├── FaqPage.astro
│   ├── KvkkPage.astro
│   ├── AccessibilityPage.astro
│   ├── BookingPage.astro
│   ├── AccountPage.astro
│   ├── LoginPage.astro
│   ├── RegisterPage.astro
│   ├── PasswordResetPage.astro
│   └── VerifyEmailPage.astro
├── islands/                    React 19 hydrated components
│   ├── BookingFlow.tsx         5-step appointment flow
│   ├── AuthForm.tsx            login + register
│   ├── PasswordResetForm.tsx
│   ├── TmsScreeningForm.tsx
│   ├── AppointmentActions.tsx  cancel / reschedule
│   └── DocumentUploader.tsx
├── pages/                      Astro file-based routes (TR default, unprefixed)
└── pages/[locale]/             AR / EN / FR / ES routes (one entry per page)
```

The thin entry under `pages/<route>.astro` and `pages/[locale]/<route>.astro`
both import the same body from `views/`. This avoids doubling content while
keeping route URLs idiomatic.

## i18n

Locales live in `@dr-bak/i18n-keys`. `loadDict(locale)` returns the JSON
dictionary; `buildT(locale)` returns a typed `t(key, vars?)`. The 5 locales
are TR (default, unprefixed), AR (RTL — `dir="rtl"` on `<html>`), EN, FR, ES.

In AR, clinical numerals (date, dose, time, phone) MUST render in Western
digits — wrap the digit-bearing element in `class="digit-western" dir="ltr"`.
The Playwright RTL test enforces this.

## API integration

`PUBLIC_API_BASE` points at the Hono Worker at `api.uzmdroguzbak.com`. SSR
pages forward the visitor's cookies via `serverFetch(request, path)`; React
islands use `apiFetch(path, opts)` with `credentials: 'include'`. Both return
`{ ok: true, value } | { ok: false, error }` — never throw.

## Dev

```bash
pnpm dev                 # astro dev on :4321
pnpm test:e2e            # Playwright (assumes API at :8787)
pnpm build && pnpm preview
```

## Deploy

```bash
pnpm deploy:staging      # wrangler pages deploy → dr-bak-web-staging
pnpm deploy:prod         # wrangler pages deploy → dr-bak-web
```

## Open items

- AR translations are first-pass; medical-translator review pending (see
  `memory/dr-bak-locked-decisions.md` §12.14).
- Web fonts must be self-hosted under `public/fonts/` (Fraunces, Söhne, IBM
  Plex Sans Arabic, JetBrains Mono). Until they're committed, the browser
  falls back to system serif/sans.
- The markdown renderer is intentionally tiny. Phase 1 close swaps in
  remark/rehype with rehype-sanitize for richer rendering of CMS bodies.
- Localised URL slugs (`hizmetler` instead of `services`, etc.) are deferred
  to Phase 2 marketing/SEO.
