# DB schema reference

> Canonical source: [`apps/api/src/infrastructure/db/schema.ts`](../apps/api/src/infrastructure/db/schema.ts). This document describes the model in plain English. If they ever disagree, the schema file wins — please open a PR to update this doc.

## Table groups

### Identity (`users`, `oauth_accounts`, `webauthn_credentials`)

`users` is the auth identity. Email + Argon2id password hash (or null for OAuth-only). `role ∈ {patient, staff, admin, doctor}` — server-enforced. Lockout via `failed_login_count` + `locked_until`.

`oauth_accounts` links a user to one or more OAuth providers (Google for now). Unique `(provider, providerAccountId)` prevents account-linking attacks.

`webauthn_credentials` holds passkeys. Mandatory for `admin` role; optional for everyone else.

### Patient profile (`patients`)

One row per patient, 1:1 with `users`. Holds demographic + contact + emergency contact + optional `guardianPatientId` self-reference (for pediatric patients). `notes_internal` is staff-only and never returned to patient API.

### Clinic (`doctors`, `clinics`, `certificates`)

`doctors` — the practitioner record(s). Today: one row for Uzm. Dr. Oğuz Bak. `schemaJsonLd` cached for the Physician schema.

`clinics` — the physical location(s). One row for Helis More Residence. Holds geo + opening hours JSON.

`certificates` — the 22 certificate records. `displayOnSite + sortOrder` control which credentials show in the credential strip. Initially seeded as anonymous placeholders ("Sertifika #N") until photos arrive — see discovery §12.16.

### Service catalogue (`services`, `service_translations`, `conditions`, `condition_translations`, `service_conditions`)

Two clinical axes, both first-class:
- `services` — what the patient books. Has `pillar` (integrative_neurology, tms, algoloji, conventional_neurology, diagnostic_sleep, regenerative, pediatric_neurology, home_services, telehealth, lifestyle, aesthetic — last is hidden until §12.15 sub-brand decision).
- `conditions` — what the patient has. Has ICD-10 where applicable.
- `service_conditions` — many-to-many bridge. `isPrimary` flags the canonical service for a given condition (used to recommend a default booking from a condition page).

Translations live in dedicated tables, primary-keyed on `(entityId, locale)`. `slug_localised` per locale supports full per-language URL paths (e.g., `/tr/tedaviler/noral-terapi` vs `/en/treatments/neural-therapy`).

### Slot availability (`slot_templates`, `slot_blackouts`, `slot_overrides`, Durable Object)

The DB stores the *rules*; the DO computes the *projections* per `(doctorId, date)`. Three sources combine:
1. `slot_templates` — recurring weekly availability rules.
2. `slot_blackouts` — date ranges that suppress template slots.
3. `slot_overrides` — explicit one-off slot offers (e.g., admin opens an extra TMS hour).

Holds (5-min soft reservations during checkout) live entirely in the Durable Object's storage — they never hit Postgres.

### Appointments (`appointments`, `appointment_status_history`)

The aggregate root. Status transitions enforced by `BookingPolicy` and recorded in `appointment_status_history` with actor + reason + timestamp.

Key constraints:
- Unique partial index on `(doctorId, startsAt) WHERE status NOT IN cancelled-states` — second line of defence behind the DO. If a DO bug ever lets two appointments through, the DB rejects the second.
- Unique partial index on `idempotency_key WHERE NOT NULL` — every booking submission carries one.
- Telehealth columns (`telehealthRoomId`, `telehealthJoinUrl`, `telehealthExpiresAt`) only populated for `deliveryMode = 'telehealth'`.

### TMS screenings (`tms_screenings`)

Pre-qualification questionnaire valid for 365 days (configurable via `TMS_SCREENING_VALIDITY_DAYS`). Booking a TMS service blocks until a `cleared` screening exists in-window. `requires_review` triggers a doctor task; `denied` is final.

### Consent (`consent_documents`, `consent_records`)

`consent_documents` are the *texts* — one row per `(purpose, locale, version)`. Editing the text creates a new version; old records remain bound to the version they consented to.

`consent_records` are the patient *grants* — immutable, append-only. To withdraw, we set `withdrawnAt`; we never delete. KVKK Article 12 audit-trail satisfied.

### Patient documents (`patient_documents`)

R2-stored. The DB row holds metadata + `r2Key` (the R2 object name) + `scanStatus` (placeholder for ClamAV/Cloudflare Antivirus integration). Signed URL is generated on-demand at read time, never stored.

### Testimonials (`testimonials`)

Always linked to a `consent_record` of purpose `testimonial_publication`. Public display requires `status = 'approved'`. Default `displayName` is "Hasta Yorumu" (anonymous) unless the consent explicitly grants name display.

### CMS-lite content (`content_entries`, `content_entry_translations`)

`type ∈ {blog, condition, service, faq, guide, legal}`. Each entry has translations per locale. `doctorNoteMarkdown` is the first-party voice pull-quote per discovery §3 (the `<DoctorNote>` component on the frontend renders this distinctively).

`schemaJsonLd` is auto-generated when an entry is published — Article schema for blog, MedicalCondition for condition, MedicalProcedure for service, FAQPage for faq, LegalDocument for legal.

### Notifications (`notifications`)

Idempotent outbox. Channel ∈ {email, sms, whatsapp}. Producer enqueues; consumer (queue worker) sends. Retries up to 5; dead-letter queue at 6h.

### Audit log (`audit_log`)

Append-only. Every read or write of patient data writes a row. No raw SQL ever bypasses this — the repository layer enforces it. KVKK-discoverable in <100ms via `(target_user_id, at)` index.

### Webhook events (`webhook_events`)

Inbound webhook idempotency. Unique `(provider, externalId)` prevents double-processing of Resend bounces, Meta WA delivery callbacks, NetGSM delivery reports.

## Migration strategy

- Migrations are SQL files generated by `pnpm db:generate` (Drizzle Kit) into `apps/api/src/infrastructure/db/migrations/`.
- Always reviewed by hand before commit — the generator is a starting point.
- Apply to dev: `pnpm db:migrate` (against a Neon dev branch).
- CI enforces: schema file changes ⇒ migration file in the same PR.
- Rollbacks: forward-only. We never write `down()`. Bad migrations are reversed by writing a corrective forward migration.

## Data lifecycle (KVKK / GDPR)

| Data class | Retention default | Erasure trigger |
|---|---|---|
| `users` (account) | until DSAR or 5y inactivity | DSAR Article 11 erasure |
| `patients` | with `users` | DSAR; cascade marks `deleted_at` and rotates PII to nullable |
| `appointments` | 10y (medical record retention TR) | never user-erasable; clinic-archived only |
| `consent_records` | indefinite | never erasable (legal evidence) |
| `audit_log` | 5y | never erasable (legal evidence) |
| `patient_documents` | 10y | DSAR Article 11 erasure (R2 object purged + DB row marked) |
| `notifications` | 90d | none (auto-pruned by cron) |
| `webhook_events` | 90d | none (auto-pruned by cron) |

`purgeForDsar(userId)` is a single use-case in `application/use-cases/admin/` that handles erasure correctly: blanks PII, retains legally-required records, writes an audit-log entry of the erasure, and notifies the user.
