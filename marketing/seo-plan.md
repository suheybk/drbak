# SEO plan — Dr. Bak

**Anchor doc:** `docs/discovery.md` §6 is the source-of-truth URL map. This file
operationalises it: information architecture, internal-linking matrix, schema
recipe, hreflang strategy, AEO/GEO posture, measurement.

---

## 1. Information architecture

```
Home (/)
├── /services (hub)
│   ├── /services/tms                            ← marquee pillar
│   ├── /services/neurology-consultation
│   ├── /services/home-visit
│   ├── /services/telehealth
│   └── /services/iv-therapy
├── /conditions (hub)
│   ├── /conditions/depresyon                    ← TMS cluster (16 pages)
│   ├── /conditions/anksiyete
│   ├── /conditions/okb
│   ├── /conditions/bipolar
│   ├── /conditions/ptsd
│   ├── /conditions/dehb
│   ├── /conditions/parkinson
│   ├── /conditions/alzheimer
│   ├── /conditions/inme-sonrasi
│   ├── /conditions/migren
│   ├── /conditions/tinnitus
│   ├── /conditions/epilepsi
│   ├── /conditions/noropatik-agri
│   ├── /conditions/huzursuz-bacak
│   ├── /conditions/otizm-spektrum
│   ├── /conditions/fibromyalji                  ← outside TMS but neighboring
│   ├── /conditions/uyku-apnesi
│   └── /conditions/vertigo
├── /blog
│   ├── /blog/glutatyon-iv                       ← drafted in info.txt
│   ├── /blog/epilepsi-vs-nobet
│   ├── /blog/ozon-mekanizma
│   ├── /blog/noropatik-agri-tedavi
│   ├── /blog/huzursuz-bacak-sendromu
│   └── …                                        ← see content-calendar.csv
├── /about
├── /contact
├── /faq
├── /kvkk
├── /accessibility
└── /book                                        ← noindex
    /account                                     ← noindex
```

Locale prefix: TR unprefixed; AR/EN/FR/ES at `/<locale>/...`. Localised URL
slugs (e.g. `/hizmetler` for TR) are deferred — see `dr-bak-resume-here.md`
caveats. Reciprocal `<link rel="alternate" hreflang>` already wired in
`apps/web/src/layouts/BaseLayout.astro`.

## 2. The TMS pillar — hub-and-spoke detail

The TMS cluster is the single biggest organic bet (`docs/discovery.md` §6
Round 4). Topology:

- **Hub:** `/services/tms` — long-form pillar (~3,500 words TR, ~3,000 EN).
  Renders all 16 condition leaves as a related-content rail; takes inbound
  links from every condition page.
- **Educational anchor:** `/blog/tms-nedir` — informational explainer, links
  upward to the service hub. This is the AEO/GEO anchor for "what is TMS"
  type queries.
- **Spokes (16 condition pages):** each follows the same template — see §3.
  Each spoke has exactly two outbound contextual links: one to `/services/tms`
  ("kimler için uygundur" → service hub), one to its sibling condition
  ("X için TMS aynı zamanda Y'yi de…").

```
                    /blog/tms-nedir
                          |
                          v
                     /services/tms
                    /     |       \
                   v      v        v
       /conditions/depresyon … /conditions/migren … (×16)
                   ↑      ↕        ↑
                   └── reciprocal sibling links ──┘
```

The 16 cluster URLs (TR slugs, mirrored at `/{locale}/conditions/<slug>` for
AR/EN/FR/ES):

| # | TR slug | Primary KW (TR) | Volume tier* |
|---|---|---|---|
| 1 | `/conditions/depresyon` | tms depresyon tedavisi | High |
| 2 | `/conditions/anksiyete` | tms anksiyete | High |
| 3 | `/conditions/okb` | tms okb tedavisi | Med |
| 4 | `/conditions/bipolar` | tms bipolar bozukluk | Low-Med |
| 5 | `/conditions/ptsd` | tms travma sonrası stres | Low |
| 6 | `/conditions/dehb` | tms dehb yetişkin | Med |
| 7 | `/conditions/parkinson` | tms parkinson tedavisi | Med |
| 8 | `/conditions/alzheimer` | tms alzheimer | Low-Med |
| 9 | `/conditions/inme-sonrasi` | inme sonrası rehabilitasyon tms | Low |
| 10 | `/conditions/migren` | migren tedavisi tms | High |
| 11 | `/conditions/tinnitus` | tinnitus tms tedavisi | Med |
| 12 | `/conditions/epilepsi` | epilepside tms | Low |
| 13 | `/conditions/noropatik-agri` | nöropatik ağrı tms | Med |
| 14 | `/conditions/huzursuz-bacak` | huzursuz bacak tms | Low-Med |
| 15 | `/conditions/otizm-spektrum` | otizmde tms tedavisi | Low (regulatory caution) |
| 16 | `/conditions/fibromyalji` | fibromiyalji tms | Med |

\* Tier = qualitative based on Round 2/4 SERP scan; refresh with Search Console
once the property is verified.

## 3. Page templates (the editorial contract)

### Service detail (`/services/<slug>`)

```
1. Hero            — H1 + 1-sentence lead
2. What is X?      — mechanism-first explanation (info.txt template)
3. Who it's for    — indications list; never "everyone"
4. Who it isn't for — contraindications/caveats (this is the trust signal)
5. What a session feels like — concrete sensory description
6. Pre-visit prep + after-care
7. Evidence summary — 2-3 references; "we do not use the words 'mucize/garantili'"
8. <DoctorNote>    — first-party voice closing block (see info.txt §3 template)
9. Related conditions — 6 cards from the cluster
10. Booking CTA    — soft, "Randevu için iletişime geçin"
```

### Condition detail (`/conditions/<slug>`)

```
1. Hero            — H1 + 1-sentence lead
2. Tanım — what the condition is, in patient-language
3. Belirtiler — symptoms, plain bullets
4. Tanı süreci — diagnostic workflow (point to in-house EEG/EMG/etc.)
5. Tedavi yaklaşımımız — treatment approach (medication → interventional → complementary → lifestyle)
6. Bu durumda TMS — TMS-specific section (only for TMS-cluster pages)
7. <DoctorNote>    — first-party voice closing block
8. SSS — 4–6 question entries (each generates `Question` JSON-LD inside `MedicalCondition`)
9. İlgili hizmetler — 3 cards
10. Booking CTA
```

### Blog (`/blog/<slug>`)

```
1. Title + meta
2. Lead paragraph
3. Body (info.txt template: definition → causes → symptoms → diagnosis → treatment goals → methods → combination protocols)
4. <DoctorNote>    — first-party voice closing block
5. Tags + related conditions/services
```

## 4. Schema recipe (JSON-LD)

| Page type | Schemas emitted | Notes |
|---|---|---|
| `/` | `Physician` + `MedicalBusiness` (extends `LocalBusiness`) | One block each; do not duplicate `name` on both |
| `/services/<slug>` | `MedicalProcedure` + `BreadcrumbList` | `MedicalProcedure.relevantSpecialty` = `Neurology` or `PainMedicine`; `MedicalProcedure.howPerformed` = procedure description |
| `/conditions/<slug>` | `MedicalCondition` + `FAQPage` (the on-page FAQ block) + `BreadcrumbList` | Cross-link the `MedicalCondition` to associated `MedicalProcedure` via `possibleTreatment` |
| `/blog/<slug>` | `Article` + `BreadcrumbList` | `author` is always `Physician` (Dr. Oğuz Bak), `mainEntityOfPage` is the page URL |
| `/about` | `Physician` (full) + `BreadcrumbList` | Includes `medicalSpecialty`, `worksFor`, `alumniOf`, `award`, etc. |
| `/contact` | `LocalBusiness` + `BreadcrumbList` | Hours go here once known |
| `/faq` | `FAQPage` (whole-page) + `BreadcrumbList` | One `Question`/`Answer` per FAQ entry |

The `apps/api` already emits `schemaJsonLd` per `content_entry`. The web app
just renders it inside `<script type="application/ld+json">`. Reviewable
schema templates live in `marketing/seo-plan.md` (this file) for AG to seed
into the CMS.

### Schema templates

**Physician** (home + about):
```json
{
  "@context": "https://schema.org",
  "@type": "Physician",
  "@id": "https://uzmdroguzbak.com/#physician",
  "name": "Uzm. Dr. Oğuz Bak",
  "alternateName": "Dr. Oğuz Bak",
  "medicalSpecialty": ["Neurology", "PainMedicine"],
  "honorificPrefix": "Uzm. Dr.",
  "alumniOf": { "@type": "EducationalOrganization", "name": "Başkent Üniversitesi Tıp Fakültesi" },
  "worksFor": {
    "@type": "MedicalClinic",
    "name": "AĞRI ve KRONİK HASTALIKLAR KLİNİĞİ",
    "address": { "@type": "PostalAddress", "addressLocality": "Kartal", "addressRegion": "İstanbul", "addressCountry": "TR" }
  },
  "url": "https://uzmdroguzbak.com",
  "telephone": "+905300874391",
  "email": "info@uzmdroguzbak.com",
  "sameAs": [
    "https://www.instagram.com/uzmdroguzbak/",
    "https://www.doktortakvimi.com/oguz-bak/noroloji",
    "https://www.doktorsitesi.com/uzman/dr-oguz-bak"
  ]
}
```

**MedicalProcedure** (TMS service page):
```json
{
  "@context": "https://schema.org",
  "@type": "MedicalProcedure",
  "name": "Transkranial Manyetik Stimülasyon (TMS)",
  "alternateName": "TMS",
  "procedureType": "https://schema.org/TherapeuticProcedure",
  "bodyLocation": "Brain",
  "howPerformed": "Non-invasive magnetic pulses are delivered to specific cortical regions through a coil placed against the scalp. Each session lasts 20–40 minutes; a typical course is 4–6 weeks at 5 sessions per week.",
  "preparation": "No fasting required. Bring current medication list. Pre-screening form completed in advance.",
  "performedBy": { "@id": "https://uzmdroguzbak.com/#physician" },
  "relevantSpecialty": ["Neurology"]
}
```

**MedicalCondition** (TMS-cluster condition page):
```json
{
  "@context": "https://schema.org",
  "@type": "MedicalCondition",
  "name": "Tedaviye Dirençli Depresyon",
  "alternateName": ["Treatment-Resistant Depression"],
  "possibleTreatment": [
    { "@type": "MedicalProcedure", "name": "Transkranial Manyetik Stimülasyon (TMS)", "url": "https://uzmdroguzbak.com/services/tms" },
    { "@type": "MedicalProcedure", "name": "İlaç Tedavisi" }
  ],
  "associatedAnatomy": { "@type": "AnatomicalStructure", "name": "Brain" }
}
```

**FAQPage** (always emitted alongside `MedicalCondition` if the page renders an FAQ block):
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "TMS ağrılı mıdır?", "acceptedAnswer": { "@type": "Answer", "text": "TMS uygulaması ağrılı değildir. Bazı hastalar baş derisinde hafif bir karıncalanma hissedebilir." } }
  ]
}
```

## 5. Internal linking matrix

Treat outbound links as a budget; **every page gets at most 8 contextual
internal links** (excluding nav and footer). Algorithm for linking:

1. Service detail → 6 most-relevant conditions (the TMS service links to all
   16 cluster conditions only as a related-rail; contextual outbound is 6).
2. Condition detail → its primary service + 2 sibling conditions + 1 blog
   educational anchor + 1 FAQ entry.
3. Blog post → 2 conditions + 1 service (with intent match) + 1 sibling blog.
4. Home → top 5 services + the TMS pillar (already in nav).

Anchor-text rules:
- Use natural Turkish phrasing — *not* "click here", *not* exact-match keyword
  stuffing. ("Migren ile ilgili ayrıntılı bilgi" > "migren tedavisi")
- Links to the booking CTA always read soft: *"Randevu için iletişime
  geçin"*. Never *"Hemen randevu al"* (too aggressive for the brand voice).

## 6. Hreflang strategy

```html
<link rel="alternate" hreflang="tr" href="https://uzmdroguzbak.com/services/tms" />
<link rel="alternate" hreflang="ar" href="https://uzmdroguzbak.com/ar/services/tms" />
<link rel="alternate" hreflang="en" href="https://uzmdroguzbak.com/en/services/tms" />
<link rel="alternate" hreflang="fr" href="https://uzmdroguzbak.com/fr/services/tms" />
<link rel="alternate" hreflang="es" href="https://uzmdroguzbak.com/es/services/tms" />
<link rel="alternate" hreflang="x-default" href="https://uzmdroguzbak.com/services/tms" />
```

- Reciprocity is enforced — every locale lists every other locale.
- Untranslated pages set `hreflang` *only* for languages that have content.
  Until translator review lands, AR/FR/ES pages with the auto-translated
  banner ship `noindex` for those locales.

## 7. AEO / GEO (AI Overviews + ChatGPT)

The Q&A library + `<DoctorNote>` first-party voice are the two structural
choices that maximise AI-citability. Tactics:

1. **One-question pages.** Every IG Reel becomes a `/blog/<slug>` page where
   the H1 is the question verbatim, the body is the transcript, and the
   schema is `FAQPage`. Title format: `<Question> — Uzm. Dr. Oğuz Bak`.
2. **Authoritative entities.** The `Physician` schema is wired with `sameAs`
   to DoktorTakvimi, DoktorSitesi, IG, Threads — entity-graph signal for AI
   crawlers.
3. **Sourced claims.** Numbered medical claims close-cite (`*Cohen et al.,
   2019*` etc.) so an LLM has an attribution surface even if the user cuts
   the quote. `info.txt` already has this pattern.
4. **First-party voice.** The `<DoctorNote>` block uses the doctor's verbatim
   text. AI Overviews disproportionately surface practitioner-voiced answers
   over generic content. We earn this with the structural pattern, not with
   schema-only signals.
5. **Robots.txt accommodates AI crawlers** — `GPTBot`, `ChatGPT-User`,
   `PerplexityBot`, `ClaudeBot`, `Google-Extended` are all `Allow:` for the
   public site. Keep them out of `/account` and `/book`.

## 8. Measurement

| What | How | Cadence |
|---|---|---|
| Organic landings | GA4 `source/medium=google/organic` | Weekly |
| Indexing health | Search Console "Pages" report (5 verified properties or hreflang cluster) | Weekly |
| Core Web Vitals | Search Console + Lighthouse CI (target ≥ 95 on every locale home + service hub) | Weekly |
| Booking funnel — top of funnel | GA4 `event=booking_started` from `/book` | Daily for first 4 weeks |
| Booking funnel — conversion | GA4 `event=booking_completed` (server-side from API) | Daily for first 4 weeks |
| Brand search volume | Search Console queries containing `oğuz bak` | Weekly |
| AI-citation pulses | Manual probes monthly: "Istanbul'da TMS doktoru", "treatment-resistant depression Istanbul", etc. | Monthly |

## 9. Programmatic SEO matrix (Phase 3 candidate)

The condition × modality × geography matrix from §6 is *not* on the launch
critical path — programmatic SEO done badly is worse than no programmatic
SEO. Instead:

- **Phase 2** ships hand-written canonical TR + EN for the 16-page TMS
  cluster, plus 5 service pages. Total ≈ 21 first-class pages.
- **Phase 3** evaluates auto-generation of the larger ~80-URL matrix from
  Search Console signal (only after the 21 first-class pages are ranking).

## 10. Robots.txt + sitemap

```txt
User-agent: *
Allow: /
Disallow: /account
Disallow: /book
Disallow: /verify-email
Disallow: /reset-password
Disallow: /*/account
Disallow: /*/book
Disallow: /*/verify-email
Disallow: /*/reset-password

# Permit AI crawlers explicitly (mirror of User-agent: * for clarity)
User-agent: GPTBot
Allow: /
Disallow: /account
Disallow: /book

User-agent: ChatGPT-User
Allow: /
Disallow: /account
Disallow: /book

User-agent: PerplexityBot
Allow: /
Disallow: /account
Disallow: /book

User-agent: ClaudeBot
Allow: /
Disallow: /account
Disallow: /book

Sitemap: https://uzmdroguzbak.com/sitemap.xml
```

Sitemap index emits five locale-specific sitemaps, each linking only to URLs
that have published content (the `apps/api` `/public/content` endpoint
filters `status='published'`).

## 11. Open SEO decisions to close before launch

1. **Localised URL slugs** — defer to Phase 3 *unless* the Turkish slug
   variant outperforms the English slug variant in soft-launch testing
   (e.g. `/hizmetler/tms` vs `/services/tms`). Decision deadline: T-2 weeks.
2. **City-page strategy** — `…-istanbul-anadolu-yakasi` URL pattern from
   §6.1 is geo-paired. Test by shipping 3 of the §6.1 URLs in TR first; if
   any rank top-20 within 6 weeks, expand the pattern.
3. **Hreflang vs locale-cookie** — Astro's i18n with `prefixDefaultLocale:
   false` means TR is unprefixed. Search Console will treat `/` and `/tr/`
   as duplicates if we ever ship `/tr/`. Decision: never expose `/tr/`.
   Default locale stays unprefixed.

## 12. What this plan deliberately doesn't include

- **Backlink campaigns / outreach** — soft sniff for Phase 3. Trust signals
  for medical SEO matter more than raw link volume; we earn links by being
  citable rather than by asking.
- **Press-release SEO** — banned superlative-laden press releases would be
  Sağlık Bakanlığı non-compliance. Health press one-pager (T-2 weeks) is
  factual, not promotional.
- **Schema bloat** — only the schemas in §4 are emitted at launch. Adding
  `Review`, `AggregateRating`, etc., only after sufficient consented
  testimonials exist to back them.
