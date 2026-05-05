# Compliance & Clinical Safety Checklist — Dr. Oğuz Bak

This document captures everything the clinic owner must do, sign, post, or change in clinical practice to launch the platform legally in Turkey and reduce the highest-severity risks. All cited deadlines and fine ceilings are current as of May 2026.

A Turkish-language printable version of this checklist lives at `docs/compliance/CHECKLIST-DOCTOR-TR.md` and the printable PDF at `docs/compliance/dr-bak-uyum-listesi.pdf`.

---

## Top 10 — most critical items at launch

Ordered by the magnitude of legal, clinical, and reputational damage if missed.

1. **Get the Uzaktan Sağlık Faaliyet İzin Belgesi from İl Sağlık Müdürlüğü before telehealth launches.** Without it, every telehealth session is illegal practice; the Ministry can shut down the service and refer to the Cumhuriyet Savcılığı. Plan ≥30 days for the application.
2. **Set up a 72-hour breach response process — and test it.** The 2026 KVKK fine ceiling is **TRY 17,092,242 per violation**; GDPR adds a parallel ceiling of **€20M or 4% of global turnover, whichever is higher**. When EU residents are affected, you must notify both the Kurul AND a competent EU DPA within the same 72 hours. Late notifications are the most common finding under both regimes.
3. **Register with VERBİS within 30 days** of first patient record, and name an irtibat kişisi (contact person). The 2025/1572 carve-out only exempts micro-clinics with <10 employees AND <TRY 10M balance sheet. **Separately, appoint a GDPR Art.27 EU representative** as soon as you accept a paid EU booking — see §B9.1.
4. **Pin all patient data to EU/Frankfurt; sign Standart Sözleşme** with each cross-border vendor and **file with KVKK within 5 working days** of signing. The pre-2024 "explicit consent for transfer" pathway is no longer valid for routine flows. EU residents' data flowing to Frankfurt is intra-EEA so GDPR Chapter V is satisfied; the Turkey leg (you accessing the data from Istanbul) is what KVKK md.9 governs.
5. **Granular separated consents** — never bundled. One row per purpose (treatment / telehealth / cross-border / marketing). Bundled consent is automatically invalid; the burden of proof is on the clinic.
6. **Adopt the Joint Commission + ISMP "Do Not Use" abbreviation list** across every channel — paper, e-Reçete free-text, WhatsApp, discharge notes. A single insulin "U → 0" or trailing-zero overdose carries TCK md.85 (taksirle yaralama / öldürme) criminal liability.
7. **20-year retention for medical records** including telehealth notes, with an automated destruction pipeline for everything outside that scope.
8. **Telehealth informed-consent text must be the verbatim Yönetmelik md.7 disclosures**, in the patient's language, with a non-skippable modal and e-signature.
9. **30-day / 1-month response window** for KVKK md.11 AND GDPR Art.15–22 patient requests. Set up a tracked intake address (`kvkk@drbak.com`) and a default response template. EU residents have two extra rights KVKK does not give — **data portability (Art.20)** and **restriction (Art.18)** — both must be honored. Late or no-response is itself a finable violation under both regimes.
10. **Append-only audit logs** of every read/write to özel-nitelikli (special-category) data, retained 10+ years, with a quarterly access review you sign personally.

---

## B1. Things you must do once, before launch

### B1.1 — Register with VERBİS

You are obliged to register unless you simultaneously meet all three: <10 employees, <TRY 10M balance sheet, and processing health data is not your main activity. As a private psychiatry/TMS practice, processing health data IS your main activity, so registration is required regardless of size.

- Deadline: 30 days after first patient record on the platform.
- Where: https://verbis.kvkk.gov.tr
- Who: yourself, OR an irtibat kişisi you designate.

### B1.2 — Name an İrtibat Kişisi (KVKK contact person)

For a sole-physician clinic this can be you. Different from a GDPR-style DPO; KVKK does not require a formal DPO at clinic scale, but you MUST name a contact in VERBİS.

### B1.3 — Apply for Uzaktan Sağlık Faaliyet İzin Belgesi

You cannot do telehealth without it. Required documents:

- Existing clinic operating licence
- The USBS (Uzaktan Sağlık Bilgi Sistemi) you will integrate with — must already be in the Ministry registry
- Yönetmelik Annex-1 forms

Apply to: İstanbul İl Sağlık Müdürlüğü.
Decision: ≤15 business days.
Source: Resmi Gazete 10.02.2022/31746, [Uzaktan Sağlık Yönetmeliği md.6](https://www.resmigazete.gov.tr/eskiler/2022/02/20220210-2.htm).

### B1.4 — Sign Veri İşleyen Sözleşmeleri (data processor agreements)

Required with every party that handles patient data:
- The development team
- Cloudflare (hosting + Workers + R2 storage + Stream video)
- Neon (Postgres database, Frankfurt)
- Meta (WhatsApp Business API)
- iyzico (payment processor)
- Resend (email sender)
- NetGSM / Twilio (SMS)
- Jitsi (telehealth video)
- Any error tracking or analytics vendor

Keep originals. The Kurul will ask for them in any audit.

### B1.5 — Post the Aydınlatma Metni (privacy notice)

Two versions required:
- **Physical waiting-room poster** in Turkish
- **Web/app version** in TR/AR/EN/FR/ES

Mandatory content (KVKK Aydınlatma Yükümlülüğü Tebliği):
- Data categories collected
- Purposes of processing
- Legal bases (KVKK md.5/2 + md.6)
- Recipients (vendors, public authorities)
- Cross-border transfer destinations
- Retention periods
- Your contact info
- The patient's md.11 rights, in plain language

### B1.6 — Adopt and date-sign these written policies

Required by the Kurul; they will demand to see them in audits:
1. **Kişisel Veri Saklama ve İmha Politikası** (mandatory if VERBİS-registered)
2. **Özel Nitelikli Kişisel Veri Politikası** (Karar 2018/10 zorunluluğu)
3. **Erişim Yetki Matrisi** (who can see what)
4. **Veri İhlali Müdahale Planı** (incident response plan)
5. **Çalışan Gizlilik Taahhütnamesi** (signed by every staff member)

---

## B2. Consent forms you must collect — separately, never bundled

### B2.1 — Tedavi Onamı (treatment consent)

The standard informed-consent for psychiatric treatment / TMS. Already routine for you; ensure it explicitly cites KVKK md.6 and Kişisel Sağlık Verileri Yönetmeliği md.5.

### B2.2 — Telesağlık Onamı (telehealth consent)

Must include — verbatim — the disclosures required by Uzaktan Sağlık Yönetmeliği md.7:
- Provider's identity and specialty
- Patient is not in the same physical room as the provider
- Telehealth is NOT equivalent to in-person care
- Telehealth is NOT a substitute for ongoing physical treatments
- For emergencies the patient must call **112**
- Fee and insurance status
- **Recording is prohibited without per-session express consent**

Patient must e-sign before each first telehealth episode. The text must be in the patient's language.

### B2.3 — Yurtdışı Aktarım Bilgilendirmesi (cross-border transfer disclosure)

Informs the patient that the platform is hosted in Germany under Standart Sözleşme.

After June 2024 KVKK changes, this is *information*, not standalone legal basis — your real legal basis is the Standart Sözleşme you sign with each EU vendor (B1.4).

### B2.4 — Pazarlama Açık Rızası (marketing consent)

Only if you ever send marketing SMS or e-mail. Default OFF. Without explicit opt-in, do NOT include any marketing content in any reminder or follow-up.

### B2.5 — TMS-specific contraindication checklist

Co-locate with the consent bundle so it is signed in one go: epilepsy history, ferromagnetic implants, pregnancy considerations, current medications, prior brain surgery.

---

## B3. Patient request handling (KVKK md.11)

When a patient asks — in writing (physical, e-mail, or platform contact form) — for any of:
- Confirmation that data is processed
- Purposes of processing
- Recipients of the data
- Correction of inaccurate data
- Deletion of the data
- Information on cross-border transfers

You MUST respond within **30 days**, free of charge.

- If you cannot delete (because retention obligation applies — e.g., 20-year medical record), reply with the article that blocks deletion AND the date you can delete by.
- Late or unsatisfactory response → patient may file a complaint with the Kurul. Late response is itself a finable violation.
- Set up a single intake address (`kvkk@drbak.com`) and route every request to a tracked queue.

Source: KVKK md.13 + İlgili Kişi Başvuru Tebliği.

---

## B4. Records you must keep — and for how long

| Record type | Retention | Source |
|---|---|---|
| Hasta dosyası (medical record, telehealth notes, prescriptions, test results, TMS protocol parameters) | **20 years** from last contact (minors: until age 18 + 20 years) | Hasta Hakları Yönetmeliği |
| Aydınlatılmış onam belgeleri | 20 years, with the medical record | KVKK + Hasta Hakları |
| Audit logs (who accessed what record) | 10 years minimum | Kurul Karar 2018/10 |
| İmha tutanakları (destruction records) | Permanent | İmha Yönetmeliği |
| Reçete (electronic prescriptions) | Handled by e-Reçete; you do not retain paper | Sağlık Bakanlığı |
| Receipts / invoices | 10 years | VUK + TTK md.82 |
| Marketing-consent record | Until withdrawn + 3 years | KVKK Açık Rıza Rehberi |
| WhatsApp / chatbot messages with health complaints | Treat as health data — 20 years | Kişisel Sağlık Verileri Yönetmeliği |

Always keep the **specific version** of every Aydınlatma Metni and consent form the patient saw at the time — not just the current one.

---

## B5. If a data breach happens

The clock starts when you know with reasonable certainty that a breach has occurred. NOT when investigation completes.

- **72 hours** to notify the Kurul via the [İhlal Bildirim Formu](https://www.kvkk.gov.tr/Icerik/5362/Veri-Ihlali-Bildirimi). Late = automatic finable violation.
- Notify affected patients "in the shortest reasonable time" via direct contact (e-mail + SMS); if mass and contacts unknown, also publish a notice on the website.
- If EU patients are affected, also notify a competent EU Data Protection Authority under GDPR Art.33 — same 72-hour clock.
- **Do NOT publicly minimise.** The Kurul publishes failure-to-disclose breaches as Kamuoyu Duyuruları, naming the clinic.
- File a post-incident report internally: cause, scope, mitigations, lessons learned.

Source: KVKK Karar 2019/10.

---

## B6. Telehealth — what your records must show

For every remote consultation:

1. Identity of patient verified (TC kimlik for citizens, passport for foreigners) BEFORE video starts.
2. Aydınlatma + onam taken pre-session, evidenced.
3. Visit transmitted to e-Nabız via the registered USBS within Ministry timing windows.
4. **No recording** unless patient explicitly opted in for that specific session.
5. If you advise medication — e-Reçete only. Do NOT send images of paper prescriptions over WhatsApp.
6. Document at minimum the same fields as an in-person visit, plus the fact that it was uzaktan.

---

## B7. Prescription and charting safety — never use these abbreviations

These abbreviations are the most common source of fatal medication errors worldwide. They are banned by Joint Commission and ISMP. The e-Reçete system enforces drug names but NOT all of these dose-designation pitfalls — so the risk is in your free-text notes, WhatsApp instructions to patients, and discharge summaries.

| Don't write | Why it's dangerous | Write instead |
|---|---|---|
| **U** or **u** | Read as "0" → 10× insulin overdose | "ünite" / "unit" |
| **IU** | Read as "IV" or "10" | "uluslararası ünite" |
| **QD** / q.d. | Read as "QID" → 4× the dose | "günde bir kez" / "once daily" |
| **QOD** | Read as "QID" or "QD" | "gün aşırı" / "every other day" |
| **MS** / **MSO4** | Morphine vs magnesium sulfate confusion | "morfin sülfat" |
| **MgSO4** | Confused with MSO4 | "magnezyum sülfat" |
| **cc** | Read as "U" | "mL" |
| **µg** (Greek mu) | Mistaken for "mg" → 1000× error | "mcg" |
| **trailing zero** "1.0 mg" | Decimal point missed → 10× overdose | "1 mg" |
| **naked decimal** ".5 mg" | Decimal point missed → 10× overdose | "0.5 mg" |
| **HS** | "half-strength" vs "hour of sleep" | "yatmadan önce" |
| **D/C** | "discharge" vs "discontinue" | spell it out |
| **AD / AS / AU** | Right/left/both ear; misread as eye codes | "sağ kulak" / "sol kulak" / "her iki kulak" |
| **OD / OS / OU** | Right/left/both eye; ear/eye confusion | spell it out |
| **BT** | "bedtime" vs "biopsy" or BID | "yatarken" |
| **SC / SQ** | "SC" → "SL"; "SQ" → "5 every" | "subkutan" |
| **PO** (handwritten) | Reads as left eye | "ağızdan" / "oral yolla" |
| **@** | Read as "2" | "at" or full word |
| **>** **<** | Confused for the opposite or for letters | "büyüktür" / "küçüktür" |
| **slashed dose** "25/50 mg" | Slash read as "1" → 25,150 mg | "ve" |
| **AZT / HCT / 6-MP / MTX** | Drug-name abbreviations | spell every drug name |
| **NAS** for intranasal (2024 update) | Misread | "intranazal" |

**Turkey-specific notes:**
- Always write doses with a leading zero: "0,5 mg" — and use the comma decimal separator consistently in Turkish-locale documents (don't mix "0.5" and "0,5" in the same chart).
- For look-alike Turkish brand names (e.g., Lustral / Lustragen, Cipram / Cipro, Xanax / Zofran) write the generic plus brand on first reference: "essitalopram (Cipralex)".
- WhatsApp instructions to patients: spell every drug name AND dose AND frequency in full Turkish — do not use medical shorthand.

Sources: [Joint Commission Do Not Use List](https://www.jointcommission.org/en-us/knowledge-library/support-center/standards-interpretation/do-not-use-list-of-abbreviations); [ISMP 2024 List](https://www.ismp.org/system/files/resources/2024-04/ISMP_ErrorProneAbbreviation_List.pdf); [WHO LASA Aide-Memoire 2007](https://cdn.who.int/media/docs/default-source/patient-safety/patient-safety-solutions/ps-solution1-look-alike-sound-alike-medication-names.pdf?sfvrsn=d4fb860b_8).

---

## B8. Items to reject if anyone proposes them

- "Let's host on a US server, it's faster." — Needs SCC + careful KVKK md.9 analysis. Frankfurt is fine; Virginia is not without a SCC or BCR.
- "We'll record telehealth sessions for our records by default." — Illegal under Yönetmelik md.7/g without per-session consent.
- "Send the lab result PDF over WhatsApp Business." — Only via the platform with link expiry. WhatsApp message body is stored on Meta servers and you have no SCC for that channel for special-category content unless explicit consent and BAA-equivalent exist.
- "Let's bundle the telehealth, treatment, and marketing consents into one tickbox." — Invalid; KVKK Açık Rıza Rehberi requires granular and specific consent.
- "We'll skip VERBİS, we're small." — Your size triggers it; Kurul fines for VERBİS-failure are routinely in the high six figures TL with a 2026 ceiling of TRY 17M.

---

## B9. GDPR — applies because you serve EU patients (FR / ES / EN)

GDPR's territorial scope (**Art.3(2)**) catches the clinic because the platform offers services in FR/ES/EN, prices in EUR, and books appointments from EU residents — even though the clinic and servers are not in the EU. Treat this as binding, not optional.

The good news: GDPR and KVKK overlap heavily. If you do KVKK well, you cover ~85% of GDPR automatically. The gaps below are the items where GDPR demands something extra or different.

### B9.1 — Appoint an EU representative (Art.27)

Required because (a) you process special-category health data of EU residents and (b) the processing is regular, not occasional. The representative is your point of contact for EU supervisory authorities (DPAs) and data subjects.

- **Who:** an EU-established law firm or specialist DPO-as-a-service (typical cost €500–€2,000 / year for a clinic of your size).
- **Where to publish:** in the privacy notice (Aydınlatma Metni) — name + address of the representative, callable from any EU jurisdiction.
- **When you can skip it:** only if EU patient volume is negligible AND occasional. As soon as you accept a paid EU booking, the obligation is live.

### B9.2 — Lead supervisory authority

Because the clinic has no EU establishment, there is no "lead DPA" — every EU member state's DPA can act independently. Practical rule: name the DPA of the country where you have the most patients in the privacy notice as the primary point of contact, but be prepared to receive complaints from any EU DPA.

### B9.3 — Patient rights — same list as KVKK md.11, slightly different deadlines

| Right (GDPR article) | KVKK equivalent | Deadline |
|---|---|---|
| Access (Art.15) | md.11/b-c | **1 month** (extendable +2 months for complex requests, with notice) |
| Rectification (Art.16) | md.11/d | 1 month |
| Erasure / "right to be forgotten" (Art.17) | md.11/e | 1 month — block: legal-retention duty or public-interest medical research |
| Restriction (Art.18) | — | 1 month — KVKK has no direct equivalent; honor it for EU patients |
| Data portability (Art.20) | — | **1 month — KVKK has no equivalent. EU patients can demand a machine-readable export of their data.** Build this. |
| Object to processing (Art.21) | md.11/f | 1 month |
| Withdraw consent (Art.7(3)) | Açık Rıza Rehberi | Effective immediately on request |

Operationally: route every patient-rights request through the same `kvkk@drbak.com` queue. Tag EU-resident requests so they get the GDPR-specific deadlines and rights (notably portability and restriction, which KVKK does not require).

### B9.4 — Breach notification — already 72 h under both regimes, but EU has dual targets

When a breach affects EU residents, **both** KVKK Kurul AND a competent EU DPA must be notified within 72 hours. If the breach is "high risk" to the affected individuals, you must also notify them directly without undue delay (Art.34). KVKK requires the same; coordinate one notification template that satisfies both.

### B9.5 — Cookies & tracking — ePrivacy Directive

GDPR is for personal data; cookie consent on EU traffic is governed by the ePrivacy Directive (and its successor Regulation when adopted). Practical rules:

- **Strictly-necessary cookies only by default** — session, CSRF, language preference. These need no consent.
- **Analytics, marketing, third-party trackers — opt-in only**, behind a properly-rejectable consent banner. "Reject all" must be as prominent as "Accept all" (CJEU case law and EDPB guidance).
- **Pre-ticked boxes are invalid** under both ePrivacy and KVKK Karar 2020/559.

### B9.6 — Data Protection Impact Assessment (DPIA — Art.35)

A DPIA is mandatory when processing is "likely to result in high risk." Special-category health data + telehealth video + cross-border transfer + automated chatbot triage tools triggers it. We will produce the DPIA on the engineering side; you sign off on the assessment after counsel review.

### B9.7 — Cross-border transfer FROM the EU patient TO Frankfurt

Almost a non-issue: data flow is from the EU resident's browser → CF EU edge → Neon Frankfurt. All within EU/EEA. The cross-border element is between the Turkey-located clinic (you, accessing the data from Istanbul) and the EU-stored data. This is governed by GDPR Chapter V — the Standart Sözleşme + KVKK 5-day filing already covers the Turkey leg.

### B9.8 — Records of Processing Activities (RoPA — Art.30)

Required for any controller processing special-category data, regardless of size. The KVKK VERBİS registration covers most of this content but is not Art.30-compliant on its own. Maintain an internal RoPA in the format Art.30 requires (we'll produce a template); the doctor signs and dates it annually.

### B9.9 — Things that differ meaningfully from KVKK

- **Right to data portability** — GDPR yes, KVKK no. Must be implemented.
- **Right to restriction** — GDPR yes, KVKK no. Must be implemented.
- **Lead DPA** — GDPR has the concept; KVKK does not.
- **Art.27 representative** — GDPR specific; no KVKK equivalent.
- **DPIA** — GDPR mandates it for high-risk; KVKK Karar 2018/10 only requires "adequate technical and organizational measures" without prescribing the DPIA format.
- **EU residents may sue you in their home court** under Art.79 — practical legal-jurisdiction risk. Consider whether your malpractice / cyber policy covers EU forum.

---

## B10. SOC 2 and ISO 27001 — international audit standards

**Bottom line: not required for launch, but you should make a deliberate decision now.**

### B10.1 — What these are, in plain language

- **SOC 1** — a US audit standard for service organizations whose data processing affects *other companies' financial statements*. Does **NOT** apply to you (a B2C clinic doesn't move someone else's books). Skip.
- **SOC 2** — a US audit standard where an independent auditor attests that your security, availability, and confidentiality controls work. Used as a B2B sales asset; not legally required.
- **ISO 27001** — international (ISO) information-security management standard. Recognised in Turkey by TÜRKAK accreditation. Often demanded in Turkish hospital procurements and EU public-sector contracts.

### B10.2 — Decision point: when (if ever) to pursue

| Path | Pursue at launch? | Year 2? | Never? |
|---|---|---|---|
| **SOC 2 Type 2** | No — overkill for B2C | Maybe — only if you sign a US enterprise / global wellness / US telehealth referrer | Acceptable if you stay TR + EU B2C |
| **ISO 27001 (TÜRKAK)** | No — but adopt the controls | **Recommended** if you go B2B (insurer, hospital partnership, corporate wellness in Turkey) | Acceptable if you stay pure B2C |

### B10.3 — Cost ranges (USD, 2026)

| | Year 1 | Year 2+ |
|---|---|---|
| **SOC 2 Type 2** (audit + readiness + tooling + internal time) | $40,000 – $120,000 | $25,000 – $60,000 |
| **ISO 27001 (TÜRKAK)** | ~₺250,000–600,000 ≈ $8,000 – $19,000 | $3,000 – $7,000 surveillance audits |

ISO 27001 is roughly **5× cheaper** for Turkish operations and 80% of its controls map directly to SOC 2 — so if you start with ISO 27001 and later decide to add SOC 2 for a US deal, the second audit is faster and cheaper.

### B10.4 — Your annual obligations regardless of which path you choose

Even without pursuing formal attestation, the following are required for any enterprise customer's vendor due-diligence questionnaire (and most fall directly out of KVKK Art.12):

1. **Sign the annual risk assessment** (1-page summary, you are the responsible owner)
2. **Review and approve the incident response runbook** annually
3. **Sign the staff training attestation** — every clinical and admin staff member completes annual KVKK + telehealth confidentiality + abbreviation safety training
4. **Review the vendor list twice per year** — Cloudflare, Neon, iyzico, WhatsApp, Resend, Twilio, Jitsi — and confirm their attestations are current
5. **Sign the disaster recovery test results** — annual exercise, you receive a 1-page report and sign off

### B10.5 — Practical recommendation

Pursue **ISO 27001 readiness in Year 2**, not SOC 2. Reasons:
- Cheaper and more relevant for Turkish hospital partnerships and EU buyers
- Same control disciplines that SOC 2 requires (you can layer SOC 2 on top later if a US deal materializes)
- ISO 27799 (the health-sector ISO 27001 extension) gives you an industry-specific story for psychiatric / TMS clinical operations

In Year 1, focus on the operational disciplines (B10.4) — they are required for KVKK regardless and turn into ISO 27001 evidence automatically when you decide to pursue certification.

---

## Open questions you (the doctor) must answer

These determine the implementation path, so we need answers before final platform delivery:

1. **Which Ministry-registered USBS will you use?** Determines whether the platform integrates as a complementary channel or whether telehealth runs entirely on the third-party USBS (legal answer differs).
2. **Mesleki sorumluluk policy:** does it cover cyber + KVKK fines + GDPR fines + EU forum jurisdiction? Standard policies often exclude regulatory fines and cap geographic scope.
3. **iyzico data flow:** does iyzico store any health-related field on the receipt (e.g., procedure description)? If yes, iyzico becomes a veri işleyen for özel-nitelikli data and the contract must reflect that.
4. **EU patient volume estimate:** if even handful per month, the Art.27 representative is required. Decide whether to budget for it now (recommended) or accept the regulatory risk.
5. **Which EU DPA do you want to name as primary contact** in the privacy notice? Default suggestion: the CNIL (France) — most active health-sector DPA in EU and you have French-language traffic.

---

## Key sources

- [KVKK Law No. 6698 (consolidated)](https://mgm.adalet.gov.tr/Resimler/SayfaDokuman/211020191355056698%20KVKK.pdf)
- [Kurul Kararı 2018/10 — Special-category data adequate measures](https://www.kvkk.gov.tr/Icerik/4110/2018-10)
- [Kurul Kararı 2019/10 — Breach notification 72h](https://www.kvkk.gov.tr/Icerik/5362/Veri-Ihlali-Bildirimi)
- [Kişisel Sağlık Verileri Hakkında Yönetmelik (RG 21.06.2019/30808)](https://www.resmigazete.gov.tr/eskiler/2019/06/20190621-3.htm)
- [Uzaktan Sağlık Hizmetlerinin Sunumu Hakkında Yönetmelik (RG 10.02.2022/31746)](https://www.resmigazete.gov.tr/eskiler/2022/02/20220210-2.htm)
- [USBS Sağlık Bakanlığı kayıt sayfası](https://kayittescil.saglik.gov.tr/TR-90714/uzaktan-saglik-bilgi-sistemi-usbs.html)
- [KVKK Yurt Dışı Aktarım Rehberi (post-2024)](https://www.kvkk.gov.tr/Icerik/8142/Kisisel-Verilerin-Yurt-Disina-Aktarilmasi-Rehberi)
- [KVKK Açık Rıza Rehberi](https://www.kvkk.gov.tr/yayinlar/A%C3%87IK%20RIZA.pdf)
- [Hasta Hakları Yönetmeliği (RG 08.05.2014)](https://www.resmigazete.gov.tr/eskiler/2014/05/20140508-3.htm)
- [Joint Commission Do Not Use List](https://www.jointcommission.org/en-us/knowledge-library/support-center/standards-interpretation/do-not-use-list-of-abbreviations)
- [ISMP 2024 Error-Prone Abbreviations List (PDF)](https://www.ismp.org/system/files/resources/2024-04/ISMP_ErrorProneAbbreviation_List.pdf)
- [WHO Patient Safety Solutions vol.1 (LASA, 2007)](https://cdn.who.int/media/docs/default-source/patient-safety/patient-safety-solutions/ps-solution1-look-alike-sound-alike-medication-names.pdf?sfvrsn=d4fb860b_8)
