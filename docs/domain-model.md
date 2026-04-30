# Domain model

> Pure-TypeScript model. No DB column shapes here — see [db-schema.md](./db-schema.md) for those. This file is the contract our `domain/` package implements.

## Ubiquitous language

Words used precisely throughout the codebase, copy, and conversations.

| Term | Definition | NOT |
|---|---|---|
| **Doctor** | A licensed practitioner with a clinical role in the practice. Today: one. | A staff member, an admin |
| **Service** | A bookable clinical offering (e.g., *Nöral Terapi Konsültasyonu*, *TMS Seansı*). Has duration, delivery mode, eligibility rules. | A condition |
| **Condition** | A clinical condition the practice treats (e.g., *Migren*). Many-to-many with Service. | A diagnosis (we don't diagnose in the app) |
| **Modality** | A treatment technique (e.g., *Nöral Terapi*). Crosscuts Services. | A Condition |
| **Slot** | A specific (doctorId, serviceId, startsAt, duration) tuple offered for booking. | An Appointment |
| **SlotHold** | A 5-minute soft reservation against a Slot during checkout. | A booking |
| **Appointment** | A confirmed booking against a Slot. Aggregate root. | A SlotHold |
| **Patient** | A real person who has, or is creating, an account. | A user record (we have those, but Patient is a richer concept) |
| **Consent** | A KVKK *açık rıza beyanı* — versioned, purpose-scoped, audit-logged. Required for special-category health data. | Cookie consent (separate) |
| **Document** | A file uploaded by the Patient (lab reports, MR scans). R2-stored, signed-URL-accessed. | A blog post |
| **ContentEntry** | A CMS-lite editorial document (blog post, condition page, FAQ entry). Has translations per locale. | A patient document |
| **Testimonial** | A patient quote/video with explicit consent provenance, displayed publicly only after admin approval. | A Google review |
| **TmsScreening** | Pre-booking questionnaire for TMS appointments — implants, pregnancy, seizure history. | A medical exam |
| **AuditLog** | An append-only record of every read or write touching health data. KVKK Article 12 evidence. | An access log |

## Aggregates and their invariants

### Appointment (aggregate root)

Identity: `AppointmentId` (UUID v7).

State: `slot, patient, consents, status, deliveryMode, createdAt, statusHistory[], correlationId`.

Status transitions (one-way unless noted):

```
PENDING_PAYMENT? ── (always free for now) ──┐
                                            ▼
       CREATED ──▶ CONFIRMED ──▶ COMPLETED
           │           │
           │           ├──▶ RESCHEDULED ──▶ CONFIRMED (new slot)
           │           │
           │           ├──▶ CANCELLED_BY_PATIENT
           │           │
           │           └──▶ CANCELLED_BY_CLINIC
           │
           └──▶ NO_SHOW (only after the slot's startsAt + 30min)
```

Invariants:

1. An Appointment cannot exist without a corresponding consent record for purpose `appointment_booking` *and* `health_data_processing`.
2. `slot.startsAt` must be in the future at creation time.
3. For TMS services: a `TmsScreening` with status `CLEARED` must exist for this `(patientId, doctorId)` within the last 12 months.
4. For pediatric services (`patient.age < 18`): a `ConsentBy` must reference the legal-guardian-on-file.
5. `RESCHEDULED` is allowed up to T-24h before original `slot.startsAt`. After that → contact clinic.
6. `CANCELLED_BY_PATIENT` is allowed up to T-24h. After that → mark as `LATE_CANCELLATION` (still cancels but flagged).
7. Status transitions are recorded in `statusHistory[]` with `(from, to, actor, reason, at)`.
8. Once `COMPLETED` or any terminal `CANCELLED_*`, no further transitions allowed.

### SlotAvailability (aggregate, implemented as Durable Object)

Identity: `(doctorId, date)`.

State: An ordered list of Slots for the day, plus active SlotHolds, plus confirmed appointments.

Invariants:

1. **At most one** active appointment per `(doctorId, slotId)`. Enforced by the DO's single-thread guarantee.
2. A SlotHold is valid for 5 minutes from creation. Expired holds are reaped on next read.
3. Slots can be derived (from `SlotTemplate` recurring rules) or explicit (admin-created one-offs).
4. Blackouts (vacation, conference, hospital duty days) are first-class: they suppress matching template-derived slots.

### Patient (aggregate root)

Identity: `PatientId` (UUID v7).

State: `userId, fullName, locale, dateOfBirth, gender?, contact, addresses, emergencyContact?, guardian?, kvkkConsents[], createdAt`.

Invariants:

1. A Patient must have a verified email before any health data can be stored.
2. `dateOfBirth` requires birth-year minimum of 1900 and at most today; presence is required for adults too (used for age-appropriate consent and dosing references).
3. If `dateOfBirth` indicates age <18, `guardian` MUST be present and MUST itself be a Patient with verified email.
4. Each KVKK consent has `(purpose, documentVersion, grantedAt, ipAddress, userAgent, locale)` — never deleted, only superseded.

### ContentEntry (aggregate root)

Identity: `ContentEntryId`.

State: `slug, type (blog|condition|faq|guide|legal), translations[], status (draft|review|published|archived), publishedAt?, authorId, reviewerId?, schemaJson?, hreflangSlugMap?`.

Translations: `(locale, title, leadParagraph, bodyMarkdown, metaDescription, ogImage?, doctorNote?)`. The `doctorNote` field is the first-party voice pull-quote per discovery §3.

Invariants:

1. A `published` entry must have at least one translation in the default locale (TR).
2. `slug` is unique per `(type, locale)`.
3. Schema.org JSON-LD is auto-generated from entry type at render time.
4. All translations of one entry share a single `hreflangSlugMap` so links across locales stay reciprocal.

### Testimonial (aggregate root)

Identity: `TestimonialId`.

State: `patientId?, displayName, locale, quoteMarkdown, mediaRefs[], conditionId?, serviceId?, consentRecordId, status (submitted|approved|rejected|retracted), submittedAt, approvedAt?, approvedBy?`.

Invariants:

1. `consentRecordId` MUST be present and MUST reference a consent of purpose `testimonial_publication`.
2. Public display requires `status === 'approved'`.
3. `displayName` defaults to `"Hasta Yorumu"` (anonymous) unless the consent explicitly grants name display.
4. Retraction is a one-way state — a retracted testimonial is hidden but not deleted, for audit reasons.

## Value objects

```
LocaleCode      = 'tr' | 'ar' | 'en' | 'fr' | 'es'
DeliveryMode    = 'in_person' | 'home_visit' | 'telehealth'
SlotKind        = 'consultation_30' | 'consultation_15' | 'tms_session_45' | 'iv_therapy_60' | 'home_visit_90'
PhoneE164       = string (validated +XXxxxxxxxxxx)
EmailAddress    = string (lowercased, trimmed, RFC-validated)
Instant         = epoch-millis-utc
Duration        = positive integer minutes
Markdown        = string (sanitised on render, no <script>)
ConsentPurpose  = 'appointment_booking' | 'health_data_processing' | 'testimonial_publication'
                | 'marketing_communications' | 'document_storage' | 'guardian_consent'
                | 'video_consultation_recording' | 'tms_screening_data'
```

All IDs are *branded* (TS phantom types) so a `PatientId` cannot be passed where an `AppointmentId` is expected at compile time.

## Domain services (pure)

- **BookingPolicy** — answers "may this patient book this service at this slot?". Pure function over `(patient, service, slot, screenings, clock)`. Returns `Allowed` or `Denied(reason)`. Used both by the API and by the public availability endpoint to grey-out ineligible slots.
- **CancellationPolicy** — `(appointment, now) → 'allowed' | 'late' | 'forbidden'`. Service-specific cancellation windows.
- **TmsEligibility** — `(screening, age) → 'cleared' | 'requires_review' | 'denied'`. Encodes contraindications for TMS as code, not as a wiki page.
- **ConsentResolver** — `(patient, requiredPurposes) → MissingPurposes[]`. Used by every health-data write to enforce KVKK at the boundary.

## Errors (typed; never thrown raw)

```
DomainError
├── BookingError
│   ├── SlotConflict
│   ├── SlotNotFound
│   ├── SlotInPast
│   ├── ScreeningRequired (for TMS)
│   ├── ConsentMissing(purpose)
│   ├── GuardianRequired
│   └── ReschedulePolicyViolation
├── AuthError
│   ├── InvalidCredentials
│   ├── EmailNotVerified
│   ├── AccountLocked
│   └── OauthMismatch
└── PolicyError
    ├── RateLimitExceeded
    └── PermissionDenied
```

Each error carries a stable `code` (used in API responses + i18n keys), an optional `field` (for form-bound errors), and a `correlationId`.

## What this model deliberately does not include

- **Payments.** Out of MVP scope. Wired as `PaymentRequired` placeholder in the slot DTO; future work.
- **Insurance.** Out of MVP scope.
- **In-app messaging between patient and doctor.** WhatsApp is the channel by user decision (§12.6).
- **Diagnoses, prescriptions, treatment-plan entities.** This is a *booking* and *content* platform; the medical record stays in the doctor's own EHR (or paper). We never become an EHR.
