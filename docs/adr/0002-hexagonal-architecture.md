# ADR-0002 — Hexagonal architecture for the API

**Date:** 2026-04-30
**Status:** Accepted

## Context

Medical-domain logic (eligibility for TMS, slot conflict resolution, KVKK consent rules, telehealth vs. home-visit branching) must be testable without spinning up a Worker, a database, a queue, or an OAuth dance. Compliance auditors must be able to read the rules without learning Cloudflare-specific APIs. The doctor must be able to ask "what happens if a patient cancels at T-2h on a TMS appointment?" and get an answer from a single readable file.

## Decision

Adopt a hexagonal (ports & adapters) architecture inside `apps/api/src/`:

```
src/
├── domain/                          ← pure
│   ├── appointment/
│   │   ├── Appointment.ts           ← entity / aggregate root
│   │   ├── AppointmentStatus.ts     ← value object
│   │   ├── BookingPolicy.ts         ← domain service (TMS pre-screen, lead time)
│   │   └── errors.ts
│   ├── patient/
│   │   ├── Patient.ts
│   │   ├── Consent.ts               ← KVKK açık rıza value object
│   │   └── errors.ts
│   ├── slot/
│   │   ├── Slot.ts
│   │   └── SlotHold.ts
│   ├── service/                     ← clinical service catalogue
│   ├── content/                     ← CMS-lite entities
│   └── shared/
│       ├── ids.ts                   ← branded UUIDs (PatientId, etc.)
│       ├── locale.ts
│       └── time.ts                  ← Instant, Duration value objects
│
├── application/
│   ├── ports/                       ← interfaces ONLY (no impls)
│   │   ├── PatientRepository.ts
│   │   ├── AppointmentRepository.ts
│   │   ├── SlotLockService.ts       ← DO-backed in prod, in-memory in test
│   │   ├── EmailNotifier.ts
│   │   ├── SmsNotifier.ts
│   │   ├── WhatsappNotifier.ts
│   │   ├── BlobStore.ts             ← R2-backed
│   │   ├── KeyValueStore.ts         ← KV-backed
│   │   ├── OauthVerifier.ts
│   │   ├── PasswordHasher.ts        ← Argon2id WebCrypto+WASM impl
│   │   ├── TokenIssuer.ts           ← ES256 JWT signer
│   │   ├── Clock.ts
│   │   └── AuditLogger.ts
│   └── use-cases/
│       ├── booking/
│       │   ├── createAppointment.ts
│       │   ├── rescheduleAppointment.ts
│       │   ├── cancelAppointment.ts
│       │   ├── holdSlot.ts
│       │   └── listAvailability.ts
│       ├── auth/
│       │   ├── registerPatient.ts
│       │   ├── verifyEmail.ts
│       │   ├── login.ts
│       │   ├── refreshSession.ts
│       │   ├── beginGoogleOauth.ts
│       │   └── completeGoogleOauth.ts
│       ├── patient/
│       │   ├── uploadDocument.ts
│       │   └── getMyAppointments.ts
│       └── admin/
│           ├── approveTestimonial.ts
│           ├── manageContent.ts
│           └── exportAppointmentsCsv.ts
│
├── infrastructure/                  ← side-effectful adapters
│   ├── db/
│   │   ├── schema.ts                ← Drizzle table defs
│   │   ├── migrations/
│   │   ├── client.ts                ← Hyperdrive-pooled connection
│   │   └── repositories/            ← port implementations
│   ├── kv/
│   ├── r2/
│   ├── do/
│   │   └── DoctorDayLock.ts         ← Durable Object class
│   ├── queues/
│   │   ├── consumers/
│   │   └── producers/
│   ├── cron/
│   │   └── handlers/
│   ├── crypto/
│   │   └── argon2WebCrypto.ts
│   ├── oauth/
│   │   └── googleOauth.ts
│   └── notifiers/
│       ├── resendEmail.ts
│       ├── netgsmSms.ts
│       ├── twilioSms.ts
│       └── metaWhatsapp.ts
│
├── interfaces/
│   ├── http/
│   │   ├── app.ts                   ← Hono app composition root
│   │   ├── middleware/
│   │   │   ├── auth.ts              ← guard
│   │   │   ├── rbac.ts              ← guard
│   │   │   ├── rateLimit.ts         ← guard
│   │   │   ├── csrf.ts              ← guard for cookie-auth flows
│   │   │   ├── correlationId.ts     ← interceptor
│   │   │   ├── securityHeaders.ts
│   │   │   ├── audit.ts             ← interceptor
│   │   │   └── zodValidator.ts      ← pipe
│   │   ├── routes/
│   │   │   ├── public/              ← /api/v1/public/*  (no auth)
│   │   │   ├── auth/                ← /api/v1/auth/*
│   │   │   ├── booking/             ← /api/v1/booking/*
│   │   │   ├── patient/             ← /api/v1/patient/* (auth)
│   │   │   └── admin/               ← /api/v1/admin/*   (admin auth)
│   │   └── openapi.ts               ← schema generated from Zod DTOs
│   └── workers/
│       ├── fetch.ts                 ← entry point: HTTP fetch handler
│       ├── queue.ts                 ← queue consumer entry
│       ├── scheduled.ts             ← cron entry
│       └── do.ts                    ← Durable Object entry
│
└── composition/
    └── container.ts                 ← request-scoped DI container builder
```

## Rules

1. **Domain has zero outward dependencies.** No imports from `application/`, `infrastructure/`, `interfaces/`, no third-party packages except `zod` (for value-object schemas) and our own `@dr-bak/shared`.
2. **Application depends only on `domain/` and `application/ports/`.** Never on `infrastructure/` directly.
3. **Infrastructure implements ports.** One adapter per port. Each adapter is replaceable.
4. **Interfaces orchestrate.** Route handlers call use-cases; they don't contain logic.
5. **Composition root is in `composition/container.ts`** — that is the only file allowed to import from all four layers. It builds a `Container` per request and wires concrete adapters to ports.

## Testing strategy by layer

| Layer | Test type | Tool | What we test |
|---|---|---|---|
| `domain/` | unit | Vitest | Invariants, state transitions, value-object equality |
| `application/` | use-case | Vitest + in-memory adapters | End-to-end behaviour of a single use-case |
| `infrastructure/` | integration | Vitest + Miniflare | Adapter contract conformance + real platform binding |
| `interfaces/http/` | API e2e | Vitest + Miniflare | Route → use-case → adapter; status codes, headers |
| Whole stack | browser e2e | Playwright | Real booking flow, RTL on AR, accessibility |

## Consequences

- Code review can locate any rule in <30 seconds (find the file in `domain/` or `application/`).
- Adding Twilio as SMS fallback after NetGSM is a 1-hour change: implement `SmsNotifier` again, wire in container.
- Migrating off Cloudflare is a 2–3-week port of `infrastructure/` and `interfaces/workers/`; nothing in `domain/` or `application/` changes.
- One-time onboarding cost: developers new to hexagonal need a 30-min orientation. Worth it.
