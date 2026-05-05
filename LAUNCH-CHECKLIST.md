# Launch checklist — owner actions

Engineering is done; the items below need credentials, decisions, or money.
Group A blocks public launch; Group B blocks paid acquisition; Group C is
nice-to-have polish.

When an item is done, tick the box and (if relevant) flip the matching flag
in `memory/dr-bak-locked-decisions.md`.

---

## A. Blocks launch

### A1. Cloudflare account + IDs (engineering needs these to deploy)

- [ ] Provision a Cloudflare account (or confirm an existing one)
- [ ] Create a Cloudflare API token scoped to: *Pages: Edit · Workers: Edit · KV: Edit · R2: Edit · DNS: Read* on the `uzmdroguzbak.com` zone
- [ ] Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repository secrets in GitHub (`Settings → Secrets and variables → Actions`)
- [ ] Replace the `REPLACE_WITH_*_ID` placeholders in `apps/api/wrangler.toml` (KV namespaces × 4, R2 buckets × 2, Hyperdrive × 1) for both `staging` and `production` envs
- [ ] Provision a CF Pages project named `dr-bak-web` (production) and `dr-bak-web-staging` (staging) — connect them to the GitHub repo
- [ ] Provision Worker queues: `drbak-notifications`, `drbak-notifications-dlq`, `drbak-webhooks`, `drbak-webhooks-dlq` (and `-staging` variants)
- [ ] Generate the JWT signing key pair per `docs/runbook.md` §4.1 and `wrangler secret put` it in both envs

### A2. Neon Postgres EU (Frankfurt)

- [ ] Create a Neon project pinned to `eu-central-1` (Frankfurt)
- [ ] Create branches `main` (production) and `staging`
- [ ] Add CF Hyperdrive bindings pointing at each branch
- [ ] Apply migrations:
  ```bash
  pnpm --filter @dr-bak/api db:migrate -- --env staging
  pnpm --filter @dr-bak/api db:migrate -- --env production
  ```
- [ ] Verify the seed migration `0002_seed.sql` ran (one row in `doctors`, five rows in `services`)

### A3. Vendor accounts + credentials

| Vendor | What to do | Owner |
|---|---|---|
| Resend | Sign up; verify `uzmdroguzbak.com` domain (DKIM + SPF + DMARC TXT records); generate API key | Clinic |
| NetGSM | Sign up; **register sender ID with İYS** (mandatory — TR commercial-SMS gate); test SMS to a TR number | Clinic |
| Twilio (optional) | Only if non-TR SMS will be sent at launch | Clinic |
| Meta WhatsApp Cloud API | Provision a phone number; connect to the WhatsApp Business app; submit templates `booking_confirm`, `reminder_t24h`, `reminder_t1h_telehealth` for TR + EN approval **at least 5 days before launch** (Meta review takes 24–48h per template) | Clinic |
| Google Cloud OAuth | Create a project; enable Identity Platform / OAuth Consent screen; add `https://api.uzmdroguzbak.com/api/v1/auth/oauth/google/callback` as authorised redirect | Clinic |
| Jitsi-as-a-Service | Sign up at https://jaas.8x8.vc; create an app; note `JITSI_APP_ID` + secret | Clinic |

For each, run `wrangler secret put <NAME> --env staging` then `--env production` per the names listed in `apps/api/wrangler.toml` comments.

### A4. DNS cut-over (per `infrastructure/dns-migration.md`)

- [ ] Confirm registrar credentials for `uzmdroguzbak.com`
- [ ] Pre-lower TTLs to 300s (T-12 days)
- [ ] Schedule the cut-over window (T-1 day, 04:00 Europe/Istanbul recommended)
- [ ] On launch eve: flip nameservers to Cloudflare (3 minutes; reversible by reverting NS)
- [ ] Verify with the §9 verification matrix in `infrastructure/dns-migration.md`

### A5. Cloudflare WAF rules (per `infrastructure/waf-rules.md`)

- [ ] Apply the 5 rate-limit rules
- [ ] Apply the 5 custom firewall rules (idempotency-key required, admin geofence, etc.)
- [ ] Enable Bot Fight Mode + Cloudflare Managed Ruleset + OWASP CRS at paranoia 2
- [ ] Enable HSTS (1-year) — wait 30 days before adding `preload` per the file's note

### A6. KVKK + GDPR + privacy

Full obligations are documented in `docs/compliance/CHECKLIST-DOCTOR.md` (English) / `docs/compliance/CHECKLIST-DOCTOR-TR.md` (Turkish, printable as `dr-bak-uyum-listesi.pdf`) for the doctor, and `docs/compliance/CHECKLIST-DEVELOPER.md` for the engineering controls. The gate items below are the launch-blockers.

**Doctor-side (per CHECKLIST-DOCTOR-TR.md):**
- [ ] **B1.1** VERBİS registration filed (within 30 days of first patient record)
- [ ] **B1.2** İrtibat kişisi designated and registered with VERBİS
- [ ] **B1.3** Uzaktan Sağlık Faaliyet İzin Belgesi obtained from İl Sağlık Müdürlüğü
- [ ] **B1.4** Veri İşleyen Sözleşmesi signed with every third-party that touches patient data (incl. Standart Sözleşme + KVKK 5-business-day filing for each EU vendor)
- [ ] **B1.5** Aydınlatma Metni published in 5 languages + waiting-room poster
- [ ] **B1.6** Five required written policies adopted and date-signed
- [ ] **B9.1** GDPR Art.27 EU representative appointed (if EU patient bookings expected)
- [ ] **B9.6** DPIA reviewed and signed by doctor

**Engineering-side (per CHECKLIST-DEVELOPER.md):**
- [ ] **A2.2** AES-256-GCM at-rest encryption live for özel-nitelikli columns (currently plaintext placeholder in `chat_messages.body_ciphertext` — see TODO in `handleChatMessage.ts`)
- [ ] **A4.1** Granular separated consents (`consents` table with C1–C5 purposes) wired to onboarding flow
- [ ] **A7.1** Incident response runbook at `runbooks/INCIDENT_RESPONSE.md` with TR/AR/EN/FR/ES patient-notification templates
- [ ] **A8.5** Telehealth pre-visit non-skippable modal with verbatim Yönetmelik md.7 disclosures
- [ ] **A10.2** Data portability endpoint (Art.20) — JSON export of patient's own data
- [ ] **A10.3** Restriction flag (Art.18) honored by downstream queries
- [ ] **A10.5** Cookie consent banner (only triggered if marketing adds GA on patient routes)
- [ ] Have legal counsel review `apps/web/src/views/KvkkPage.astro` content before publish
- [ ] Designate the named person who files KVKK + EU DPA breach notifications within 72 h per `docs/runbook.md` §6
- [ ] Add `kvkk@drbak.com` as the patient-rights intake address; add to footer
- [ ] Confirm Resend stores PII under EU residency (it does for paid plans on `eu-west-1`)

---

## B. Blocks paid acquisition (not launch)

### B1. Medical translator review for AR / FR / ES

Per `memory/dr-bak-locked-decisions.md` §12.14. Until reviewed, AR/FR/ES locales ship with a soft-launch banner (`marketing/launch-plan.md` Risks table) and are blocked from paid acquisition.

- [ ] Engage medical translator (1 person each for AR / FR / ES, or one polyglot reviewer)
- [ ] Brief: hand them `info.txt` (5 first-party articles) + `docs/discovery.md` §3 (voice dials) + the "words we never use" list
- [ ] They review:
  - `packages/i18n-keys/src/locales/{ar,fr,es}.json` — every string
  - `marketing/landing-copy/*.{ar,fr,es}.md` — replace placeholder bodies with full translations of the TR canonical (sections enumerated per locale at the bottom of each placeholder file)
  - `marketing/email-sequences/{01..05}/{ar,fr,es}.md` — STEP 1 already drafted in some sequences; STEP 2/3 to be localised
- [ ] On signoff: flip `STATUS:` → `canonical` in each file frontmatter; remove the soft-launch banner from `apps/web/src/layouts/BaseLayout.astro` (when added — currently it's not; see B1 sub-item below)
- [ ] (One-time agent fires 2026-05-14 06:00 UTC to nudge: https://claude.ai/code/routines/trig_01Jzb1jUctfe8W4QEb2Hyncm)

### B2. Soft-launch banner (engineering follow-up after B1 starts)

- [ ] Add a thin orange `<Banner variant="warning">` to `BaseLayout.astro` shown only when `Astro.currentLocale` is `ar|fr|es` AND a `SOFT_LAUNCH=1` env var is set
- [ ] Banner copy (TR): *"Bu sayfa otomatik çevrildi; tıbbi inceleme süreci devam ediyor."* (translated equivalents per locale)

### B3. Paid acquisition prerequisites

- [ ] Google Ads account set up + billing on file
- [ ] Meta Ads (Facebook/Instagram) Business Manager configured
- [ ] Google Analytics 4 property + measurement ID; server-side events through CF Worker (per `marketing/seo-plan.md` §8)
- [ ] Search Console verification on all 5 locale property variants (or use the hreflang cluster method — pick one and document)

---

## C. Polish — does not block launch

### C1. Web fonts decision

Currently `packages/ui/src/fonts.css` registers Inter under both `Inter` AND `Söhne` family names so the design system works without Söhne. To choose:

- [ ] **Option 1 — License Söhne** (Klim Type Foundry; ~€1.5k for a small commercial site). Drop the Söhne `.woff2` into `apps/web/public/fonts/Sohne-Variable.woff2`; the Inter fallback under the `Söhne` family name remains as a never-fires fallback.
- [ ] **Option 2 — Stay on Inter.** Drop Inter VF into `apps/web/public/fonts/Inter-Variable.woff2` and update brand attribution. Inter is OFL.
- [ ] Drop the OFL fonts into `apps/web/public/fonts/`:
  - `Fraunces-VF.woff2` (display — OFL)
  - `Inter-Variable.woff2` (body — OFL; required even if licensing Söhne, because it's the named fallback)
  - `IBMPlexSansArabic-Regular.woff2` + `IBMPlexSansArabic-SemiBold.woff2` (AR — OFL)
  - `JetBrainsMono-Regular.woff2` (mono — OFL)

### C2. About-page certificate strip

`docs/discovery.md` §12.16 — 22 certificates expected. Until photos arrive, `apps/web/src/views/AboutPage.astro` shows 6 placeholder cards.

- [ ] OB photographs the 22 certificates (consistent lighting, ~1500px wide, jpg)
- [ ] Upload to R2 `drbak-media` bucket (or the existing R2 binding the project uses)
- [ ] Replace the placeholder loop in `AboutPage.astro` with a query against the `certificates` table once seeded
- [ ] Author 22 rows: `INSERT INTO certificates (id, doctor_id, title, issuer, issued_year, image_url, sort_order) VALUES (...)`

### C3. Working hours

`docs/discovery.md` §12.6 — pending owner. Footer + About both render `t('about.hoursPlaceholder')` until set.

- [ ] OB confirms working hours (per locale if multi-locale phrasing differs)
- [ ] Update `clinics.hours_json` for `clinic_kartal` row (shape: `{ mon: [['09:00','18:00']], ... }`)
- [ ] Replace the `hoursPlaceholder` rendering with the real schedule

### C4. Markdown renderer upgrade — DEFERRED to post-launch

`apps/web/src/lib/markdown.ts` is intentionally minimal. The CMS authors are
admin-role and trusted, the simple impl already escapes HTML defensively, and
the unified-pipeline upgrade introduces deps (`vfile`) that externalise
`node:path` / `node:process` / `node:url` at build time. Those resolve fine
under CF's `nodejs_compat` flag, but verifying behaviour in CF Pages SSR
runtime requires a deploy I haven't yet run. Pre-launch this risk isn't
worth taking; revisit after v0.1.0 is stable.

Post-launch upgrade plan:

- [ ] `pnpm add -F @dr-bak/web remark-parse remark-rehype rehype-sanitize rehype-stringify unified unist-util-visit @types/hast`
- [ ] Replace `renderMarkdown` body with `unified().use(remarkParse).use(remarkRehype).use(rehypeSanitize, schema).use(externaliseLinks).use(rehypeStringify)` — keep the synchronous `processSync` shape and string→string signature so callers don't change.
- [ ] Sanitize schema = `defaultSchema` extended to allow `target` + `rel` on `<a>` (added by an externalise-links transform AFTER sanitize so it isn't filtered out).
- [ ] Verify `nodejs_compat` is enabled on the CF Pages project (Settings → Functions → Compatibility flags).
- [ ] Smoke /faq and /kvkk in production after deploy — those are the markdown-heavy pages.

### C5. Localised URL slugs — DEFERRED to post-launch

Currently `/services/tms` is the URL for every locale. Localising the slugs
(`/hizmetler/tms`, `/الخدمات/tms`, etc.) is real SEO upside but requires
renaming ~50 page files (Astro is file-based-routed) plus 301 setup, which
is a high-risk refactor right before launch. The English slugs work
cross-locale today; SEO loss vs. localised slugs is small for the first
cohort because we own the brand-name and condition keywords either way.

Post-launch plan:

- [ ] Add `/hizmetler/tms` (TR), `/الخدمات/tms` (AR), etc., reading from `service_translations.slug_localised`
- [ ] 301 from English slugs to localised slugs in non-default locales (Cloudflare Bulk Redirects, sourced from `service_translations`)
- [ ] Update `apps/web/src/lib/routes.ts` to consult the slug map
- [ ] CI check that every `service_translations.slug_localised` is unique within `(service_id, locale)`

### C6. Programmatic SEO matrix

Per `marketing/seo-plan.md` §9 — only after the first 21 hand-written pages start ranking. Plan, don't build yet.

### C7. Online payment system (iyzico) — booked at owner sign-off 2026-05-04

Patient pays the full appointment fee at booking via iyzico (TR card payments,
Apple Pay, Google Pay). Approved decisions:

- **Provider:** iyzico for TRY (default). Stripe deferred — only consider if
  EUR/USD medical-tourism telehealth volume justifies the second integration.
- **Payment timing:** full upfront. Patient confirms slot → sees price modal →
  pays → appointment status flips from `awaiting_payment` to `confirmed` on
  webhook capture.
- **Apple Pay + Google Pay:** enabled at launch (iyzico default once merchant
  account is approved).
- **Refund deadline:** **>48h before slot** for full refund. Within 48h, no
  refund — the doctor's calendar is locked at that point and the slot can't
  be reliably re-filled. NOTE: this differs from the `cancel/reschedule
  window: 24h` locked decision in `dr-bak-locked-decisions.md`. Resolution
  proposed (pending owner confirm): **align both at 48h** — cancellation,
  reschedule, and refund all use the same 48h cutoff. Simpler patient mental
  model. Update `APPOINTMENT_RESCHEDULE_WINDOW_HOURS` from 24 to 48 in
  `apps/api/wrangler.toml`.

Implementation gates (in this order):

1. [ ] Owner signs up at iyzico merchant portal. Required documents per the
       routine fired 2026-05-09 (trig_01LTpWT5rnf6KYpSGVCdqRkP):
       - Doctor's diploma (Sağlık Bakanlığı approved)
       - Klinik işyeri ruhsatı
       - Vergi levhası
       - T.C. kimlik
       - İmza sirküleri
       - IBAN
       - Live https URL with KVKK + iletişim + iade-koşulları pages
       Approval: 3–7 business days.
2. [ ] iyzico sends `IYZICO_API_KEY` + `IYZICO_SECRET_KEY` (sandbox + production
       keys, separate). Owner pastes into `apps/api/.dev.vars`. Sandbox first.
3. [ ] Engineering implements:
       - `apps/api/src/domain/payment/` — Payment aggregate, Money value-object
         (kuruş integers, never floats), PaymentStatus state machine
       - `apps/api/src/application/ports/PaymentGateway.ts` — interface
       - `apps/api/src/infrastructure/payments/IyzicoGateway.ts` — adapter
       - `apps/api/src/infrastructure/payments/webhooks/iyzico.ts` — HMAC-verify
       - `apps/api/src/application/use-cases/booking/createAppointment.ts`
         extended with `awaiting_payment` status
       - `apps/api/src/application/use-cases/booking/refundCancellation.ts` —
         48h refund policy + gateway refund call
       - DB migration `0005_payments.sql`: `payments` + `payment_refunds`
         tables
       - Booking flow Step 6: iyzico hosted form in iframe (DO slot-hold TTL
         extended 5min → 10min for 3DS bank redirect)
       - Web `/iade-kosullari` page (Refund Policy) — required for iyzico
         approval
       - Patient portal: payment receipt download, refund status visibility
       - Admin: payment list, manual refund button (goodwill cases)
4. [ ] Verify in iyzico sandbox: 5 test cards (success / 3DS challenge / fail /
       insufficient funds / refund). Document in `docs/runbook.md` §7.
5. [ ] Flip to production keys via `wrangler secret put`. First live booking
       happens with a doctor-flagged "test" appointment for end-to-end
       validation.

PCI scope: iyzico hosted form keeps card data off our infrastructure entirely.
We're at PCI-DSS SAQ-A (the simplest tier; no audit). Logged: `gateway_payment_id`,
last 4 digits, brand. Never logged: PAN, CVV, full card data.

KVKK Article 6: payment metadata is special-category financial data; included
in the existing DSAR export + erasure flow with the same retention as health
records (10 years per medical-record retention requirement).

### C8. WhatsApp + web AI agent — Phase 2 (Tier 2, ~3 days post-launch)

Per owner discussion 2026-05-04 informed by `whatsapp-ai-agent-rehberi_1.pdf`:

The chatbot lives on **two surfaces** with the same backend:

1. **WhatsApp** (primary) — patients message the clinic's WhatsApp
   Business number; Meta webhook hits our Worker; Worker calls Claude;
   reply goes back through the WA API. Identity is the patient's phone
   number (E.164) → `patients.phone_e164`. Same channel they already
   use for confirmations + reminders.

2. **Web widget** (secondary) — bottom-right floating widget on every
   public page; lazy-loaded React island. Same backend. Identity via
   the existing JWT session (auth-required for personalised tools;
   anon allowed for FAQ + availability lookup).

**Tier 2 — read-only conversational.** AI can answer FAQs, explain
services/conditions, and look up the patient's existing appointments
(when authenticated). It **cannot** book, cancel, or modify anything;
those state changes always route through the secure web booking flow
with iyzico payment + KVKK consent. Most patient questions don't
require state change; the ones that do get a deep-link to the web flow.

**Languages:** all 5 locales (TR, AR, EN, FR, ES). System prompt is
parameterised by detected user-language, with TR as the canonical
prompt and the other 4 as direct translations of the same scope +
guardrails. AR system prompt notes Western digits for clinical
strings (consistent with the rest of the site).

**Hard constraint baked into the system prompt** (TR Sağlık Bakanlığı
tanıtım rules + KVKK):

> "Sen Uzm. Dr. Oğuz Bak'ın klinik asistanısın, doktor değilsin.
> Yapabileceklerin: SSS yanıtlamak, hizmet/hastalık bilgisi vermek,
> randevu durumunu sorgulamak, TMS ön taraması için sorular sormak.
> Yapamayacakların: tanı koymak, tedavi önermek, doktor muayenesinin
> yerini almak, sonuç vaat etmek. Hasta semptom paylaştığında: kabul
> et, randevu öner, ilgili SSS girdisini sun. Her cevabı şu cümleyle
> kapat: 'Bu bir tıbbi tavsiye değildir; tam değerlendirme için lütfen
> Dr. Bak ile randevu alın.'"

The same prompt is mirrored in 4 other locales.

#### Phase 2 implementation plan (~3 working days post-v0.1.0)

**Day 1 — Backend scaffold (shared by both surfaces)**

- [ ] `apps/api/src/application/ports/LlmProvider.ts` — interface
- [ ] `apps/api/src/infrastructure/llm/AnthropicClaudeProvider.ts` —
      adapter using Sonnet 4.5/4.6 with prompt caching enabled
- [ ] `apps/api/src/infrastructure/llm/systemPrompts/` — 5 locale-
      specific system prompts derived from a shared TR base
- [ ] `apps/api/src/application/use-cases/chat/handleMessage.ts` —
      orchestration: identify patient → run Claude with tools →
      return response
- [ ] DB migration `0005_chat_transcripts.sql`:
      ```sql
      CREATE TABLE chat_sessions (
        id text PRIMARY KEY,
        surface text NOT NULL,        -- 'whatsapp' | 'web'
        patient_id text REFERENCES patients(id),
        anon_session_id text,         -- for unauthenticated web sessions
        wa_phone_e164 text,           -- denormalised for WhatsApp lookup
        locale char(2) NOT NULL,
        consent_version text NOT NULL,
        consent_granted_at timestamptz NOT NULL,
        last_message_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE chat_messages (
        id text PRIMARY KEY,
        session_id text NOT NULL REFERENCES chat_sessions(id),
        role text NOT NULL,           -- 'user' | 'assistant' | 'tool'
        body_encrypted bytea NOT NULL,  -- AES-GCM with per-session key
        body_iv bytea NOT NULL,
        tool_name text,
        tool_args_encrypted bytea,
        tokens_in integer,
        tokens_out integer,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      ```

**Day 2 — WhatsApp + web wiring**

- [ ] `POST /api/v1/webhooks/whatsapp/incoming` — Meta-signed webhook
      handler; verifies HMAC; identifies patient by phone_e164;
      checks/prompts chat consent (template message on first contact);
      passes message into `handleMessage`; sends Claude response back
      via Meta WA API
- [ ] Web widget component: `apps/web/src/islands/ChatWidget.tsx`,
      lazy-loaded floating button (bottom-right, RTL-aware), opens to
      a chat panel with the same backend at
      `POST /api/v1/chat/sessions/:id/messages`
- [ ] LLM tools (read-only):
      - `lookup_services()` — anon ok
      - `lookup_availability(serviceSlug, fromDate, toDate)` — anon ok
      - `lookup_my_appointments()` — auth required (phone match for
        WhatsApp; JWT for web)
      - `lookup_faq(query)` — anon ok
      - `lookup_service_detail(slug)` — anon ok
      - `lookup_condition_detail(slug)` — anon ok
      - `book_link()` — returns the deep-link URL to the web booking
        flow with optional `?service=<slug>` preselect
      - `cancel_or_reschedule_link(appointmentId)` — returns the
        signed `/r/iptal/<token>` or `/r/yeniden-planla/<token>` URL
        from `HmacSignedUrlMinter` (same one we use in
        confirmation emails)
      - `escalate_to_human(reason)` — writes to clinic Slack
        with truncated transcript + sets a `human_takeover_until`
        flag on the session for the next 4 hours

**Day 3 — KVKK + production hardening**

- [ ] Chat-consent: separate `chat_processing` purpose in
      `consent_records`; first WhatsApp message triggers a template-
      message consent prompt; web widget shows the consent block
      before the first message
- [ ] Transcript encryption: AES-GCM with per-session key derived
      from `(userId | anon_session_id, KMS_KEY)`; KMS key is a
      Workers binding rotated quarterly
- [ ] DSAR integration: `dsarExport.ts` includes decrypted transcripts
      in the JSON dump; `dsarErase.ts` purges chat_messages.body_*
      fields for the user
- [ ] Rate-limit: 30 messages/hour per session, 200/day per patient;
      enforced in KV
- [ ] LLM cost cap: 50 ₺/day per patient, 500 ₺/day total; when hit,
      fallback to static FAQ search ("Bütçe doldu, doktor sizinle
      WhatsApp üzerinden iletişime geçecek.")
- [ ] Admin transcript review: `/admin/chat` lists sessions filterable
      by escalation flag, with full decrypted transcript for the
      named DPO + admin role only
- [ ] Meta WhatsApp 24h-window handling: after 24h of patient
      inactivity, AI cannot send free-form messages — only the
      4 approved templates (booking_confirm, reminder_t24h,
      reminder_t1h_telehealth, plus a new `chat_followup` template
      requiring Meta review before launch +14)

#### Owner deliverables for the chatbot

- [ ] **Anthropic API key** (Claude). Sign up at
      https://console.anthropic.com → API Keys → Create. Add to
      `apps/api/.dev.vars` as `ANTHROPIC_API_KEY=`. Reminder fires
      2026-05-30 (trig_01VcqgdUkJHLD8sBGLjwHFCX).
- [ ] **System-prompt sign-off** — Dr. Bak reviews the TR system
      prompt (the source-of-truth) before deploy. Engineering
      drafts; doctor approves voice + scope.
- [ ] **KVKK page update** — add a paragraph to
      `apps/web/src/views/KvkkPage.astro` covering chat data
      processing: what's collected, why, retention (10y same as
      health records), Meta + Anthropic as processors, EU residency
      for both. Legal review same as the rest of the KVKK page (A6).
- [ ] **Meta WhatsApp template approval** — submit `chat_followup`
      template for TR + EN before Tier-2 launch. 24-48h review per
      template.

#### Cost projection (validated against the PDF reference)

- ~500 conversations/month at Tier 2 (read-only, short turns)
- Sonnet 4.5/4.6 with prompt caching: ~50% cheaper than the PDF
  reference (which used uncached Sonnet 4)
- Estimated ~250-500 TL/month total (Anthropic + Meta WA + KV
  storage). Stays under 1,000 TL even at 2,000 conversations/month.
- Compared to the PDF's 770-1,640 TL/month estimate, we save by:
  - No Railway hosting (Workers already in our stack)
  - Prompt caching halves the Claude bill
  - Service conversations on Meta WA are free for the first 1k/month

---

## Quick verification before flipping the launch toggle

Run these commands locally; all must pass.

```bash
pnpm install
pnpm typecheck    # 26 known errors fixed in 2026-04-30 cleanup; gate is hard from here
pnpm lint
pnpm test         # 38/38 unit tests pass as of 2026-04-30
pnpm --filter @dr-bak/web build
pnpm --filter @dr-bak/web test:e2e        # Playwright RTL
```

### Typecheck cleanup (2026-04-30) — DONE

The 26 errors documented in earlier resume notes were resolved alongside a
large hidden batch of apps/web errors that surfaced once apps/api went green.
Summary of the fixes that landed:

- `argon2-browser` ambient .d.ts shim under `apps/api/src/types/`
- `@oslojs/jwt` API ported (header/payload now JSON-stringified, validation
  via `JWTClaims` instead of removed `validateJWT`)
- `Hyperdrive.connectionString` access — global type used directly
- `cloudflare:test` — integration tests excluded from the main typecheck
  (they run in the Workers pool with their own runtime)
- `SlotLockClient` DO `Request` types — pass URL strings to `stub.fetch()`
- R2 PUT — read body to `ArrayBuffer` instead of streaming `ReadableStream`
- Self-referential `patients.guardianPatientId` — typed via `AnyPgColumn`
- `exactOptionalPropertyTypes` cluster across admin/auth/patient/oauth/error
  routes and use cases (~10 sites)
- `apps/web` regression: commit `e65cae2` Biome organize-imports stripped
  Astro component imports (Biome doesn't parse .astro templates) — restored
  imports across BaseLayout, Header, Footer, all 17 view components, all 17
  unprefixed pages, and all 17 `[locale]/` pages
- `pnpm.overrides` pin for `zod-to-json-schema@3.23.5` — newer 3.25.x
  imports `zod/v3` which only exists in zod ≥ 3.24
- Astro 5 dropped `routing.redirectToDefaultLocale: false` as invalid when
  `prefixDefaultLocale: false` — removed from `astro.config.mjs`

Then in the GitHub repo:

```bash
# Push a tag to trigger production deploy (after CI green)
git tag v0.1.0
git push origin v0.1.0
# Approve in: Settings → Environments → production → reviewers
```

Watch:
- `gh run list --workflow=deploy-prod.yml --limit 1`
- `wrangler tail --env production --format pretty` (in another terminal)

Smoke checks at the bottom of `deploy-prod.yml` should all return 200. If
not, follow `docs/runbook.md` §1 rollback procedure.

## Owner-action sign-off

When the green box of A1–A6 is fully ticked, paste a short status note in
`#drbak-incident` and tag engineering. Launch day proceeds per
`marketing/launch-plan.md` "T-0 — Launch day" timeline.
