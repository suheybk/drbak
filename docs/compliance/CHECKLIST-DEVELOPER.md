# Compliance Implementation Checklist — Developer

This is the engineering-side counterpart to `CHECKLIST-DOCTOR.md`. Each item is mapped to the regulation that requires it (KVKK / GDPR / HIPAA), grouped by control family. Items already shipped at commit time are marked ✅ in the source repo; the rest map to issues / launch-checklist gates.

Currency: May 2026 (post-Law 7499 revisions to KVKK Articles 6 + 9).

---

## A1. Authentication & Access Control

| # | Control | Mapping |
|---|---|---|
| A1.1 | MFA required on every clinical account (doctor, secretary, billing) | KVKK Karar 2018/10 §"erişim yetkilerinin sıkı kontrolü"; HIPAA §164.312(a)(2)(i)–(iii); GDPR Art.32(1)(b) |
| A1.2 | RBAC with least privilege; secretary role MUST NOT see free-text consultation notes — appointment + contact metadata only | Yönetmelik md.5/§3; HIPAA Privacy Rule "minimum necessary" |
| A1.3 | Auto-logout idle clinician sessions ≤15 min; patient portal ≤30 min | KVKK Veri Güvenliği Rehberi §4.3.2 |
| A1.4 | Patient login: passkey/WebAuthn preferred; if password, ≥12 chars, NIST 800-63B compliant, breached-password check on signup | NIST 800-63B; KVKK genel teknik tedbirler |
| A1.5 | Step-up authentication (re-prompt MFA) before document download, prescription view, telehealth join, KVKK md.11 data export | KVKK + HIPAA §164.312(a)(1) |
| A1.6 | One TC kimlik / e-mail per user. No shared accounts. Every audit-log row attributable to a natural person | Karar 2018/10; HIPAA §164.312(a)(2)(i) |

## A2. Encryption

| # | Control | Mapping |
|---|---|---|
| A2.1 | TLS 1.3 only on all public endpoints; HSTS preload after 30-day soak; TLS 1.0–1.2 disabled | GDPR Art.32(1)(a); HIPAA §164.312(e)(1) |
| A2.2 | AES-256-GCM at rest for özel-nitelikli columns (consultation notes, document blobs, free-text reasons-for-visit, IP). Envelope encryption — DEK per row, KEK in CF Secrets / KMS, **rotate KEK every 90 days** | KVKK Karar 2018/10 §"şifreleme"; HIPAA §164.312(a)(2)(iv) + §164.312(e)(2)(ii) |
| A2.3 | Document/file uploads → R2 with server-side encryption + per-object DEK; pre-signed URL TTL ≤10 min; never embed file URLs in e-mail or SMS | KVKK + HIPAA §164.312(e)(2)(ii) |
| A2.4 | Database backups encrypted with a separate KEK; minimum two backups, EU region only | KVKK md.9 + GDPR Chapter V |
| A2.5 | Pseudonymise identifiers in analytics tables (hashed TC kimlik with project-pepper, never raw) | GDPR Art.32(1)(a); KVKK md.4 ölçülülük ilkesi |

## A3. Audit Logging

| # | Control | Mapping |
|---|---|---|
| A3.1 | Append-only audit log of every read/write to özel-nitelikli data: actor user_id, target patient_id, action, timestamp, IP, user-agent | KVKK Karar 2018/10 §"güvenlik denetim kayıtları"; HIPAA §164.312(b); Yönetmelik md.6/§3 |
| A3.2 | Logs go to write-once store (R2 Object Lock or equivalent); retention ≥10 years | Karar 2018/10 + medical-record retention parity |
| A3.3 | Anomaly alerts (Slack/PagerDuty): >50 records read by one user / hour, after-hours bulk export, failed-MFA spikes, geo-impossible logins | KVKK genel; SOC2 CC7.2 |
| A3.4 | Quarterly access review: print "users with patient-data permission" list, doctor signs and dates | KVKK Karar 2018/10 §"yetki kontrolü periyodik tekrarı" |

## A4. Consent Management

| # | Control | Mapping |
|---|---|---|
| A4.1 | Granular separated consents — never bundled. `consents` table: `purpose`, `legal_basis`, `version`, `granted_at`, `revoked_at`, `evidence_blob` | KVKK md.3/1-a (explicit consent definition); GDPR Art.7 |
| A4.1.C1 | Treatment / health-data processing consent (md.6 + Yönetmelik md.5) | KVKK md.6 |
| A4.1.C2 | Telehealth consent (Yönetmelik md.7 informed-consent disclosures) | Uzaktan Sağlık Yönetmeliği md.7 |
| A4.1.C3 | Cross-border transfer consent for hosting in Germany | KVKK md.9 |
| A4.1.C4 | Marketing communications consent | KVKK Açık Rıza Rehberi |
| A4.1.C5 | Family-member contact authorization | KVKK md.10 |
| A4.2 | Aydınlatma Metni shown BEFORE consent UI in patient's selected UI language (TR/AR/EN/FR/ES). Versioned; changes require re-consent on next login | KVKK md.10 |
| A4.3 | Consent withdrawal must be ≥as easy as granting. One click in patient portal | GDPR Art.7(3); KVKK Açık Rıza Rehberi |
| A4.4 | Store the raw HTML/PDF the patient saw at consent time (`evidence_blob`); burden of proof is on the controller | KVKK Açık Rıza Rehberi |

## A5. Data Lifecycle (Retention & Deletion)

| Data category | Retention | Source |
|---|---|---|
| Hasta dosyası (medical record) | 20 years from last contact (minors: until 18 + 20 years) | Hasta Hakları Yönetmeliği |
| Telehealth metadata | Part of medical record — same 20 years | Uzaktan Sağlık Yönetmeliği md.6 |
| Audit logs | 10 years minimum | Karar 2018/10 |
| Appointment-only records (no clinical encounter) | 5 years | Operational policy |
| Marketing consent record | Until withdrawn + 3 years | Açık Rıza Rehberi |
| Payment records | 10 years | TTK md.82 + VUK |
| WhatsApp / chatbot logs containing health complaints | Treat as health data — 20 years | Yönetmelik md.5 |

| # | Control | Mapping |
|---|---|---|
| A5.1 | Retention policy table is the single source of truth, lives at `apps/api/src/domain/retention/policy.ts` | KVKK md.7 + İmha Yönetmeliği |
| A5.2 | Hard-delete pipeline runs monthly; produces `imha_tutanagi` (destruction record) with patient_id_hash, retention basis met, deletion date, signed by DPO contact | İmha Yönetmeliği |
| A5.3 | Right-to-erasure flow (md.11/e): if patient requests deletion AND no legal-retention duty applies, delete within 30 days; otherwise respond with the legal basis blocking erasure and a "to-delete-on" date | KVKK md.13 |
| A5.4 | Soft-delete with 30-day restore window for the doctor; after 30 days irreversible | Operational |

## A6. Vendor / Subprocessor Management

| # | Control | Mapping |
|---|---|---|
| A6.1 | Maintain `subprocessors.md` listing every third party that touches patient data. Per entry: legal entity, data categories, hosting location, SCC/BCR status | KVKK md.12; HIPAA BAA equivalent |
| A6.2 | Sign Veri İşleyen Sözleşmesi (Turkish-law data processor agreement) with each, plus EU SCCs for the Frankfurt leg | KVKK md.12 |
| A6.3 | Block analytics / advertising trackers from any page that shows patient data. GA on marketing pages only — never on `/portal`, `/randevu`, `/telesaglik` | KVKK Karar 2020/559 (cookie kararları) |
| A6.4 | No US-only vendors for PHI without an SCC and a specific cross-border consent. Cloudflare = OK (EU operations + SCCs); Neon = MUST be region-pinned to `eu-central-1` (Frankfurt) at provisioning, not after | KVKK md.9 |

## A7. Breach Response

| # | Control | Mapping |
|---|---|---|
| A7.1 | Codified Incident Response Plan at `/runbooks/INCIDENT_RESPONSE.md`. Trigger conditions, severity matrix, decision tree | KVKK Karar 2019/10 |
| A7.2 | **72-hour clock** starts when controller becomes aware with reasonable certainty. Notify [KVKK İhlal Bildirim Formu](https://www.kvkk.gov.tr/Icerik/5362/Veri-Ihlali-Bildirimi); if EU residents affected, also competent EU DPA under GDPR Art.33 | Karar 2019/10; GDPR Art.33 |
| A7.3 | Affected-patient notification in plain language: nature of breach, data categories, likely consequences, mitigations, contact for questions. Method: e-mail + SMS + (if e-mail bounces) registered post | Karar 2019/10 |
| A7.4 | Pre-drafted patient-notification templates in TR/AR/EN/FR/ES, pre-approved by Turkish counsel | Operational |
| A7.5 | Tabletop exercise twice per year, log signed | SOC2 CC7.4 + Karar 2019/10 |

## A8. Telehealth-Specific

| # | Control | Mapping |
|---|---|---|
| A8.1 | **Do NOT roll our own video.** Use a Ministry-registered USBS or integrate with one. The Faaliyet İzin Belgesi from İl Sağlık Müdürlüğü is a hard prerequisite | Yönetmelik md.6/8 |
| A8.2 | Recording disabled by default. If doctor wants to record, both parties' explicit consent required *for that specific session* (Yönetmelik md.7/g — express prohibition without consent). Per-session opt-in dialog | Yönetmelik md.7/g |
| A8.3 | Telehealth visit produces an electronic muayene kaydı pushed to e-Nabız via USBS within Ministry timing windows (registration on creation, exam data on completion) | Yönetmelik md.6 |
| A8.4 | Identity verification before video starts: TC kimlik + e-Devlet OTP, or passport for foreign patients; store proof in the visit record | Yönetmelik md.7/a |
| A8.5 | Pre-visit non-skippable modal: "muayenehane muadili değildir, acil durumda 112 arayın" — script taken verbatim from Yönetmelik md.7/c-d-e | Yönetmelik md.7/c-d-e |

## A9. Cross-Border Transfer (Frankfurt hosting)

| # | Control | Mapping |
|---|---|---|
| A9.1 | KVKK has not (as of May 2026) issued a yeterlilik kararı for Germany / EU. Plan accordingly | KVKK md.9 |
| A9.2 | Use one of the appropriate-safeguard mechanisms (post-2024 md.9/2): Standart Sözleşme (KVKK template, signed with each EU vendor, **notified to KVKK within 5 working days**); Bağlayıcı Şirket Kuralları (BCR — overkill for one clinic); or one of the limited derogations | KVKK md.9/2 |
| A9.3 | Build the consent flow assuming Standart Sözleşme is the primary mechanism. Do NOT rely on the old "explicit consent for transfer" pathway — removed for routine flows in March 2024 | KVKK md.9 (post-Law 7499) |
| A9.4 | Annual review: Frankfurt region pinning still intact; vendor list still under SCC; KVKK has not issued a contrary decision | Operational |
| A9.5 | Privacy notice (Aydınlatma) explicitly names the country (Germany), the legal basis used (Standart Sözleşme), and offers contact for the SCC text on request | KVKK md.10 + md.9 |

---

## A10. GDPR Compliance (EU patients via FR / ES / EN locales)

GDPR Art.3(2) territorial scope binds the clinic because the platform offers services in FR/ES/EN to EU residents. Implementation deltas vs KVKK:

| # | Control | Mapping |
|---|---|---|
| A10.1 | Detect EU residency at signup (browser locale + IP geolocation as soft signal; legal residency declared via consent form). Tag the `patients` row with `gdpr_eu_resident: bool` so request handlers apply the right deadlines/rights | GDPR Art.3(2) |
| A10.2 | Build the **right to data portability** (Art.20): one-click export endpoint returning a structured machine-readable JSON of every personal-data row for the requesting patient. KVKK has no equivalent — this is GDPR-only | Art.20 |
| A10.3 | Build the **right to restriction** (Art.18): a `processing_restricted_at` flag on `patients` that downstream queries respect (no further processing except storage and explicit consent operations). KVKK has no equivalent | Art.18 |
| A10.4 | Patient-rights handler tags the request: KVKK / GDPR / both. Apply the stricter deadline (1 month, extendable +2 months for complex requests with notice). Internal SLA: respond within 14 days regardless | Art.12(3) + KVKK md.13 |
| A10.5 | Consent banner must distinguish strictly-necessary cookies (no consent) from optional (opt-in only). "Reject all" button parity with "Accept all" — CJEU Planet49, EDPB guidelines 03/2022 | ePrivacy Directive Art.5(3); EDPB |
| A10.6 | Records of Processing Activities (RoPA) per Art.30 — internal document maintained at `docs/compliance/RoPA.md`, distinct from VERBİS. Doctor + dev lead sign annually | Art.30 |
| A10.7 | DPIA at `docs/compliance/DPIA.md` covering: special-category health data, telehealth video, cross-border transfer, automated chatbot triage. Counsel-reviewed; doctor signs | Art.35 |
| A10.8 | EU representative under Art.27 — name + address published in privacy notice. Implementation: maintain in `apps/web/src/data/eu-representative.ts`; render in Aydınlatma Metni footer | Art.27 |
| A10.9 | Breach notification handler must dispatch to **both** the KVKK Kurul AND the named EU DPA when EU residents are in the affected set. One template, two recipients | Art.33 + KVKK Karar 2019/10 |
| A10.10 | Privacy notice translations (TR/AR/EN/FR/ES) include: identity of EU representative, name of designated EU DPA, list of GDPR rights including portability and restriction, basis for cross-border transfer (Standart Sözleşme + Chapter V) | Art.13 + Art.14 |
| A10.11 | EU resident login from outside EU still receives EU-resident treatment (residency-based, not session-IP-based). Tag survives the session | Art.3(2) |
| A10.12 | No automated decision-making with legal effect on EU residents without Art.22 safeguards. The chatbot's `escalate_to_human` tool must fire on any clinical recommendation; no auto-prescribing | Art.22 |

Implementation note on A10.5: cookie consent banner must be implemented in Astro middleware so it loads before any analytics tag. Currently we have no analytics on patient-facing routes (per A6.3) — but if marketing adds GA on `/yorumlar` or content pages, the banner becomes load-bearing.

## A11. SOC 2 / ISO 27001 readiness — vendor due-diligence floor

**Bottom line:** SOC 1 does not apply (the clinic doesn't process data that flows into other organizations' financial statements). SOC 2 is not regulatory; it's a B2B sales artefact (~$40–120k Year 1 in 2026) and only worth pursuing if the clinic targets US enterprise / corporate-wellness / hospital-partner deals. **For Turkey-anchored operations, ISO 27001 (TÜRKAK-accredited) is ~5× cheaper (~$8–19k Year 1) and more recognised** by Turkish hospital procurements + EU buyers.

Even without pursuing formal attestation, **the items below are required for any vendor due-diligence questionnaire** and overlap with KVKK Karar 2018/10 / GDPR Art.32. Adopt the controls; defer the audit.

| # | Control | TSC mapping | KVKK / GDPR overlap |
|---|---|---|---|
| A11.1 | **Annual risk assessment** documented (assets, threats, likelihood, treatment), reviewed by clinic owner; refreshed yearly or on material change | CC3.1, CC3.2, CC3.4 | KVKK Karar 2018/10 §"risk analizi" (partial) |
| A11.2 | **Change management** — every prod deploy via PR with min. 1 reviewer, automated tests green, migration plan + rollback documented; emergency-change exception path with post-hoc review | CC8.1 | No direct KVKK clause |
| A11.3 | **Segregation of duties** — developer cannot self-approve own merge to main; prod DB write access separated from app deploy access | CC6.1, CC8.1 | KVKK Karar 2018/10 §"erişim yetkilerinin ayrılması" (weak) |
| A11.4 | **Personnel security** — background-check policy for clinical + dev staff; signed confidentiality + acceptable-use agreement; offboarding checklist with same-day access revocation (Cloudflare, Neon, Resend, GitHub, password vault, iyzico merchant) | CC1.4, CC6.2, CC6.3 | KVKK §"çalışan farkındalığı" |
| A11.5 | **Annual security awareness training** for all staff (KVKK + phishing + telehealth confidentiality + abbreviation safety); attendance logged; doctor signs attestation | CC1.4, CC2.2 | KVKK Karar 2018/10 §"farkındalık eğitimi" |
| A11.6 | **Vendor risk register** (`docs/compliance/VENDOR-REGISTER.md`) — per vendor: data accessed, sub-processor list, latest SOC 2 / ISO / PCI report date, expiry, **CUECs we own** (Complementary User Entity Controls), DPA-signed status; reviewed twice yearly | CC9.2 | GDPR Art.28; KVKK veri işleyen denetimi |
| A11.7 | **Availability monitoring + SLO** — uptime SLO documented (99.5% booking page, 99.9% telehealth join), Cloudflare Health Checks + external monitor (Better Stack / Pingdom), alerting to on-call phone; monthly SLO report | A1.1, A1.2 | KVKK §"sistem sürekliliği" (weak) |
| A11.8 | **Disaster recovery test** annually — simulate Neon region loss (restore branch from PITR to fresh project), document RTO/RPO actual vs target, fix gaps | A1.3 | KVKK Karar 2018/10 §"yedeklemelerin geri yüklenmesi" |
| A11.9 | **Evidence collection automation** — store control evidence (access reviews, change tickets, training certs, vuln scans) in a single audit folder with timestamped exports; quarterly cadence | CC4.1, CC4.2 | No direct KVKK clause |
| A11.10 | **Quarterly access review** — every human + service account on Cloudflare, Neon, GitHub, Resend, Twilio, iyzico merchant panel, Cloudflare API tokens, vault; owner sign-off; revocations tracked | CC6.2, CC6.3 | KVKK Karar 2018/10 §"yetkilendirme matrisi" |
| A11.11 | **Vulnerability management** — Dependabot + Cloudflare WAF managed rules + annual external pentest (or ASV scan if PCI scope grows via iyzico); 30-day SLA for criticals, 90-day for highs | CC7.1 | KVKK Karar 2018/10 §"sızma testi" |
| A11.12 | **Internal control self-assessment** — clinic owner + dev lead review the A1–A11 register against actual operations once per year, sign off, file with risk-assessment doc | CC4.1, CC4.2 | No direct KVKK clause |

### CUECs to own from vendors in this stack

When a SOC 2 report is collected, copy the Complementary User Entity Controls into A11.6 vendor register. Common CUECs:

- **Cloudflare**: Configure MFA on dashboard, manage API token scope/rotation, enforce NDA on report distribution.
- **Neon**: Manage database roles + rotate connection strings, application-layer encryption of PII before storage (where required), branch/PITR retention to your own RPO.
- **Stripe / Resend / Twilio / iyzico**: Webhook signature verification, idempotency-key handling, timely API-key revocation on personnel changes.

### What SOC 2 covers that KVKK does NOT

- CC2.x communications & training (KVKK only requires staff to be "informed")
- CC3.x documented risk assessment with treatment plans (KVKK assumes; doesn't prescribe)
- CC8.1 change management (no KVKK clause)
- CC4.x periodic internal audits (no KVKK clause)
- A1.3 documented DR testing (KVKK requires backups but not test evidence)

### What KVKK covers that SOC 2 does NOT

SOC 2 is **not** a substitute for KVKK. KVKK-only requirements:
- VERBİS registration
- 30-day data subject request response
- Aydınlatma metni format / timing
- Special-category explicit consent (Karar 2018/10 layered controls)
- KVKK-specific cross-border transfer mechanism (Standart Sözleşme + 5-day filing)

### The 3 non-negotiable items regardless of attestation path

These three are required for any enterprise DDQ AND fall directly out of KVKK Art.12 / GDPR Art.28; do them whether or not you ever pursue SOC 2 / ISO 27001:

1. **Vendor risk register** with SOC report cadence (A11.6) — first thing every enterprise procurement asks for
2. **Documented annual risk assessment + tested incident-response runbook** — both fail in practice without this; first artefact any auditor or BAA partner asks to see
3. **Quarterly access reviews + change-management evidence** (A11.2, A11.10) — covers ~40% of any SOC 2 / ISO 27001 / KVKK audit and is essentially free if adopted now

## Wiring into LAUNCH-CHECKLIST.md

The following gate items in `LAUNCH-CHECKLIST.md` map back to controls here:

- **A1 (Cloudflare)** → A2.1, A2.3, A6.1, A6.4, A8.1
- **A2 (Neon Frankfurt)** → A6.4, A9.1–A9.5
- **A3 (Vendor accounts)** → A6.1, A6.2 (sign DPA at signup time, not later)
- **A6 (KVKK)** → all of A4, A5, A7, A9.5; doctor's B1.1, B1.2, B1.5, B1.6
- **A6 (telehealth licence)** → A8.1, A8.5; doctor's B1.3
- **NEW: A7. Compliance gate** → confirm doctor signed B1.4, B1.6, every consent template approved by counsel

---

## Open implementation questions

1. **USBS choice.** Determines whether telehealth integrates as a complementary channel or whether the entire video stack is third-party. Pending B-side answer.
2. **iyzico procedure-description field.** If the receipt carries any health-related text, iyzico becomes a veri işleyen for special-category data; contract must reflect that.
3. **EU GDPR Art.27 representative** — only required if EU patient volume is non-trivial. Defer until traffic data exists.
4. **Field-level encryption migration.** Currently `body_ciphertext` columns exist on `chat_messages` but use plaintext placeholders (see TODO in `handleChatMessage.ts`). A2.2 not satisfied until AES-GCM derive-from-Workers-secret lands.
