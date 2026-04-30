# Discovery Report — Uzm. Dr. Oğuz Bak

**Date:** 2026-04-30 (revised same day, Round 2)
**Author:** Discovery phase, pre-Phase-1
**Status:** AWAITING APPROVAL — do not start Phase 1 until signed off
**Sources of evidence:** uzmdroguzbak.com (primary site, returned 403 to direct fetch — Cloudflare-style edge protection), www.doktoroguzbak.com (sister site, accessible), DoktorTakvimi neurology listing (53 reviews, 5★), DoktorTakvimi ozon/nöroloji/mezoterapi listing, DoktorSitesi (39 reviews, 5★ — *the source that surfaced the algology designation and 28-year practice history*), TrDoktor, BulutKlinik, TurkHekimleri, Instagram @uzm_dr_oguzbak, YouTube @uzmdroguzbak (channel page returned only nav/footer), Facebook /uzm.dr.oguzbak (truncated), Turkish-language search corpus.

---

## Round 5 changelog — FAQ, privacy policy, book list, and APPROVAL TO PROCEED

User supplied `faq.txt`, `privacy-policy.txt`, the *Tavsiye Kitap Listesi* (recommended books image), confirmed the doctor's name as **Uzm. Dr. Oğuz Bak**, and **APPROVED** moving to Phase 1. Open questions §12.20–31 are accepted on defaults. Certificate itemisation deferred (no photo available now — placeholder display).

**Material upgrades from Round 5:**

1. **NEW SERVICE — Telehealth (Online) Consultation.** Per FAQ: *"Online consultations are generally conducted via secure video call. You join the consultation by clicking on a link sent via email at the time of your appointment."* This is a major architectural input — booking flow now has two service-delivery modes (in-person + telehealth + home-visit), and we need video-call infrastructure. **Implementation choice:** signed-URL one-time-use Jitsi rooms (open source, GDPR-friendly EU instances, no patient-data leakage to third-party SaaS). E-prescription mention noted but **deferred from launch** — TR e-prescription requires Sağlık Bakanlığı integration which is a separate workstream.

2. **Operational facts now known** (these were §12 unknowns):
   - **Initial examination duration: 30–40 minutes** → default slot length for new-patient booking. Follow-ups can be 15–20 min.
   - **Cancellation policy:** 24h notice preferred → cancellation/reschedule deadline becomes a configurable rule per-service.
   - **Cancellation line:** `+90 850 474 0726` → the DoktorSitesi-listed number is now identified as the **admin / cancellation line**, separate from the front-desk WhatsApp number.
   - **Test result turnaround:** blood 24–72h, EEG/EMG few days → patient-portal "results pending" UX needs sensible expectation-setting.
   - **EEG/EMG/PSG patient-prep instructions** are documented and become canonical micro-content shown on appointment-confirmation screen + ICS attachment + email.
   - **Patient-attendance guidance:** arrive 10–15 min early, bring medication list + prior reports → confirmation email template.
   - **Accessibility statement:** "designed with accessibility standards in mind." Limited parking; public-transport-friendly. Becomes a real Accessibility page (also helps WCAG positioning).

3. **Privacy Policy baseline ingested.** The existing policy is correct in spirit (KVKK-aligned, SSL, no marketing-data sharing, named subject rights) but generic. Phase 1 will deliver an upgraded version: explicit purposes-of-processing per data category, named third-party sub-processors (Cloudflare, Neon, Resend, NetGSM), retention periods, an `aydınlatma metni` separate from the `açık rıza beyanı`, age-of-minors handling for pediatric patients (KVKK has special provisions), KVKK Article 11 DSAR endpoints. The contact for rights remains `info@uzmdroguzbak.com`.

4. **Book list is a brand-voice signal, not a service.** The 14 recommended books (Murphy, Tolle, Louise Hay, Osho, Lipton, Wayne Dyer, Don Miguel Ruiz, Rhonda Byrne, Stefano D'Anna…) are all in the *consciousness / mind-body / personal-development* genre. **Brand implication:** the doctor authentically embraces mind-body framing — this is unusual and ownable. We add a 6th brand pillar to §3:
   > **6. Mind-body integrative ethos.** The doctor explicitly recommends consciousness, subconscious, and self-healing literature alongside biomedical treatment. The clinic treats mindset/stress/intention as legitimate variables in chronic-disease care. *Implementation:* a quietly-positioned "*Önerilen Okumalar*" page on the site with the 14-book list, framed as supportive reading rather than prescriptive doctrine. Voice stays evidence-led — we never claim a book replaces medicine.

5. **Doctor's full name confirmed for masthead and schema:** **`Uzm. Dr. Oğuz Bak`** — exactly that string, no variants. Used verbatim in:
   - HTML `<title>` brand suffix
   - `Physician.name` in `schema.org` JSON-LD
   - Header lockup ("AĞRI ve KRONİK HASTALIKLAR KLİNİĞİ" above, "Uzm. Dr. Oğuz Bak" below)
   - Email "From" friendly-name
   - `<meta property="og:title">` brand suffix

6. **Certificate display strategy (since photo is not available now):** placeholder design that reads *"22 sertifika ile belgelenmiş uzmanlık"* (*"Specialist credentials documented across 22 certificates"*) with a "Detaylar yakında" link. When the photo/list arrives, we swap in the real credential cards. This is honest (we never invent credentials we don't have) and visually complete for launch.

7. **Final approval status.** §12.20–31 → **all defaults accepted**. Phase 1 commencing with the OUTPUT ORDER laid out in the user's spec. No further sign-off required until Phase 1 Drop 1 lands for review.

---

## Round 4 changelog — Instagram screenshots + answers to §12

User supplied 6 screenshots of the live Instagram profile + answers to §12.6, .7, .12, .13, .14, .15, .16, .18, .19. This unlocks the full social audit AND surfaces several services that were absent from every other source.

**Material upgrades from Round 4:**

1. **NEW PILLAR — TMS (Transkranial Manyetik Stimülasyon).** Fully documented across multiple IG posters with explicit clinical detail: 20–30-minute sessions, awake & comfortable, painless, side-effect-free, indications include **depression, anxiety, OCD, bipolar, PTSD, ADHD, Parkinson, Alzheimer, stroke (felç), migraine and tinnitus, epilepsy, neuropathic pain, restless legs syndrome, autism spectrum (otizm)**. **The user has explicitly asked us to feature TMS importance.** TMS becomes a top-3 brand pillar and gets its own dedicated section in the site IA + a marquee TMS landing page per locale.
2. **Clinic brand name surfaced and explicit:** **"AĞRI ve KRONİK HASTALIKLAR KLİNİĞİ"** (*Pain and Chronic Illnesses Clinic*) — used as both IG bio tagline and the central highlight badge. The full brand-mark stack visible on posters is: *AĞRI ve KRONİK HASTALIKLAR KLİNİĞİ / Uzman Dr. Oğuz Bak / Nöroloji / OZON TERAPİSİ • PROLOTERAPİ • AKUPUNKTUR • TMS TEDAVİSİ • DETOX-TAMIR • HİPNOTERAPİ • NÖRAL TERAPİ*. **Brand architecture decision required (new §12.20):** is the clinic name the public umbrella, with "Uzm. Dr. Oğuz Bak" as practitioner-under, or vice versa? Default proposal: clinic name in the masthead lockup, doctor name as the credentialed practitioner.
3. **Four new services** added to canonical taxonomy: **Proloterapi, TMS, Detox-Tamir, Hipnoterapi**. Plus diagnostic: **Genel Kan Tahlilleri panel** (full blood-work panel — Tam Kan, Açlık Şekeri, HbA1c, Lipid, Karaciğer, Böbrek, Tiroid, Elektrolit, Demir, Vitamin, Hormon, Pıhtılaşma, CRP/Sedim, Hepatit B/C, HPV/HIV taraması, Homosistein, Kortizol, Testosteron, Östrojen, hsCRP/IgE/IL-6, Kan/İdrar Kontrolleri, EKG/Kalp & Böbrek US, Check-Up).
4. **15 new conditions/indications** added: Otizm Spektrum Bozukluğu, Tinnitus, Depresyon, Anksiyete Bozuklukları, OKB (Obsesif Kompulsif), Bipolar Bozukluk, PTSD (Travma Sonrası Stres), DEHB (ADHD), Diyabetik Ayak / Gangren / Nekroz (ozone indication), Karaciğer Yağlanması, Kronik Enflamasyon, Ateroskleroz / İnme Riski, Bozucu Alanlar (foci of disturbance — neural-therapy concept covering teeth/scars/sinuses), Donuk Omuz, addiction consultation (uyuşturucu ve alkol bağımlılığı — *kliniğimizden görüş alabilirsiniz* phrasing suggests consultation/referral, not primary treatment).
5. **Geographic positioning surfaced:** IG bio says **"İSTANBUL ANADOLU VE AVRUPA YAKASI"** (Istanbul Anatolian + European sides). This is either (a) marketing language reflecting that home-visit services span both sides from the Kartal base, or (b) a second clinic location. **New §12.21** opened to confirm.
6. **IG audience size confirmed:** 40,900 followers, 5,835 following, 339 posts. Category: *Sağlık/Güzellik* (Health/Beauty — note Beauty signal corroborates the §12.15 sub-brand split decision). Audience size makes Instagram a real channel, not aspirational — 40K followers in this niche is very strong.
7. **Visual content style documented (replaces the inferred §9 Instagram subsection):**
   - High-volume **Canva-style designed posters** with bold display type, color-blocking (yellow, red, blue, green), composited doctor portrait, condition × symptoms × treatment infographic structure.
   - Phone number `0 530 087 43 91` reproduced on every marketing poster — **definitively confirms canonical front-desk number.**
   - **Talking-head Reels** filmed in the doctor's office (warm wood tones, certificate wall, white coat or blue jumper, lavalier mic). Series naming pattern: **"Nedir bu X?"** ("What is X?") covering migren, uyku apnesi, vertigo, D vitamini, karaciğer yağlanması, felç (inme), uyuşturucu ve alkol bağımlılığı.
   - **Auto-generated English subtitles** on many reels — signals the doctor is already targeting an EN-speaking audience, supports our 5-locale plan, and means we should **commission professional EN subtitles** as part of launch (replaces machine subs that occasionally introduce clinical errors). New §12.22.
   - Hashtag clusters observed: `#parkinson #demans #alzheimer #tmstedavisi`; `#donukomuz #ozon #romatizma #nöralterapi`; `#beslenme #sağlıklıbeslenme #ozon #kabızlık #diabet`; `#hpv #hpvaşısı #sigil #ozon`; `#kortizol #kortizon #stres #stresyönetimi`. Hashtag strategy is condition-led (high-volume) plus modality-led (medium-volume) — sound but unvaried; we'll layer in a third tier of long-tail Turkish + Arabic hashtags in Phase 2.
   - 7 highlight reels visible: doctor portrait / blood-test panel / **APNE TESTİ YAPILMAKTADIR** (sleep apnea testing — strong service highlight) / text notes / patient/face icon / blue capsule (medication) / clinic equipment (likely TMS device).
8. **Existing visual identity is brand-template eclectic, not coherent.** The IG posters use a different palette per topic. The clinic logo wordmark is dark green + gold-ish over a forest backdrop. **This corroborates our §5 instinct that a fresh, cohesive design system (Sage Clinical recommended) is needed.** It also gives us a hook: Sage Clinical "*continues the green DNA of the clinic mark, but disciplined into a real palette*" — easy story to tell the doctor.
9. **Answers to §12 (Round 4) — locked decisions:**
   - §12.6 — **WhatsApp = +90 530 087 43 91**, all booking via WhatsApp pre-launch (the new app will offer first-party booking too, but WhatsApp stays as the warm channel).
   - §12.7 — Doctor's languages: **TBD, user will confirm later**. Default to Turkish + clinical English in copy until confirmed.
   - §12.12 — Some social/testimonial assets exist; user will provide.
   - §12.13 — Ship testimonials section with currently-consented set, expand later.
   - §12.14 — Translation budget: no decision yet; we will plan dual-track (human-translated TR + EN; AR/FR/ES launch with high-quality MT + medical-reviewer pass, upgrade to full medical translation post-launch). Re-open at next checkpoint.
   - §12.15 — **Sub-brand split confirmed**: aesthetic services live on a separate `/estetik` micro-site (Phase 3), discreetly cross-linked from main site footer.
   - §12.16 — **Itemise the 22 certificates** and **promote TMS as a flagship treatment** (now reflected in §2 and §6).
   - §12.18 / §12.19 — **Publish in all 5 locales: TR, AR, EN, FR, ES.** Confirmed.
10. **Open questions remaining** (carried forward + new): see updated §12 — items §12.20 (brand architecture), §12.21 (one-or-two clinics), §12.22 (commission EN subtitles), §12.23 (palette confirm), §12.24 (type pairing confirm), §12.25 (booking entry order), §12.26 (hosting region), §12.27 (domain), §12.28 (email/SMS provider), §12.29 (CMS editor model), §12.30 (FB activeness), §12.31 (addiction-medicine scope).

---

## Round 3 changelog — first-party content (info.txt) now in evidence

`C:\Users\tugba\OneDrive\Desktop\drbak\info.txt` provided 5 first-party blog articles from `uzmdroguzbak.com` (Glutatyon, Epilepsi, Ozon, Nöropatik Ağrı, Huzursuz Bacak; English-translated text in the file) **plus the canonical contact block from the live site**. This is the strongest source we now hold — it is the doctor's *own published voice*, not third-party aggregator framing.

**Material upgrades from Round 3:**
1. **Canonical contact resolved** — email `info@uzmdroguzbak.com`, phone `+90 530 087 43 91` (the website-displayed number — almost certainly the front-desk line). The other three numbers (`+90 850 333 0388`, `+90 850 474 07 26`, `+90 536 527 08 61`) reclassified as DoktorTakvimi-routing / DoktorSitesi-listed / mobile until confirmed. **§12.6 narrows from "which of three" to "confirm canonical, identify which (if any) is WhatsApp Business".**
2. **New service: Huzursuz Bacak Sendromu (Restless Legs Syndrome)** — added to §2B/D. Sits at the intersection of neurology + sleep medicine + algoloji.
3. **Confirmed treatment protocols and combinations** — *ozone + glutathione*, *ozone + high-dose vitamin C*, *ozone + Myers cocktail*. Ozone routes: major (IV), IM, intra-articular, ozone bagging. **Myers Cocktail added as a service** (§2A).
4. **Multipass ozone explicitly confirmed for neuropathic pain** — strengthens the multipass/EBOO offering surfaced in Round 2.
5. **Migraine treatment protocol fully specified**: prophylactic + acute medication + Botulinum toxin + ozone/glutathione + neural therapy + lifestyle/diet adjustments. This becomes the canonical "what to expect" content for the migraine landing page.
6. **Epilepsy holistic-protocol layer documented**: medication + neural support + ozone therapy + vitamin/mineral balancing + lifestyle. Notably, the doctor explicitly distinguishes *epilepsy* (recurrent spontaneous seizures) from *a seizure event* — a non-trivial educational distinction we should preserve in copy.
7. **First-party voice samples now usable** — see new evidence subsection in §3. Educational article template + "From Dr. Bak" pull-quote pattern formalised as a content/UI convention.
8. **Address confirmed verbatim**: *"Yalı Mahallesi, Kadir Sokak No:14, Helis More Residence, K:24, D:226, E5 Yan Yol Altgeçit, Kartal/İstanbul"* — note "E5 Yan Yol Altgeçit" detail (useful for directions copy and `LocalBusiness` schema).
9. **Open question added (§12.18)**: are the live blog posts published in Turkish, English, or both? info.txt content is in English, but the audience is primarily TR. If live posts are Turkish-only, the English in info.txt is the doctor's translation/draft and we have an unusually clean bilingual seed corpus.

---

## Round 2 changelog — what changed after adding 4 more sources

After adding `doktortakvimi.com/oguz-bak/ozon-terapi-noroloji-mezoterapi/...`, `doktorsitesi.com/uzm-dr-oguz-bak/noroloji-noroloji-algoloji/...`, `youtube.com/@uzmdroguzbak`, and `facebook.com/uzm.dr.oguzbak`. The first two were rich; YT and FB blocked headless extraction (only nav/footer returned).

**Material upgrades to the report:**
1. **Experience corrected upward** — 28 years (since Dec 1998), not ~20. Neurology residency completed at Başkent in 2005; pre-residency clinical years at Kayseri Asker Hastanesi and Kayseri Kızılay Hastanesi.
2. **ALGOLOJİ (Pain Medicine) is an explicit specialty designation** — DoktorSitesi lists him under "Nöroloji – Algoloji". This is a Turkish *yan dal* and a credential most integrative-medicine competitors do not hold. **Promotes "Pain Management" from a service pillar to a credentialed specialty pillar — meaningful brand and SEO impact.** Updated §3, §6.
3. **22 documented certificates** referenced (titles not itemised in source). Added to §1 — to itemise with you.
4. **Six new services / conditions added** to the canonical taxonomy in §2: carotid ultrasound, Parkinson's, trigeminal neuralgia, vertigo, disc herniations (lumbar + cervical), ketogenic diet consultation, NAD IV serums, multipass ozone (EBOO-style protocol), facial fillers (aesthetic — flagged separately).
5. **New "Aesthetic services" sub-pillar (§2H)** because facial fillers + cosmetic Botox + aesthetic mesotherapy appear in source data but live in a different commercial and regulatory frame than neurology. **Open question §12.15 added** — surface, hide, or sub-brand?
6. **Hospital track record expanded** to include Kayseri Asker Hastanesi, Kayseri Kızılay, Ankara Bilgi Hastanesi, İstanbul Bölge Hastanesi (in addition to the previously known Acıbadem/Medical Park/Yüzyıl/Medivia/Başkent).
7. **Third phone number surfaced** — `+90 850 474 07 26` (likely the muayenehane direct line; the `+90 850 333 0388` number from DoktorTakvimi is likely the booking-platform routing number; the `+90 536 527 08 61` is a mobile). **Open question §12.6** updated.
8. **Four new verbatim review quotes** added to §3 evidence (Parkinson's father, scoliosis 10-min neural-therapy relief, anemia + ozone 3-month protocol, insomnia resolved in 4 sessions).
9. **YouTube + Facebook flagged as blocked sources** in §9 — like Instagram, they need a one-time owner-side share (screenshots or platform-API access).

Nothing in §10 (compliance), §13 (Phase 1 preview), or §14 (sign-off) changed.

> **Methodology note.** Both `uzmdroguzbak.com` and the Instagram profile blocked headless fetches (403 / base64-only HTML) — typical for sites protected by Cloudflare or Meta's anti-scraping. Triangulated identity, services, tone, and reviews from sister site, profile aggregators, and Turkish-language search snippets. Visual-identity items are partly inferred and explicitly flagged below; we will validate every flagged item with you before locking design tokens in Phase 1.

---

## 1. Doctor identity

| Field | Value |
|---|---|
| Full name | Uzm. Dr. Oğuz Bak |
| Clinic brand name | **AĞRI ve KRONİK HASTALIKLAR KLİNİĞİ** *(Pain & Chronic Illnesses Clinic — surfaced from IG branding)* |
| Brand mark stack | *AĞRI ve KRONİK HASTALIKLAR KLİNİĞİ / Uzman Dr. Oğuz Bak / Nöroloji / Ozon Terapisi • Proloterapi • Akupunktur • TMS Tedavisi • Detox-Tamir • Hipnoterapi • Nöral Terapi* |
| Clinical title | Uzman Doktor (Specialist Physician) |
| Primary specialty | Neurology (Nöroloji) |
| Sub-specialty (yan dal) | **Algoloji (Pain Medicine)** — explicitly listed on DoktorSitesi under *Nöroloji – Algoloji*. Significant credential most integrative-medicine competitors lack. |
| Sub-specialty (clinical interest) | Pediatric Neurology (Çocuk Nörolojisi) — children from age 1 |
| Education | Ankara Başkent Üniversitesi Tıp Fakültesi — neurology residency completed 2005 |
| Experience | **28 years of clinical practice (since December 1998)**, including pre-residency hospital years |
| Certifications | 22 documented certificates (titles not itemised in public sources — to itemise with you for credentialing display + schema) |
| Hospital track record | Kayseri Asker Hastanesi, Kayseri Kızılay Hastanesi, Ankara Bilgi Hastanesi, Başkent (Ankara, Konya), Kocaeli Acıbadem, İstanbul Bölge Hastanesi, Çengelköy Medivia Hospital, Gebze Medical Park, Yüzyıl Hastanesi (Pendik) |
| Current practice | **Uzm. Dr. Oğuz Bak Özel Muayenehanesi** — Helis More Residence, Kartal |
| Languages | Turkish (native). English assumed for medical tourism — to confirm. |
| Public reputation | DoktorTakvimi: 53 reviews, 5/5 ★. DoktorSitesi: 39 reviews, 5/5 ★. Recurring patient descriptors: "egosuz" (ego-free), "güleryüzlü" (warm), "alanında uzman" (expert in his field), "hastayı bütüncül değerlendirir" (assesses the patient holistically), "ne kadar profesyonel olduğunu gösteriyor" |

### Clinic / contact

| Field | Value |
|---|---|
| Address (verbatim from site) | Yalı Mahallesi, Kadir Sokak No:14, Helis More Residence, K:24 D:226, **E5 Yan Yol Altgeçit**, Kartal / İstanbul (postal code 34873) |
| Phone — **canonical (site-displayed)** | **+90 530 087 43 91** *(from info.txt — primary front-desk line)* |
| Email — **canonical (site-displayed)** | **info@uzmdroguzbak.com** *(from info.txt)* |
| Phone — DoktorTakvimi-routed | +90 850 333 0388 *(secondary; likely platform routing)* |
| Phone — DoktorSitesi-listed | +90 850 474 07 26 *(secondary; possibly muayenehane reception)* |
| Mobile | +90 536 527 08 61 *(possibly WhatsApp Business — to confirm)* |
| Affiliated hospital | Çengelköy Medivia Hospital — +90 (212) 444 03 73, +90 (216) 308 66 16 |
| Working hours | Not surfaced — to confirm |
| Payment methods | Cash, credit card |
| Online booking today | DoktorTakvimi + DoktorSitesi (third-party); no first-party booking on uzmdroguzbak.com (this is the gap our app closes) |
| Cross-platform presence | YouTube `@uzmdroguzbak`, Instagram `@uzm_dr_oguzbak` *(40,900 followers / 339 posts — Round 4 audit complete)*, Facebook `/uzm.dr.oguzbak` (linked from IG; YouTube + FB extraction still blocked — see §9) |
| Geographic positioning (marketing) | "İstanbul Anadolu ve Avrupa Yakası" — to confirm whether one Kartal location with home-visit reach to the European side, or two physical clinics (§12.21) |

---

## 2. Services catalogue (consolidated from all sources)

Organized by clinical pillar — these become the canonical service taxonomy in the DB.

### A. Integrative Neurology (the core differentiator)
- **Nöral Terapi** (Neural Therapy) — including **at-home injection visits** (rare in this market; differentiator). Includes the *Bozucu Alanlar* concept (foci of disturbance — teeth, scars, sinuses, gut) per IG content.
- **Akupunktur** (Acupuncture)
- **Proloterapi** *(Prolotherapy — surfaced from IG branding lockup. Used for joint/ligament regenerative pain medicine.)*
- **Hipnoterapi** *(Hypnotherapy — surfaced from IG branding lockup; used adjunctively for anxiety, smoking cessation, pain perception)*
- **Detox-Tamir** *(Detox-Repair protocol — surfaced from IG branding lockup; clinic-specific bundling around oxidative-stress reduction and cellular repair)*
- **Ozon Terapisi** (Ozone Therapy) — multi-session protocols (patient quote: "9 seans ozon ve iğne tedavisi"). Strong indication: **diyabetik ayak / gangren / nekroz** (per IG poster).
- **Major Ozon (IV) / Multipass Ozon / EBOO-style protokol** *(routes confirmed in info.txt: IV major, IM, intra-articular, ozone-bagging)*
- **NAD+ IV Serumları** *(cofactor IV therapy)*
- **Glutatyon IV Tedavisi** *(15–20 minute IV infusion; doctor's own articles call it the "master antioxidant"; combined with vitamin C)*
- **Myers Cocktail IV** *(confirmed in info.txt as an explicit protocol combined with ozone)*
- **Yüksek doz Vitamin C IV**
- **Mezoterapi** (Mesotherapy — therapeutic; aesthetic uses tracked separately under §H)
- **Ketojenik Diyet Danışmanlığı** *(clinically tied to refractory epilepsy and migraine evidence)*
- **Fitoterapi / Homeopati / Kinezyoloji** (complementary additions)

### A2. **TMS — Transkranial Manyetik Stimülasyon** (NEW flagship pillar — Round 4)

> *Sessions: 20–30 minutes. Patient awake and comfortable. Painless and side-effect-free.* (Source: clinic IG poster, verbatim translated.)

Indications confirmed in clinic posters:
- **Mood disorders:** Depresyon, Anksiyete bozuklukları, OKB (Obsesif Kompulsif), Bipolar bozukluk, PTSD (Travma sonrası stres bozukluğu)
- **Neurodevelopmental:** DEHB (ADHD), Otizm Spektrum Bozukluğu
- **Neurodegenerative & cerebrovascular:** Parkinson, Alzheimer, İnme (Felç) sonrası
- **Pain & neurological:** Migren ve Tinnitus, Epilepsi, Nöropatik Ağrı, Huzursuz Bacak Sendromu

**Site implication.** TMS deserves a dedicated section in the IA (`/tr/tms-tedavisi`) with sub-pages per indication, video explainers (the doctor already has these), an FAQ, and a separate booking flow that prequalifies patients (TMS has explicit contraindications: certain implants, pregnancy, seizure-disorder risk profiles — these need to be pre-screened in the booking form). **Marketing implication.** TMS is the headline service in our paid-ads strategy because it has high search intent, low Turkish-language competitor saturation outside corporate hospitals, and a clean evidence base for the listed psychiatric indications.

### B. Conventional Neurology
- **Migren tedavisi** (Migraine treatment, incl. botulinum toxin protocol, **TMS**)
- **Parkinson hastalığı tedavi ve takibi** *(explicitly listed)*
- **Epilepsi tanı ve takibi** (Epilepsy management)
- **MS (Multipl Skleroz) tanı, tedavi, takip**
- **İnme hastası takibi** (Post-stroke follow-up)
- **Alzheimer tanı ve takibi**
- **Hareket bozuklukları** (Movement disorders)
- **Ataksi** *(surfaced from DoktorSitesi)*
- **Vertigo / baş dönmesi tedavisi** *(surfaced from DoktorSitesi)*
- **Trigeminal Nevralji tedavisi** *(surfaced from DoktorTakvimi-ozon)*
- **Bel ve boyun fıtığı** (Lumbar / cervical disc herniation — non-surgical pain pathway)
- **Huzursuz Bacak Sendromu** *(Restless Legs Syndrome — first-party article in info.txt; sits at neurology + sleep + algoloji intersection)*
- **Tinnitus** *(Round 4 — TMS indication)*
- **İnme (Felç) sonrası takip ve risk yönetimi** *(stroke follow-up & prevention — IG content includes ateroskleroz/inme riski explainers)*
- **Donuk Omuz** *(Frozen shoulder — IG hashtag/topic; treated with neural therapy + ozone)*
- **Botulinum Toksin Enjeksiyonları** (therapeutic — migraine, dystonia, spasticity)

### B2. Psychiatric & neurodevelopmental indications (TMS-led)
- **Depresyon** *(TMS-treated)*
- **Anksiyete Bozuklukları** *(TMS-treated; complementary hipnoterapi)*
- **OKB — Obsesif Kompulsif Bozukluk** *(TMS-treated)*
- **Bipolar Bozukluk** *(TMS-treated)*
- **PTSD — Travma Sonrası Stres Bozukluğu** *(TMS-treated)*
- **DEHB / ADHD** *(TMS-treated)*
- **Otizm Spektrum Bozukluğu** *(TMS adjunctive — frame carefully; this is high-stakes pediatric content under TR regulation; we will write the Otizm pages with a neurologist-reviewed disclaimer that TMS is supportive, not curative)*
- **Uyuşturucu ve alkol bağımlılığı — konsültasyon** *(addiction consultation — IG post says "kliniğimizden görüş alabilirsiniz"; appears to be consultation/referral track, not primary addiction treatment; **§12.31** to confirm scope)*

### C. Algoloji (Pain Medicine — credentialed sub-specialty, §1)
- **Sinir blokajı** (Nerve blocks — *all pain types* per source)
- **Tetik nokta enjeksiyonu** (Trigger point therapy)
- **Kuru iğneleme** (Dry needling)
- **Nöropatik ağrı yönetimi** (Neuropathic pain)
- **Fibromiyalji yönetimi**
- **Kronik sırt / boyun / ayak ağrısı**
- **Bel-boyun fıtığı kaynaklı ağrı yönetimi**
- **Trigeminal nevralji ağrısı**

### D. Diagnostic & Sleep Medicine
- **EEG** (incl. **evde EEG / home EEG** — differentiator)
- **EMG**
- **Polisomnografi / Uyku testi** (incl. **evde uyku apnesi testi** — differentiator; "APNE TESTİ YAPILMAKTADIR" appears as a dedicated IG highlight)
- **Karotis ultrasonu (Doppler)** *(surfaced from DoktorTakvimi-ozon — vascular-neurology screening, useful for stroke-risk assessment)*
- **Kapsamlı Genel Kan Tahlilleri Paneli** *(Round 4 — comprehensive blood panel offered as a service: Tam Kan, Açlık Şekeri, HbA1c, Lipid Profili, Karaciğer & Böbrek Fonksiyonları, Tiroid (TSH/T3/T4), Elektrolitler, Demir & Vitamin (Ferritin, B12, D), Hormon (Kortizol, Testosteron, Östrojen), Pıhtılaşma (PT/INR/aPTT), Enflamasyon (CRP/Sedim/hsCRP/IgE/IL-6), Homosistein, Lp(a), Hepatit B/C taraması, HPV/HIV taraması, EKG ve Kalp/Böbrek US, Check-Up bundles)*

### E. Regenerative
- **Kök hücre tedavisi** (Stem cell therapy)
- **PRP**

### F. Pediatric Neurology (full sub-specialty practice for children 1+)

### G. Home services (operationally distinct)
- Home consultations
- Home neural therapy injections
- Home EEG
- Home sleep apnea screening

### G3. Telehealth (Online Consultation) *(Round 5 — confirmed in FAQ)*
- **Online video konsültasyon** — secure video call, link sent via email at appointment time
- Suitable for: follow-ups, prescription review, second-opinion consultations, international patients pre-travel
- Not suitable for: first-time TMS evaluation, EEG/EMG interpretation requiring in-person, urgent neurological exam

### G2. Cross-cutting wellness / lifestyle medicine *(content-marketing gold; not standalone services but they recur in IG content, so the site needs blog & rehber pages for them)*
- **Beslenme & sağlıklı beslenme danışmanlığı** (nutrition counselling)
- **Karaciğer Yağlanması** education + treatment (KCY/NAFLD)
- **Kronik Enflamasyon** ("sessiz tehlike" framing in IG)
- **Ateroskleroz ve İnme Riski** prevention
- **Stres yönetimi / kortizol** content cluster
- **D Vitamini** evaluation + IV
- **GDO ve sağlık** content cluster
- **Ekmek / şeker** content cluster (the doctor frames carbohydrate metabolism)

### H. Aesthetic services *(SUB-BRAND SPLIT confirmed in Round 4 — separate `/estetik` micro-site, Phase 3)*
- **Yüz dolguları** (Facial fillers)
- Aesthetic uses of mesotherapy
- Cosmetic Botox
- *(IG bio category "Sağlık/Güzellik" corroborates the existence of an aesthetic patient segment)*

> **Strategic implication update.** Algoloji as a credentialed *yan dal* (rather than just a service category) materially strengthens the pillar narrative: **"a board-certified neurologist who is also a pain-medicine specialist, practising integrative protocols."** That sentence is the brand. We should lead with it on the home page hero and the about page, and use it in Google Ads ad-extensions wherever the policy permits credential mentions.

> **Booking-UX update.** The condition-axis entry now needs to support these high-volume search conditions explicitly: *migren, fibromiyalji, uyku apnesi, Parkinson, MS, vertigo, trigeminal nevralji, bel-boyun fıtığı ağrısı, nöropatik ağrı, çocuklarda nörolojik değerlendirme*. The modality axis stays unchanged.

> **Strategic implication.** The service tree has two natural axes — *condition* (e.g., migraine, fibromyalgia, sleep apnea) and *modality* (e.g., neural therapy, ozone, acupuncture). The booking UI should let the patient enter either way ("I have migraines" → recommended modalities; "I want ozone therapy" → eligible conditions). This is the killer UX difference vs. competitor sites that only list modalities.

---

## 3. Brand attributes — the voice we will codify

Distilled from review verbatims and on-site/IG positioning.

### Brand pillars
1. **Scientific authority** — neurology specialist (Başkent 2005) **with the algoloji (pain medicine) yan dal designation**, 28-year clinical track record across teaching and private hospitals, in-house EEG/EMG/polysomnography/karotis-doppler. *We are not "alternative medicine." We are evidence-led integrative medicine practiced by a board-certified neurologist who is also a pain-medicine specialist.*
2. **Holistic / bütüncül care** — patient is treated as a whole person, not a symptom list. ("hastayı bütüncül değerlendirmesi.")
3. **Warm humility** — the recurring "egosuz / güleryüzlü" descriptor in reviews is rare and ownable. Never arrogant, never salesy.
4. **Continuity** — patients describe years-long relationships. Treatment is iterative; "tedavi süreci" not "tedavi anı".
5. **Accessibility** — home-visit infrastructure signals the doctor will come to you when illness keeps you home. This is a quietly radical positioning.

### Voice-of-customer evidence (verbatim, used to seed copy)

> "ortalama 3 aylık anemi ve ozonterapi gördüm hastaya olan yaklaşımı, doğru tedavi yöntemi hastayı bütüncül değerlendirmesi gerçekten işinde ne kadar profesyonel olduğunu gösteriyor"
> — DoktorTakvimi review, anemia + ozone protocol

> "yaygın vücut ağrılarım vardı uykusuzluk vardı… 10 seans tedavi gördüm… hiç bir şikayetim kalmadı"
> — DoktorTakvimi review, widespread pain + insomnia

> "yoğun sırt ağrım vardı skolyozumdan dolayı… sırtıma nöral terapi uygulaması yaptı ve 10 dk sonra tüm ağrılarım gitti"
> — DoktorTakvimi review, scoliosis-related back pain

> "Babamın Parkinson hastalığı nedeniyle Oğuz Bey ile tedaviye başlattık… her seans sonrası daha da güzel gelişmeler yasadik."
> — DoktorSitesi review, Parkinson's (caregiver perspective)

> "Uzun zamandır devam eden uyku problemimi… nöral terapiyle 4. seansla çok net çözdük."
> — DoktorSitesi review, chronic insomnia

These quotes are the raw material for the testimonials section *if and only if* §10 consent requirements are satisfied. Otherwise we use them only as internal voice-of-customer reference for our own copy — never republish without an *açık rıza beyanı*.

### First-party voice (Round 3, from info.txt — the doctor's own published copy)

The 5 articles supplied (Glutathione, Epilepsy, Ozone, Neuropathic Pain, Restless Legs Syndrome) reveal a stable editorial voice that we should preserve in everything new we publish.

**Recurring structural template** (use as our blog/condition-page CMS template):
1. Definition / "What is X?"
2. Causes
3. Symptoms (where applicable)
4. Diagnosis (with which in-house tests)
5. Treatment goals
6. Treatment methods (medication → interventional → complementary → lifestyle)
7. Combination protocols
8. "From Specialist Dr. Oğuz Bak" — a closing pull-quote in the doctor's own first-person voice
9. Tags

**"From Dr. Bak" pull-quote pattern** is genuinely distinctive — most TR doctor sites have either generic content with no personal voice, or sales-y copy in the doctor's voice throughout. Dr. Bak's pattern is: educational neutral copy *plus* a clearly-labelled doctor's-own-words box at the end. That box is where his voice is most credible. **We make this a first-class component in the design system** — a literal `<DoctorNote>` component that renders distinctively.

**Verbatim voice samples** (from info.txt — these establish the tone we will write in across all locales):

> "When ozone gas comes into contact with a living organism, it is rapidly converted into molecular oxygen and oxygen radicals. This situation, which causes a mild level of oxidative stress in the body, is perceived as a threat by the organism. As a result, enzymes involved in the defense systems, called antioxidants, are stimulated, and the affected area is enriched with oxygen and cleansed of toxins."
> — Dr. Bak, on ozone mechanism. Note: technical-but-readable, no marketing superlatives, mechanism-first explanation.

> "Migraine is a clinical syndrome characterized by persistent headaches lasting from a few hours to several weeks, accompanied by numerous symptoms, and with periods of headache absence between attacks. Genetic factors can play a role in its development."
> — Dr. Bak, on migraine. Note: textbook-clinical opener; we will use this register as a baseline.

> "Although epilepsy and seizures are often used interchangeably, they do not exactly mean the same thing… A single seizure history does not necessarily indicate that a person has epilepsy."
> — Dr. Bak, on epilepsy. Note: corrects a common public misconception — exactly the kind of trust-earning content that ranks in AI Overviews and ChatGPT citations.

> "Treatment must be administered under the supervision of a specialist physician."
> — Dr. Bak, on glutathione. Note: the kind of restraint that is the trust signal. We preserve every such caveat verbatim.

**Editorial conventions to formalise:**
- Mechanism explained before benefits.
- Side effects acknowledged honestly even for "safe" therapies.
- "Holistic" / "individually planned" / "supportive approach" recur — these are stable brand phrases. Style guide must allow them but not let them become noise.
- Lists of indications use plain bullets, not green checkmarks (no marketing-y trust-icons).
- The article ends with a contact / "for more information" block, not a hard CTA. We preserve this for blog content; landing pages add a softer "Randevu için iletişime geçin" footer.

### Voice attributes

| Attribute | Dial position | Why |
|---|---|---|
| Formal ↔ Conversational | 60% formal, 40% conversational | Medical credibility but accessible |
| Clinical ↔ Warm | 50/50 | The whole differentiator is the bridge |
| Authoritative ↔ Humble | 60% authoritative, 40% humble | Specialist confidence without ego |
| Restrained ↔ Marketing-y | 80% restrained | Marketing-y copy will torch the trust signal patients value most |
| Hopeful ↔ Realistic | 60% hopeful, 40% realistic | Promises bound to evidence; no miracle-cure language (also legally required) |

### Words we use
*tedavi süreci, bütüncül değerlendirme, bilimsel, kanıta dayalı, kişiye özel, nöral terapi, ağrıdan arınmak, uyku kalitesi, huzur, kronik şikâyet*

### Words we never use
*mucize, garantili, %100 başarı, Türkiye'nin en iyisi, son teknoloji* (any unprovable superlative — and Turkish health-advertising regulation [Sağlık Bakanlığı Sağlığın Geliştirilmesi Genel Müdürlüğü] specifically bans these in patient-facing media). All superlatives, before/after gallery items, and patient-name testimonials must comply with §29 of the *Tıbbi Deontoloji Tüzüğü* and the 2018 *Sağlık Hizmetlerinde Tanıtım ve Bilgilendirme Faaliyetleri Hakkında Yönetmelik*.

### Language nuance per locale
- **TR (default):** voice as above; honorifics ("siz", "Sayın hasta") in transactional emails, warm "merhaba" + first-name in care notes once relationship is established.
- **AR:** Modern Standard Arabic for static content; Levantine register where relational ("نعتني بكم"). Honor *ostadh* / *doktor* address conventions. Numerals: Eastern Arabic numerals in body, Western numerals in dosing/dates to avoid clinical ambiguity. Never machine-translate — use a medical translator.
- **EN:** Slightly more direct than TR. Audience is medical-tourism savvy, comfortable with clinical detail. Closer to Cleveland Clinic patient-facing copy than to American DTC ad voice.
- **FR:** Vouvoiement throughout. Slight tilt toward thérapeutique terminology familiar to Maghreb francophone audiences (médecine intégrative, thérapie neurale).
- **ES:** Usted form. Lean educational; Spanish-speaking medical tourism is small but high-intent.

---

## 4. Page structure of the current site (and gaps)

| Section | Today | Gap to fix |
|---|---|---|
| Home | Hero, doctor photo, services, testimonials, gallery, contact | Hero CTA goes to phone, not booking. No persona-led entry points. |
| Hakkımızda (About) | Bio, credentials | Sparse — no story, no medical philosophy statement |
| Hizmetlerimiz (Services) | Flat list | No condition-axis navigation; no per-service depth (FAQ, prep, what-to-expect) |
| Testimonials | YouTube embeds + text | No consent provenance visible; no transcript = a11y + SEO miss |
| Gallery | Photos + video | Before/after content visible without consent gate (regulatory risk) |
| Contact | Map, phone | No form, no email, no working hours, no booking |
| Blog / SSS | Minimal | Major SEO miss — described in §6 |
| Languages | TR only | Will add: AR, EN, FR, ES with full RTL for AR |

### Primary CTAs observed
- "Randevu Alın" (Book an Appointment) — currently links to DoktorTakvimi (third-party leak)
- "İletişim kurun" (Get in Touch) — currently goes to phone
- *Gap:* no email-capture, no WhatsApp deep-link, no callback-request, no service-specific lead magnets.

---

## 5. Visual identity — current vs. target

### Current (inferred from sister site doktoroguzbak.com)
- **Color:** generic medical blue on white. Indistinguishable from 1,000 other Turkish doctor sites.
- **Typography:** clean sans-serif, no clear personality choice.
- **Imagery:** doctor headshot + clinical photography + YouTube embeds.
- **Signal:** "competent, generic, forgettable."

### Target (proposal — to ratify with you in Phase 1)

I'll propose three palette directions; we'll pick one. All three avoid the AI-slop "purple-on-white gradient" trap and the generic medical blue.

#### Option A — *Sage Clinical* (recommended default)
- **Primary:** `#2F5D50` (deep clinical sage — rooted, calm, integrative)
- **Surface:** `#F4F1EA` (warm paper, never pure white)
- **Accent:** `#C46A3D` (warm clay — used sparingly on CTAs and section headers)
- **Ink:** `#1A1F1C`
- **Why:** sage is rare in Turkish medical aesthetic — the only competitor in this color zone is high-end functional-medicine clinics. Bridges "scientific" (sage = restraint) and "holistic" (sage = botanical).

#### Option B — *Anatolian Teal*
- **Primary:** `#0E4F58` (deep teal — clinical, trustworthy)
- **Surface:** `#F1EDE6`
- **Accent:** `#D4A24C` (warm gold — heritage, not luxury)
- **Why:** teal is universally trusted in healthcare; the warm gold rather than sterile silver pulls it away from corporate hospital aesthetic toward a personal practice.

#### Option C — *Warm Slate*
- **Primary:** `#3A4A5E` (warm slate)
- **Surface:** `#EFE8DD`
- **Accent:** `#B7572E` (terracotta)
- **Why:** the most editorial / magazine-like. Strongest visual distinction; might feel less "medical" to conservative TR audience — risk.

> **Recommendation: Option A.** It is the only direction that cleanly *visually* embodies the brand pillar of evidence-led integrative care. Final approval needed.

### Typography proposal

We need a pairing that:
- reads as medical-trustworthy (no playful fonts)
- has full Turkish, Arabic, French, and Spanish coverage
- avoids Inter / Roboto / system stacks (per your constraint)
- supports italic and at least 4 weights for editorial hierarchy

**Recommended pairing — Fraunces + Söhne**
- **Fraunces** (display, headlines): Klim Type Foundry adjacent feel; opsz axis lets us size-adjust optically. Has serif gravitas without feeling stuffy. Excellent Turkish coverage; usable Arabic via fallback to **IBM Plex Sans Arabic** (which pairs visually).
- **Söhne** (body): a contemporary grotesque with calm warmth. Replace with **Inter Tight** *only if licensing forbids Söhne for client* — but Söhne is the better choice; we'll budget the license.
- **Mono (for code/dosage/dates in admin):** **JetBrains Mono** (free, excellent rendering).

**Alternative pairing if you want bolder editorial feel: PP Editorial New + GT Walsheim.** PP Editorial has more personality but slightly less clinical gravitas — riskier.

**Arabic-specific:** Body and headlines in Arabic locale will use **IBM Plex Sans Arabic** (open license, multi-weight, designed for editorial hierarchy in Arabic). RTL layout will be a true mirror — the reveal animation, hero pull-quotes, and breadcrumb chevrons all flip; numerals inside dosage/dates stay Western per medical-safety convention.

### Atmospheric direction (anti-flat-white)
- Subtle film-grain layer (3% opacity, blend: overlay) — not visible, only felt.
- Layered radial gradients in the background using the surface + 6% sage tint.
- Single anatomical line-art motif (cervical-spine cross-section, neuron schematic) used as section divider — *not* as a hero centerpiece. Treated like a Penguin Classics line-block, not a medtech illustration.

---

## 6. SEO landscape & content priorities

### Current organic state (inferred)
- Brand-term ranking ("uzm dr oğuz bak") secured by uzmdroguzbak.com and DoktorTakvimi profile.
- High-intent generic terms (e.g., "İstanbul nöral terapi", "ozon terapisi Anadolu yakası", "evde EEG İstanbul") — likely *not* claimed; competitors (Dr. Hüseyin Nazlikul, Dr. Ulviye Güvendi, Dr. Demet Erdoğan) own the integrative-medicine SERP.
- Pediatric-neurology SERP is largely owned by Acıbadem / Memorial / Florence Nightingale corporate sites — not individual physicians.

### Target SEO moats (TR primary)

1. **Condition × geography × modality** (programmatic, hub-and-spoke):
    - `/tr/tedaviler/migren-icin-noral-terapi-istanbul`
    - `/tr/tedaviler/fibromiyalji-icin-ozon-terapisi`
    - `/tr/tedaviler/uyku-apnesi-evde-test-istanbul`
    - `/tr/tedaviler/cocuklarda-noroloji-istanbul-anadolu-yakasi`
    - `/tr/tedaviler/parkinson-takip-istanbul-kartal` *(new — surfaced in Round 2)*
    - `/tr/tedaviler/trigeminal-nevralji-tedavisi-istanbul` *(new — high-intent, low-competition)*
    - `/tr/tedaviler/vertigo-bas-donmesi-noroloji-istanbul` *(new — broad volume)*
    - `/tr/tedaviler/bel-boyun-fitigi-agri-yonetimi-istanbul` *(new — algoloji entry point)*
    - `/tr/tedaviler/karotis-doppler-istanbul` *(new — diagnostic capture)*
    - `/tr/tedaviler/multipass-ozon-eboo-istanbul` *(new — niche but ownable)*
    - `/tr/tedaviler/huzursuz-bacak-sendromu-istanbul` *(Round 3 — already-written first-party content; ship-day publishable)*
    - `/tr/tedaviler/myers-cocktail-iv-istanbul` *(Round 3)*
    - `/tr/tedaviler/glutatyon-iv-istanbul` *(Round 3 — content already drafted)*
    - **TMS family (Round 4 — flagship):**
      - `/tr/tms-tedavisi` (top-level pillar — heavy)
      - `/tr/tms/depresyon-tedavisi`
      - `/tr/tms/anksiyete-tedavisi`
      - `/tr/tms/okb-tedavisi`
      - `/tr/tms/bipolar-bozukluk`
      - `/tr/tms/ptsd-tedavisi`
      - `/tr/tms/dehb-tedavisi`
      - `/tr/tms/parkinson-tedavisinde-tms`
      - `/tr/tms/alzheimer-tedavisinde-tms`
      - `/tr/tms/inme-sonrasi-rehabilitasyon`
      - `/tr/tms/migren-tedavisinde-tms`
      - `/tr/tms/tinnitus-tedavisi`
      - `/tr/tms/epilepside-tms`
      - `/tr/tms/noropatik-agri-tms`
      - `/tr/tms/huzursuz-bacak-sendromu-tms`
      - `/tr/tms/otizm-spektrum-bozuklugunda-tms` *(careful regulatory copy)*
    - **Other Round 4 additions:**
      - `/tr/tedaviler/proloterapi-istanbul`
      - `/tr/tedaviler/hipnoterapi-istanbul`
      - `/tr/tedaviler/detox-tamir-protokol`
      - `/tr/tedaviler/diyabetik-ayak-ozon-tedavisi`
      - `/tr/tedaviler/donuk-omuz-noral-terapi`
      - `/tr/check-up/genel-kan-tahlili-paneli`
2. **Educational pillar pages (the "hub"):**
    - `/tr/rehber/noral-terapi` — what it is, evidence, who it's for, who it isn't, FAQ
    - `/tr/rehber/ozon-terapisi`
    - `/tr/rehber/akupunktur-tibbi`
    - `/tr/rehber/uyku-bozukluklari`
    - `/tr/rehber/kronik-agri`
    - `/tr/rehber/algoloji-nedir` *(new — owns the credentialed-pain-medicine search territory)*
    - `/tr/rehber/ketojenik-diyet-noroloji` *(new — feeds epilepsy + migraine pages)*
    - `/tr/rehber/tms-nedir` *(Round 4 — anchor page for the entire TMS cluster)*
    - `/tr/rehber/proloterapi-nedir`
    - `/tr/rehber/bozucu-alanlar-noral-terapi`
    - `/tr/rehber/karaciger-yaglanmasi`
    - `/tr/rehber/kronik-enflamasyon`
    - `/tr/rehber/ateroskleroz-inme-onleme`
3. **Q&A library** — short-form videos already produced for IG, repackaged with transcripts as standalone SEO pages (massive AEO/GEO win for AI Overviews and ChatGPT citations).
4. **Patient-story long-form** — name-blinded case write-ups (with on-page consent provenance). This is content-marketing gold and 10× the trust signal of generic testimonials.

### Schema.org plan
- `Physician` (top level on home + about)
- `MedicalBusiness` extending `LocalBusiness`
- `MedicalProcedure` per service page
- `MedicalCondition` per condition page
- `FAQPage` per Q&A library entry
- `Article` for blog
- `BreadcrumbList` everywhere
- `Review` aggregated only with pre-publication consent

### International SEO
- Subdirectory locale routing: `/tr/`, `/ar/`, `/en/`, `/fr/`, `/es/`
- Reciprocal hreflang on every page; `x-default` → `/tr/`
- One sitemap per locale, all listed in a sitemap index
- `<html lang dir>` set per locale (`dir="rtl"` only on AR)

---

## 7. Target patient personas (5 — one per locale + 1 home-services)

1. **Mehmet, 45, Kadıköy** — Mid-career professional. 3 years of chronic migraine, has tried triptans + propranolol with diminishing results. Heard about neural therapy from a colleague. Will Google "İstanbul migren nöral terapi" and read 3-4 sites before booking. Cares about: doctor's credentials, evidence base, what a session actually feels like, total cost over a course of treatment.
2. **Ayşe, 52, Bahçelievler** — Fibromyalgia for 8 years. On disability. Skeptical but desperate. Found Dr. Bak through a TikTok / IG short. Will read every testimonial. Cares about: realistic expectations, "is this another scam?", does insurance cover, are sessions painful.
3. **Selma, 38, Üsküdar** — Mother of 6-year-old with a recently-discovered EEG abnormality. Pediatric neurologists have months-long waits at the big hospitals. Cares about: doctor's pediatric experience specifically, can her child be assessed at home, kindness with kids, follow-up continuity.
4. **Khaled, 49, Riyadh (medical tourist)** — Chronic neuropathic pain post-disc-surgery. Speaks Arabic + intermediate English. Researching Istanbul because of family there + lower costs than Saudi private healthcare. Cares about: Arabic-language information, transport from his hotel, package pricing, accommodation guidance, post-treatment continuity remotely.
5. **Nadia, 40, Marseille (Maghreb origin, francophone medical tourist)** — Researching alternative neurology for treatment-resistant migraine. Comfortable in French + some English. Cares about: medical legitimacy (this is the #1 fear in this segment), online reviews from non-Turkish patients, francophone follow-up.
6. **Faruk, 60, Ataşehir** — Sleep apnea suspected by GP, mobility-limited, doesn't want a hospital admission. Daughter is doing the research. Cares about: home EEG / home sleep test exists, how the result gets back to the family doctor, dignity of the visit.

> **Engineering implication.** The booking flow should ask one upfront question that flips the journey: *Are you booking for yourself, a child, or someone else?* This branches form fields, consent flows, and confirmation copy.

---

## 8. Competitor signals

| Competitor | Strength | Gap we exploit |
|---|---|---|
| Dr. Hüseyin Nazlikul (huseyinnazlikul.com) | Most established integrative neurology brand in TR; widely cited | Not a pediatric neurologist; site feels dated; no home services |
| Dr. Demet Erdoğan (akupunktur.gen.tr) | Strong on classical acupuncture | Single modality; no neuro infrastructure (EEG/EMG) |
| Dr. Ulviye Güvendi (drulviyeguvendi.com) | Functional-medicine framing, English-friendly | Not a neurologist by training |
| Dr. Nilgün Eröztürk (drnilgunerozturk.com) | Strong ozone-therapy SEO | Single-modality positioning |
| Big-hospital pediatric neurology (Acıbadem, Memorial) | Brand trust | 4-6 week waits, no integrative offer, no home visit |

**Our defensible white space:** *Specialist neurologist + integrative modalities + pediatric capability + home-services delivery.* No single competitor sits in all four quadrants.

---

## 9. Social audit — three platforms, all blocked headless

All three of the doctor's social platforms returned only platform chrome (footer / nav / image-encoded content) to direct fetches — this is the standard anti-scraping behaviour of Meta and YouTube and is not a problem with our tooling.

### Instagram — @uzm_dr_oguzbak *(Round 4 — full audit from user-supplied screenshots)*

**Account snapshot:**
| Field | Value |
|---|---|
| Display name | DrOGUZBAK |
| Bio (verbatim) | `ağrı/kronik hastalık/ozon/akupunktur/nöral terapi` |
| Tagline (verbatim) | `İSTANBUL ANADOLU VE AVRUPA YAKASI-AĞRI VE KRONİK HASTALIKLAR KLİNİĞİ-ALTERNATİF DOĞAL TEDAVİLER` |
| Category | Sağlık/Güzellik (Health/Beauty) |
| Posts | 339 |
| Followers | **40,900** *(40.9B in TR notation = 40.9 thousand)* |
| Following | 5,835 |
| Linked profiles | Facebook page (Uzm. Dr. Oğuz Bak) + 1 other |
| Phone shown on every poster | `0 530 087 43 91` *(canonical front-desk; confirms info.txt)* |

**Highlight reels (7 visible):**
1. Doctor portrait introduction
2. Blood-test panel explainer
3. **APNE TESTİ YAPILMAKTADIR** — sleep apnea testing service highlight
4. Text-notes / patient FAQ
5. Patient/face icon (likely conditions index)
6. Medication/capsule (treatment overview)
7. Clinic equipment (likely TMS device)

**Content formats and recurring series:**
- **"Nedir bu X?" educational reels** — short talking-head videos with overlay subtitles, filmed in his office (warm wood, certificate wall, blue jumper or white coat, lavalier mic). Confirmed topics: migren, uyku apnesi, vertigo, D vitamini, karaciğer yağlanması, felç (inme), uyuşturucu/alkol bağımlılığı, GDO, ekmek, TMS, mucize cihaz (TMS device).
- **Designed condition posters** — Canva-style infographics following a stable "Belirtiler / Risk Faktörleri / Tedavi Yöntemleri" template. Heavy color blocking (yellow, red, blue, green), composited doctor portrait, clinic phone footer. Topics include: Parkinson, Alzheimer, MS, Otizm, Migren, Tinnitus, Diyabetik Ayak/Gangren, Fibromiyalji, Karaciğer Yağlanması, Kronik Enflamasyon, Ateroskleroz/İnme Riski, Bozucu Alanlar, Donuk Omuz, Mor-Mavi Dil tanı, vb.
- **Service-promo posters** — "AMELİYAT OLDUN AMA HALA AĞRIN VAR MI?" / "TÜM AĞRI KESİCİLERİ KULLANDIM AMA AĞRIM GEÇMİYOR?" / "İLAÇLARI KULLANIYORUZ AMA HASTAM AYNI". These are direct-response *patient-pain-point* hooks — strong template we should mirror in paid-ad creative.
- **Patient-story / testimonial reels** (we'll need to confirm consent before re-using).
- **Doctor explainer reels** — auto-generated EN subtitles visible on many ("How do our chronic diseases occur?", "What is this sleep apnea?", "is it dangerous?", "Sir, we have fatty liver", "Vitamin D is actually a hormone, not a vitamin"). Means he is already targeting EN-speaking viewers — **commission professional EN subs at launch (§12.22).**

**Hashtag clusters observed:**
- Conditions: `#parkinson #demans #alzheimer #tmstedavisi #donukomuz #romatizma #hpv #hpvaşısı #sigil`
- Modalities: `#ozon #nöralterapi`
- Lifestyle: `#beslenme #sağlıklıbeslenme #kabızlık #diabet #kortizol #kortizon #stres #stresyönetimi`

Hashtag strategy is condition-led + modality-led but unvaried; in Phase 2 we'll layer in long-tail Turkish (`#istanbulnoroloji`, `#kartalnoral`, `#evdeeegtest`, `#kronikagrı`, etc.) and Arabic (`#علاج_الألم_اسطنبول`, `#علاج_الصداع_النصفي`, `#علاج_بدون_جراحة`) hashtags for the medical-tourism axis.

**Visual identity in current IG content:**
- The clinic logo wordmark (visible in central highlight): **"AĞRI ve KRONİK HASTALIKLAR KLİNİĞİ / Uzman Dr. Oğuz Bak"** in a stylised dark-green-on-forest background with a gold caduceus motif. Service list runs underneath: *Ozon Terapisi • Proloterapi • Akupunktur • TMS Tedavisi • Detox-Tamir • Hipnoterapi • Nöral Terapi.*
- Per-poster styling is template-eclectic, no coherent brand system — each topic gets its own colour treatment. **This validates the Round-1 design recommendation.** Sage Clinical (Option A) extends naturally from the existing dark-green logo DNA — easy story to tell the doctor: *"we kept your green, we just disciplined it."*
- Direct-response copy in poster headlines is bold sans-serif, large, often in red or yellow — high reach but inconsistent with the warm-clinical positioning we want. New site copy will pull these dials back.

**Strategic implication for Phase 2.**
- IG becomes the primary "rented channel" for the launch (40K followers is a real audience, not aspirational).
- Reel content already exists in volume; we don't have to commission much new — we re-cut existing material with consistent caption styling and proper EN subs.
- Poster posts get rebranded into the new design system over an 8-week migration.
- The "Nedir bu X?" series is a direct content seed for the AI-SEO pillar pages (each reel becomes a transcript-backed educational page on the site).

### YouTube — @uzmdroguzbak (blocked)
- Page title visible: "UZMAN DOKTOR OĞUZ BAK".
- Subscriber count, video count, channel description, recent video titles, playlists — **not retrievable** without auth.
- Strong inference (from IG bio keywords + Turkish doctor-channel norms): channel is the long-form home for Q&A, condition explainers (migren, fibromiyalji, uyku apnesi, ozon nedir), and patient-story features. This will be the spine of the Phase 2 content calendar — Reels and Shorts are repurposed cuts of the long-form material.

### Facebook — /uzm.dr.oguzbak (blocked)
- Page name + Istanbul location confirmed.
- About / followers / post cadence — **not retrievable** without auth.
- Inference: in Turkey, Facebook still has meaningful 45+ reach (a real share of our pain/sleep/Parkinson personas). It is likely a cross-post mirror of IG with minor editorial adjustment, plus longer text posts from the doctor. We will plan it as a tier-2 channel — we publish but don't optimise for it.

### What we need from you to close these
For each platform, **one of the following** is sufficient:
- (a) screenshots: profile + bio + grid of last 12 posts/videos (any platform), *or*
- (b) read-only access via Meta Graph API token (IG + FB) and a YouTube Data API key tied to the channel, *or*
- (c) a 30-min screen-share where we walk the three platforms and I capture what we need.

Without this we will ship the Phase 2 calendar with the structure correct but the post-by-post topics generic. With it, the calendar maps cleanly onto the doctor's existing content cadence and reuses material he has already produced.

---

## 10. Compliance & regulatory baseline (Turkey)

These are non-negotiable inputs into the design:

1. **Tıbbi Deontoloji Tüzüğü §29** + **Sağlık Bakanlığı 2018 Tanıtım Yönetmeliği** — physician advertising restrictions:
   - No comparative claims, no superlatives, no fee-listing on website.
   - "Bilgilendirme" (informational) content is allowed; "tanıtım" (promotional) is restricted.
   - Patient-name testimonials require recorded *Açık Rıza Beyanı* (KVKK explicit consent) and clinical-data redaction.
   - Before/after media must be gated and contextualised; no "guaranteed result" implication.
2. **KVKK (Turkish GDPR)** — every form needs a typed `aydınlatma metni`, an explicit `açık rıza` checkbox for special-category health data, and an audit trail (who consented, when, IP, what version of the text). DSAR endpoints for access/erasure.
3. **EU GDPR** — applies to AR/EN/FR/ES locales for visitors from EU. Cookie consent (TR is more permissive but EU isn't) — we ship a single GDPR-compliant consent UI.
4. **Health data hosting** — patient uploads (lab reports, scans) are special category. Storage region matters. Neon Postgres EU region + R2 with EU jurisdiction binding + signed-URL-only access. No third-party analytics on authenticated routes.
5. **Sağlık Bakanlığı online appointment rules** — first-party booking is permitted; online prescription/diagnosis is not. The booking flow must surface a clear "*This is an appointment request, not medical advice*" disclaimer.

---

## 11. Marketing skills loaded (and which we'll use)

From `C:\Users\tugba\Downloads\suheybindirlenler\marketingskills-main\skills\` — 38 skills present. Prioritised set for this project:

| Skill | Phase 2 use |
|---|---|
| `copywriting` | Per-locale landing-page copy variants (§5 deliverable) |
| `seo-audit` + `schema-markup` + `ai-seo` | SEO plan, Physician/MedicalProcedure/FAQPage schema |
| `programmatic-seo` | Condition × modality × geography matrix pages |
| `site-architecture` | URL structure & locale routing |
| `email-sequence` | Welcome / reminder / post-visit / re-engagement, 5 locales |
| `social-content` | IG Reels content calendar, repurposing of Q&A library |
| `paid-ads` + `ad-creative` | Google Ads TR/AR + Meta retargeting plan |
| `launch-strategy` | 8-week launch plan (ORB framework) |
| `customer-research` | Persona refinement once IG/CRM data accessible |
| `marketing-psychology` | Trust-signal placement, objection handling on landing pages |
| `content-strategy` | Content pillars + editorial calendar |
| `analytics-tracking` | GA4 + server-side events (CF Workers analytics + first-party cookie strategy) |

Out-of-scope (skills not used): cold-email, free-tool-strategy, referral-program (medical regulation prohibits incentivized referrals in TR), pricing-strategy, churn-prevention, paywall-cro, signup-flow-cro, ASO, directory-submissions.

---

## 12. Open questions

Round-4 status: items §12.6, .7, .12, .13, .14, .15, .16, .18, .19 are now resolved or deferred per the user's answers. Remaining open questions (carried + new from Round 4) listed below. Most have defensible defaults — flagged where I'll proceed unless you object.

### Resolved in Round 4
- ✅ §12.6 — WhatsApp number = +90 530 087 43 91; appointments arranged via WhatsApp (plus first-party booking app on launch).
- ⏳ §12.7 — Doctor's languages: deferred. Default: TR + clinical EN until confirmed.
- ✅ §12.12 — Some social/testimonial assets exist; user to provide.
- ✅ §12.13 — Ship testimonials with currently-consented set; expand later.
- ⏳ §12.14 — Translation budget: no decision; planning dual-track (full TR + EN human; AR/FR/ES launch on MT + medical-reviewer pass, upgradable).
- ✅ §12.15 — Aesthetic services = sub-brand split (`/estetik` micro-site, Phase 3).
- ✅ §12.16 — Itemise the 22 certificates (still need the list); promote TMS as flagship pillar (done in §2A2 + §6).
- ✅ §12.18 / §12.19 — Publish in all 5 locales (TR / AR / EN / FR / ES).

1. **Visual direction:** Sage Clinical (Option A) — confirm or pick another. *Default: A.*
2. **Type pairing:** Fraunces + Söhne (with IBM Plex Sans Arabic) — confirm. *Default: yes; if Söhne license is a no, fall back to GT Walsheim.*
3. **Booking entry:** condition-first or modality-first as the default landing? *Default: condition-first* (matches patient mental model).
4. **Prices on site:** show or hide? Turkish regulation prohibits explicit fee-listing. *Default: hide; provide "request quote" in patient portal post-booking.*
5. **Before/after gallery:** ship gated/blurred-by-default with click-through consent acknowledgement, or omit entirely from launch? *Default: gated.*
6. **Doctor's working hours and which non-canonical numbers to surface:** **canonical email + phone resolved in Round 3** (`info@uzmdroguzbak.com`, `+90 530 087 43 91`). Still need: working hours; whether `+90 536 527 08 61` is the WhatsApp Business line; whether the DoktorTakvimi/DoktorSitesi-listed numbers should be hidden on the new site or shown as alternates.
7. **Languages spoken by Dr. Bak personally:** I assume Turkish + clinical English. Confirm? Affects how we frame medical-tourism copy.
8. **CMS-lite editorial control:** does Dr. Bak personally edit content, or is there a clinic admin? Affects role design (admin vs. editor split).
9. **Email/SMS provider:** Resend + Twilio (default) vs. NetGSM (TR-domestic, cheaper SMS to TR numbers) vs. İleti Yönetim Sistemi (mandatory for TR commercial SMS). *Default: Resend for email + İYS-registered SMS sender via NetGSM.*
10. **Domain:** keep `uzmdroguzbak.com` and migrate, or new domain? *Default: keep, redirect old paths.*
11. **Hosting region:** CF Workers run globally; for the Postgres origin I'll default to Neon EU (Frankfurt). Confirm.
12. **IG access:** screenshot of profile + last 12 posts, OR Meta Graph API token. Needed to complete the social content audit and produce the Phase-2 calendar with real data.
13. **Real testimonial corpus + consent forms:** for launch we need at minimum 6 testimonials with signed *açık rıza*. If none exist in pre-recorded form, we ship the testimonials section gated behind a "coming soon" state until consent is collected.
14. **Medical translator budget:** AR + FR + EN + ES content cannot be machine-translated — KVKK + medical-accuracy risk. Per-locale ~5-7k words = budget ~€2-3k for human medical translation. Approve?
15. **Aesthetic services (facial fillers, cosmetic Botox, aesthetic mesotherapy):** these surfaced from DoktorTakvimi-ozon listing. They live in a different commercial frame (premium aesthetic, different patient persona, different ad-policy treatment in Meta and Google) and a different regulatory frame (Sağlık Bakanlığı applies stricter "tanıtım" rules). Three options: **(a) surface as a peer pillar** alongside neurology — risks diluting the credentialed-neurologist-and-algoloji positioning; **(b) hide entirely from launch** — clean, but leaves real revenue on the table and orphans existing aesthetic patients; **(c) sub-brand split** — e.g., a separate `/estetik` micro-site with a different palette and tone, linked discreetly from the main site footer. *Default: (b) for launch — hide from the main site, plan (c) as a Phase 3 add-on once the neurology brand is established.*
16. **22 certificates — itemisation:** DoktorSitesi references 22 documented certificates without listing titles. We need the full list to (a) populate the credentials section, (b) populate `Physician.hasCredential` schema, and (c) decide which subset to display on the home/about page (probably 5–7 most credentialing — too many becomes noise). A scan of certificates or a typed list works.
17. **YouTube channel ownership and content rights:** is the channel maintained by the doctor or an agency? Do we have rights to embed videos on the new site, transcribe them for SEO/AEO, and re-cut Shorts/Reels from them? *Default assumption: rights are with the doctor and we have permission to use freely.*
18. **Live-site language of existing blog posts (info.txt):** the 5 articles in info.txt are in English. Are the live posts on `uzmdroguzbak.com` published in (a) Turkish only — in which case info.txt is a clean English translation we can use as the EN locale seed, (b) English only — surprising for a TR practice, (c) both — in which case we need both originals. This materially affects translation budget (§12.14). Please clarify and, if possible, share the Turkish originals for these 5 articles.
19. **Existing blog inventory:** info.txt contains 5 articles. Are there more on the live site (Botox, vertigo, Parkinson, MS, etc.)? If so, please export them — every existing article is one less piece of content we need to commission, and they all carry the doctor's confirmed voice.

### New questions surfaced in Round 4 (need answers before Phase 1)

20. **Brand architecture — clinic name vs. doctor name in the masthead.** The clinic brand "**AĞRI ve KRONİK HASTALIKLAR KLİNİĞİ**" surfaced in IG. Two options: **(a)** clinic name as the umbrella brand in the header lockup, with "Uzm. Dr. Oğuz Bak — Nöroloji & Algoloji Uzmanı" as the credentialed practitioner under it (more like a real practice — works long-term if the clinic adds a second doctor); **(b)** doctor name as the masthead, clinic name as a subordinate descriptor (more like a personal-brand site — more conversion-friendly today but ceiling on growth). *Default: (a) — future-proofs the brand.* Confirm.

21. **One Kartal location, or two clinics?** IG positioning says *İSTANBUL ANADOLU VE AVRUPA YAKASI*. We have one confirmed address (Helis More Residence, Kartal — Asian side). Is there a second physical location on the European side, or does "Avrupa Yakası" reach through home-visit services only? Affects: schema.org `LocalBusiness` count, the contact page, the sitemap, and Google Business Profile setup.

22. **Commission professional EN subtitles for existing reels?** The doctor already publishes auto-EN-captioned reels. Auto-captions are unreliable for clinical terminology (we saw "multiple coins" instead of "multiple sclerosis" in one screenshot subtitle). For the EN locale + medical-tourism axis, professional subtitle pass on the top ~50 reels is high-leverage. Approve scope (~€800–1,500 for transcription + medical-review for 50 reels)?

23. **Visual direction final pick:** Sage Clinical (Option A) recommended in §5. The existing clinic logo's dark-green-on-forest gives Option A a natural narrative ("we kept your green"). Confirm A, or pick B (Anatolian Teal) / C (Warm Slate).

24. **Type pairing final pick:** Fraunces + Söhne + IBM Plex Sans Arabic (default) vs. PP Editorial New + GT Walsheim (bolder editorial). Confirm.

25. **Booking entry order:** condition-first (default — patient mental model) vs. modality-first (matches current IG service-poster style)?

26. **Hosting region for patient-data origin:** Neon EU (Frankfurt) recommended for KVKK + GDPR. Alternative: Neon AWS Istanbul (lower latency for TR users, but newer and not all features yet). *Default: Frankfurt.* Confirm.

27. **Domain:** keep `uzmdroguzbak.com` and migrate the existing site under it (with 301s for old paths)? Or new domain (e.g., `agriklinigi.com`, `bakklinik.com`) for a clean break? Default: keep — preserves brand SEO.

28. **Email + SMS provider:**
   - Email: **Resend** (default — developer-friendly, EU region available).
   - SMS to TR numbers: **NetGSM via İYS-registered sender** (legally required for TR commercial SMS; cheaper than Twilio for TR delivery).
   - SMS to non-TR numbers: **Twilio** (medical tourism reach).
   - WhatsApp Business API for booking confirmations (since you've designated WhatsApp as the appointment channel): **Meta Cloud API** direct, or **Twilio WhatsApp**? *Default: Meta Cloud API direct — avoids the Twilio markup.*
   Confirm full stack.

29. **CMS / editor model:** does Dr. Bak personally edit content, or is there a clinic admin / agency? Affects roles (admin / editor / doctor / staff) and whether we ship a WYSIWYG markdown editor vs. a structured content form. *Default: assume one admin (clinic) + the doctor has lower-friction author rights.*

30. **Facebook page — active or mirror?** IG-linked FB page exists. Phase 2 effort allocation: (a) auto-mirror IG → FB (zero effort, reaches passive 45+ TR audience), (b) edit-down for FB-native (longer text format), or (c) ignore. *Default: (a).*

31. **Addiction-medicine consultation scope.** IG post says *kliniğimizden görüş alabilirsiniz* on uyuşturucu/alkol bağımlılığı. Is this (a) a full consultation/treatment service, (b) consultation only with onward referral, or (c) just a content topic with informal consult on request? Affects whether it gets a service page, an SEO pillar, or just a blog mention.

---

## 13. What Phase 1 will look like (preview, not commitment)

For your context only — I'll restart the OUTPUT-ORDER list properly once you approve this report.

- **Tech stack rationale doc + ADR-0001** (why Hono/Workers, why Drizzle/Neon, why hexagonal)
- **Folder structure** as a tree + per-folder one-line purpose
- **Domain model** (entities: Doctor, Service, Condition, Slot, Appointment, Patient, Document, Testimonial, ContentEntry; aggregates and invariants noted)
- **DB schema + initial migrations** (Drizzle)
- **Auth/AuthZ design** (JWT short-lived + refresh in KV; Google OAuth state CSRF; role guards; rate limits)
- **OpenAPI spec** for /api/v1
- **Test plan** (unit on domain, Miniflare on adapters, Playwright on e2e + RTL)
- *Then code, in TDD red-green-refactor.*

---

## 14. Sign-off

This report is the contract for Phase 1 — any changes after sign-off cost rework time.

Please reply with one of:
- **"Approved"** + answers to §12 — I'll proceed.
- **"Approved with changes: …"** — I'll incorporate, then proceed.
- **"Hold — reviewing"** — I'll wait.

Sources used in this report:
- [bulutklinik.com/uzm-dr-oguz-bak](https://bulutklinik.com/uzm-dr-oguz-bak)
- [doktoroguzbak.com](https://www.doktoroguzbak.com/)
- [doktortakvimi.com — nöroloji + çocuk nörolojisi listing](https://www.doktortakvimi.com/oguz-bak/noroloji-cocuk-norolojisi/istanbul)
- [doktortakvimi.com — ozon-terapi + nöroloji + mezoterapi listing](https://www.doktortakvimi.com/oguz-bak/ozon-terapi-noroloji-mezoterapi/istanbul) *(Round 2)*
- [doktorsitesi.com — nöroloji + algoloji listing](https://www.doktorsitesi.com/uzm-dr-oguz-bak/noroloji-noroloji-algoloji/istanbul) *(Round 2 — surfaced algology designation, 28-yr history)*
- [trdoktor.com profile](https://www.trdoktor.com/oguz-bak-noroloji-istanbul)
- [turkhekimleri.com profile](https://www.turkhekimleri.com/uzmdroguzbak/noroloji-cocuk-norolojisi/istanbul)
- [tavsiyeediyorum.com profile](https://www.tavsiyeediyorum.com/doktor_16645_oguz_bak.htm)
- [uzmdroguzbak.com/contact-us](https://uzmdroguzbak.com/contact-us/) (referenced; direct fetch blocked 403)
- [uzmdroguzbak.com/category/hizmetlerimiz](https://uzmdroguzbak.com/category/hizmetlerimiz/) (referenced; direct fetch blocked 403)
- [Instagram @uzm_dr_oguzbak](https://www.instagram.com/uzm_dr_oguzbak) *(blocked — anti-scraping)*
- [YouTube @uzmdroguzbak](https://www.youtube.com/@uzmdroguzbak) *(Round 2 — blocked; nav/footer only)*
- [Facebook /uzm.dr.oguzbak](https://www.facebook.com/uzm.dr.oguzbak) *(Round 2 — blocked; truncated)*
- `info.txt` *(Round 3 — first-party content from the live site: 5 blog articles + canonical contact block; strongest source we hold)*
