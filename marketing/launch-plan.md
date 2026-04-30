# Launch plan — Dr. Bak website + booking platform

**Target launch (T-0):** TBD by clinic; plan assumes a Monday launch and counts back from there.
**Plan span:** T-8 weeks → T+2 weeks (10 weeks total).
**Owners (initials):** OB = Dr. Oğuz Bak; CL = clinic lead/front-desk; AG = agency / freelancer (copy + design + dev); EN = engineering (this repo).
**KPI cadence:** weekly review every Monday 10:00 Europe/Istanbul.

---

## Objectives (the only three that count)

1. **Bookings flow.** Get to ≥ 8 first-party bookings/week within 4 weeks of launch (baseline = 0 today; current funnel exits to DoktorTakvimi). Measured in `appointments.created` events tagged `source=first_party`.
2. **TMS positioning.** Rank in the top 10 organic for `tms tedavisi istanbul` and at least 3 of the 16 condition-cluster URLs within 12 weeks of launch (see `seo-plan.md`).
3. **Trust signal.** Ship a published, KVKK-compliant testimonials section with **at least 6 written testimonials**, each backed by a recorded açık rıza beyanı, by T+2 weeks.

Anything not serving one of these three is descoped from launch.

## Risks (and the bet against them)

| Risk | Likelihood | Bet |
|---|---|---|
| AR/FR/ES copy ships pre-translator-review | High | Soft-launch AR/FR/ES with a banner: *"Bu sayfa otomatik çevrildi; tıbbi inceleme süreci devam ediyor."* + pin to TR/EN canonical. **Block all AR/FR/ES paid acquisition until reviewed.** |
| Sağlık Bakanlığı complaint over copy | Low-medium | Pre-launch legal pass on every public page; "words we never use" lint in CI; no fee-listing; no comparative claims |
| KVKK breach via testimonial without consent | Low (process-controlled) | Testimonials publish *only* via the admin `reviewTestimonial.ts` use-case which requires `consent_records.id` reference |
| Slot conflicts under launch traffic | Low | Durable Object slot-lock + partial-unique DB index already shipped (Phase 1 Drop 3a) |
| Telehealth video unavailable on launch day | Medium | Jitsi-as-a-Service room provisioning sanity-tested in -T2 dry run; fallback = phone consult with same patient |

---

## Week-by-week runbook

### T-8 weeks — Foundations

**Goal:** Production environment cut-over starts. Content pipeline unblocks.

| Asset / Task | Owner | Detail |
|---|---|---|
| Cloudflare Pages + Workers production env provisioned | EN | `wrangler.toml` env=production; secrets set via `wrangler secret put`; DNS staged but not switched |
| Neon Postgres EU (Frankfurt) provisioned | EN | Hyperdrive binding; migration applied; seed `doctors`/`services` rows |
| Resend, NetGSM, Twilio, Meta WhatsApp Cloud API accounts onboarded | CL | NetGSM sender ID **must be İYS-registered** before first SMS |
| Brand pack handoff (logos, photos, colour ratios, typography licenses) | OB → AG | Sage Clinical palette locked; Söhne license decision (else Inter fallback) |
| Working hours decision, certificates list, IG content audit | OB | Closes open questions §12.7/§12.16 |

**KPI:** All 5 platforms onboarded; secrets sealed in CF; dev → staging deploy works.

---

### T-7 weeks — Content sprint kicks off

**Goal:** Owner-supplied copy enters the pipeline; translator engaged.

| Asset / Task | Owner | Detail |
|---|---|---|
| Engage medical translator (AR + FR + ES) | CL | Per `memory/dr-bak-locked-decisions.md` §12.14. Brief includes: the 5 first-party articles in `info.txt`, the brand voice dials, "words we never use" |
| Draft TR canonicals for 5 services (`landing-copy/<service>.tr.md`) | AG | TMS, neurology consultation, home visit, telehealth, IV therapy. Use info.txt template (definition → causes → diagnosis → treatment → "From Dr. Bak" pull-quote) |
| Draft TR + EN copy for 16 TMS cluster pages | AG | One per condition (depresyon, anksiyete, OKB, bipolar, PTSD, DEHB, Parkinson, Alzheimer, inme sonrası, migren, tinnitus, epilepsi, nöropatik ağrı, huzursuz bacak, otizm, OKB) |
| Photograph 22 certificates + clinic environment | OB → AG | `docs/discovery.md` §12.16 close-out |
| Spin up `marketing/email-sequences/` 5 sequences | AG | TR + EN final, AR/FR/ES placeholder sent to translator |

**KPI:** 5/5 service landing-copy first drafts in repo; 8/16 TMS cluster pages drafted; translator confirmed.

---

### T-6 weeks — SEO foundation + analytics

**Goal:** Site is crawlable + measurable from day zero.

| Asset / Task | Owner | Detail |
|---|---|---|
| Sitemap index per locale wired to API content endpoint | EN | Replace `apps/web/src/pages/sitemap.xml.ts` stub with a dynamic version pulling from `/public/content` |
| `Physician`, `MedicalProcedure`, `MedicalCondition`, `FAQPage`, `Article`, `BreadcrumbList` JSON-LD on every page type | EN | See `seo-plan.md` schema section |
| GA4 + server-side events through CF Worker | EN | First-party cookie strategy; no third-party analytics on `/account` or `/book` |
| Search Console properties verified for all 5 locales (or one with hreflang clusters) | AG | DNS TXT verification ahead of DNS cut-over |
| Open Graph + Twitter Card asset set per service page | AG | One reusable OG template + per-page overlay |

**KPI:** Lighthouse SEO ≥ 95 on every locale homepage; sitemap index has ≥ 30 URLs.

---

### T-5 weeks — TMS pillar lands

**Goal:** TMS marquee landing page + 5 of the 16 cluster pages publishable.

| Asset / Task | Owner | Detail |
|---|---|---|
| `/services/tms` (TR canonical) — long-form pillar | AG → OB review | Mechanism, evidence, who it's for + isn't, FAQ, indications, prep, what-a-session-feels-like, "From Dr. Bak" closing block |
| `/conditions/depresyon`, `/conditions/anksiyete`, `/conditions/okb`, `/conditions/migren`, `/conditions/tinnitus` cluster pages | AG | Cross-links into `/services/tms` |
| TR FAQ entries (`type=faq`) — 24h cancel, 30-40min initial exam, telehealth clarifications | CL | Pulled from `faq.txt` |
| TR KVKK page final, EN translation parked for sign-off | EN + AG | Replaces `privacy-policy.txt` baseline; admin-published via `contentEntryWrite` |

**KPI:** TMS pillar + 5 cluster pages published in TR; TR FAQ has ≥ 12 entries; KVKK page approved by counsel.

---

### T-4 weeks — Email + transactional dry-run

**Goal:** Every transactional message hits the right inbox, in the right language, with the right links.

| Asset / Task | Owner | Detail |
|---|---|---|
| All 5 email sequences in TR + EN reviewed by OB | OB | Tone check; clinical accuracy; the consent-document version stamp |
| Resend domain authentication (DKIM, SPF, DMARC=quarantine) | EN | `info@uzmdroguzbak.com` domain sender; bounce handling |
| NetGSM SMS template approval (TR domestic) | CL | İYS check; 160-char templates per sequence |
| WhatsApp message templates submitted to Meta for approval | CL + EN | Booking confirmation + T-24h reminder; Meta review takes 24-48h |
| Dry-run booking → transactional pipeline end-to-end | EN + CL | 6 staff bookings; verify each delivers via 3 channels in 5 locales (TR/AR/EN/FR/ES) |

**KPI:** 6/6 dry-run bookings deliver email + SMS + WA on time; bounce rate < 2%.

---

### T-3 weeks — Soft-launch to staff and family

**Goal:** Closed-circle real bookings; surface the bugs that didn't show up in dry-run.

| Asset / Task | Owner | Detail |
|---|---|---|
| Soft-launch URL = `staging.uzmdroguzbak.com` open to ~30 known users | CL | List: clinic staff, doctor's family, 5 trusted past patients (with explicit invite) |
| Bug-bash session (90 min) | OB + CL + EN | Run through booking flow on Android, iPhone, desktop in TR + AR + EN |
| Patient portal `/account` → upload doc + book → reschedule → cancel happy path | CL | Each step verified |
| TMS pre-screening form completion rate review | EN | Target: > 80% of TMS-bookings complete the form pre-arrival |

**KPI:** ≥ 20 soft-launch bookings created; 0 KVKK-relevant bugs; UX bug list scoped for T-2.

---

### T-2 weeks — Press, paid, social warm-up

**Goal:** Awareness builds without committing real ad spend until launch day.

| Asset / Task | Owner | Detail |
|---|---|---|
| 4 IG Reels published (1 per week starting now): "TMS nedir?", "Ağrı nasıl başlar?", "Evde EEG mi?", "Konuşmak için 30 dk" | OB → AG | Q&A short-form repurposed from `info.txt` articles |
| Threads + LinkedIn presence created (TR-only at launch) | AG | Cross-post Reels with caption tweaks; pin TMS-explainer thread |
| Google Ads campaign drafts (TR only) for: branded, TMS Istanbul, neural therapy migraine | AG | Budgets locked but campaigns paused until T-0 |
| WhatsApp Business profile finalised (about, address, hours) | CL | `+90 530 087 43 91` canonical |
| Press one-pager (TR + EN) — "TMS pillar opens at AĞRI ve KRONİK HASTALIKLAR KLİNİĞİ" | AG | For local Anadolu yakası health press; no comparative claims |

**KPI:** 4 IG Reels live; ≥ 2k organic IG impressions in week; Google Ads QA = "Ready" but paused.

---

### T-1 week — Cut-over + final QA

**Goal:** DNS swap, monitoring is green, launch comms staged.

| Asset / Task | Owner | Detail |
|---|---|---|
| DNS cut-over `uzmdroguzbak.com` → CF Pages | EN | TTL pre-lowered 48h before; staged at 04:00 IST window; fall-back plan documented |
| Monitor synthetic checks (booking flow, login, contact form) | EN | CF + UptimeRobot fallback |
| Translator returns AR/FR/ES copy; medical-reviewer pass scheduled for T-3 days | AG → OB | Block AR/FR/ES locales from indexing if not approved by T-1 day |
| Launch announcement copy (TR + EN) drafted and queued | AG | Email to existing patient list + IG post + WA broadcast |
| Cloudflare WAF rules tightened: bot scoring on `/auth/login`, idempotency-key required | EN | See Phase 3 — backport rules now if quick |

**KPI:** DNS proven, all green for 24h before launch; synthetic checks < 200ms p95.

---

### T-0 — Launch day

**Goal:** Channels go live in a predictable sequence; team is on-call.

| Time (Europe/Istanbul) | Action | Owner |
|---|---|---|
| 06:00 | Synthetic check; sample booking dry-run on production | EN |
| 08:00 | Public announcement: IG post + Threads + LinkedIn (TR) | AG |
| 09:00 | Email to existing patient list (TR + EN canonical) — KVKK marketing-consent only | CL |
| 10:00 | WhatsApp Business broadcast (TR) — opt-in list only | CL |
| 11:00 | Google Ads campaigns un-pause (TR branded + TMS Istanbul) | AG |
| 14:00 | First check-in: error rate, booking funnel, indexing | EN + AG |
| 18:00 | End-of-day check-in; rollback decision tree | EN |

**Rollback trigger:** > 1% 5xx error rate on `/api/v1/public/*` for > 15min, or any KVKK-implicating bug. Plan: revert DNS to old site (cached A record on standby), patch, retry next day.

---

### T+1 week — Listen + iterate

| Asset / Task | Owner |
|---|---|
| First weekly KPI review against the three Objectives | All |
| Search Console + GA4 first-look; submit any indexing-deferred locales for inclusion | AG |
| Patient feedback synthesis from first-week bookings | CL → OB |
| Bug triage (anything caught from real traffic) | EN |

**KPI:** ≥ 6 first-party bookings; 0 KVKK incidents; brand search volume +50% vs. baseline.

---

### T+2 weeks — Testimonials online, AR/FR/ES out of soft-launch

| Asset / Task | Owner |
|---|---|
| 6 consented testimonials live via `/admin → reviewTestimonial` | CL → OB |
| Medical-reviewer sign-off on AR/FR/ES; remove "auto-translated" banner | AG + OB |
| First retro: what Phase 3 (CI/CD, ops runbook) absolutely needs from week 1 ops experience | All |
| Decide on aesthetic-services Phase-3 micro-site timing | OB |

**KPI:** Trust-signal Objective hit. AR/FR/ES locales fully indexed.

---

## Channel-by-channel summary

| Channel | When live | Owner | First 4-week target |
|---|---|---|---|
| Organic web (5 locales) | T-0 | EN + AG | ≥ 1.2k unique visitors/wk; ≥ 35 booking starts/wk |
| Google Ads (TR) | T-0 | AG | CAC < 250 TRY/booking on TMS keywords |
| Meta Ads (TR retargeting) | T+1 wk | AG | View-through assist on 30%+ of bookings |
| IG (organic) | T-2 wks | OB → AG | 4 Reels/wk steady-state; +5% follower growth |
| Threads / LinkedIn | T-2 wks | AG | TR audience seeding; 2 posts/wk |
| WhatsApp Business | T-0 | CL | Response time < 1 business hour during clinic hours |
| Email (Resend) | T-0 | EN | Transactional only at launch; nurture from T+2 |
| SMS (NetGSM) | T-0 | EN | Transactional only; reminders T-24h + T-1h |
| Patient list email broadcast | T-0 | CL | KVKK marketing-consent only; opt-out link in every send |

## Compliance gates (every send / every page)

Before any public asset goes out, the asset is checked against this list. Any failure blocks publishing.

- [ ] No superlatives, no comparative claims, no fee-listing
- [ ] No "guaranteed result", no "%100 başarı", no "mucize", no "Türkiye'nin en iyisi", no "son teknoloji"
- [ ] Patient-name testimonial → consent record id present in `consent_records` table
- [ ] Before/after image → gated/blurred + consent acknowledgement present
- [ ] Marketing email → recipient is on `consent_records` with purpose `marketing_communications`
- [ ] SMS → NetGSM sender ID İYS-registered; recipient consent
- [ ] AR/FR/ES copy → medical-reviewer signoff on file (or "auto-translated" banner present)

## Owners + on-call

| Role | Person | Backup |
|---|---|---|
| Doctor / clinical sign-off | OB | — |
| Front-desk / patient ops | CL | OB |
| Engineering | EN | — |
| Marketing / copy / paid | AG | OB |

Launch-week on-call rotation: EN primary; AG secondary (copy/SEO bugs); CL for any patient-impacting issue.

## What this plan deliberately doesn't include

- **Aesthetic services** (`/estetik` micro-site) — sub-brand split, Phase 3.
- **Pediatric expansion** (`/cocuk-noroloji`) — content drafted, paid acquisition deferred until two pediatric reviews land.
- **Referral program** — TR medical regulation prohibits incentivized referrals; do not build.
- **Free-tool lead magnet** — proposed `/araclar/migren-gunlugu` is post-launch; not on critical path.
