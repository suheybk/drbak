# API surface — `/api/v1/*`

> The full OpenAPI 3.1 spec is auto-generated from the Hono+Zod route definitions in
> `apps/api/src/interfaces/http/routes/**/*.ts` and emitted to `docs/openapi.yaml` by
> `pnpm openapi:emit` (Drop 3). This document is the human index of that surface so
> reviewers can see the shape at a glance without reading the YAML.
>
> Authentication: `Bearer <jwt>` unless explicitly marked `(anon)`. CSRF cookie required
> on cookie-auth flows (`/auth/*`).
>
> Every mutating endpoint accepts an optional `Idempotency-Key` header.
> Every endpoint accepts `Accept-Language` and a `?locale=` query (query wins).
> Every error response uses the [`ApiError` envelope](../packages/contracts/src/errors.ts).

## Public — `/api/v1/public/*` (anon)

| Method | Path | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/public/services` | Service catalogue, locale-resolved | `?locale=tr` | `ServiceSummary[]` |
| GET | `/public/services/:slug` | Service detail incl. content | `?locale=tr` | `ServiceSummary & ContentEntryDetail` |
| GET | `/public/conditions` | Condition catalogue | `?locale=tr` | `ConditionSummary[]` |
| GET | `/public/conditions/:slug` | Condition detail | `?locale=tr` | `ConditionDetail` |
| GET | `/public/availability` | Day's slots for service+date+delivery | `AvailabilityQuery` (qs) | `AvailabilityResponse` |
| GET | `/public/content/:type/:slug` | Blog/guide/legal/faq lookup | `?locale=tr` | `ContentEntryDetail` |
| GET | `/public/content` | List published content | `ListContentQuery` (qs) | `{ items: ContentEntrySummary[], nextCursor?: string }` |
| GET | `/public/testimonials` | Approved-only public testimonials | `?locale=tr` | `TestimonialPublic[]` |
| POST | `/public/booking/holds` | Reserve a slot for 5 min (anon OK; appt requires auth) | `HoldSlotRequest` | `SlotHold` |

## Auth — `/api/v1/auth/*`

| Method | Path | Purpose | Request | Response |
|---|---|---|---|---|
| POST | `/auth/register` | Patient sign-up; sends verification email | `RegisterRequest` | `{ userId, emailSent: true }` |
| POST | `/auth/login` | Email+password login; sets refresh cookie | `LoginRequest` | `TokenPair` |
| POST | `/auth/logout` | Revoke refresh family | — | `204` |
| POST | `/auth/refresh` | Rotate refresh; issue new access (cookie auth) | — | `TokenPair` |
| POST | `/auth/email/verify` | Confirm email via token | `VerifyEmailRequest` | `204` |
| POST | `/auth/email/resend` | Re-send verification (rate-limited 3/day) | `{ email }` | `204` |
| POST | `/auth/password/reset/request` | Send reset email | `PasswordResetRequest` | `204` |
| POST | `/auth/password/reset/confirm` | Apply new password | `PasswordResetConfirm` | `204` |
| GET | `/auth/oauth/:provider/begin` | Start OAuth (Google) | `?redirectAfter` | `302 → provider` |
| GET | `/auth/oauth/:provider/callback` | OAuth callback | `?code&state` | `302 → app` |
| GET | `/auth/me` | Current session user (auth required) | — | `SessionUser` |
| POST | `/auth/webauthn/register/begin` | Begin passkey enrolment (admin/staff) | — | `WebAuthnCreationOptions` |
| POST | `/auth/webauthn/register/finish` | Finish passkey enrolment | `RegistrationResponseJSON` | `204` |

## Patient — `/api/v1/patient/*` (role: patient | staff | admin)

| Method | Path | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/patient/me` | Patient profile | — | `PatientProfile` |
| PATCH | `/patient/me` | Update profile | `PatientUpdateRequest` | `PatientProfile` |
| GET | `/patient/me/appointments` | Patient's appointments | `?status&from&to` | `Appointment[]` |
| GET | `/patient/me/appointments/:id` | Single appointment | — | `Appointment` |
| POST | `/patient/me/appointments` | Create appointment from a held slot | `CreateAppointmentRequest` | `Appointment` |
| POST | `/patient/me/appointments/:id/reschedule` | Reschedule (within window) | `RescheduleAppointmentRequest` | `Appointment` |
| POST | `/patient/me/appointments/:id/cancel` | Cancel | `CancelAppointmentRequest` | `Appointment` |
| GET | `/patient/me/documents` | Documents list | — | `PatientDocument[]` |
| POST | `/patient/me/documents/upload-url` | Mint presigned R2 upload URL | `RequestUpload` | `PresignedUpload` |
| POST | `/patient/me/documents/:id/finalize` | Confirm upload completed; queue scan | — | `PatientDocument` |
| GET | `/patient/me/documents/:id/download-url` | Mint signed download URL (1h TTL) | — | `{ url, expiresAt }` |
| DELETE | `/patient/me/documents/:id` | Soft-delete document | — | `204` |
| GET | `/patient/me/consents` | Active consents | — | `ConsentRecord[]` |
| POST | `/patient/me/consents/:purpose/withdraw` | Withdraw a consent | — | `204` |
| POST | `/patient/me/tms-screening` | Submit TMS screening | `TmsScreeningAnswers` | `{ status }` |

## Public-token URLs (signed, anon)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/links/appointment/:token` | Resolve a signed reschedule/cancel token to an action page (server-validated) |
| POST | `/api/v1/links/appointment/:token/cancel` | Execute cancellation via token |

## Admin — `/api/v1/admin/*` (role: admin; staff for limited subset)

| Method | Path | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/admin/appointments` | List with filters | `?status&from&to&serviceId` | `Appointment[]` |
| GET | `/admin/appointments.csv` | Export | — | `text/csv` |
| POST | `/admin/appointments/:id/confirm` | Manual confirm | — | `Appointment` |
| POST | `/admin/appointments/:id/cancel` | Cancel by clinic | `{ reason }` | `Appointment` |
| POST | `/admin/appointments/:id/complete` | Mark completed | — | `Appointment` |
| POST | `/admin/appointments/:id/no-show` | Mark no-show (after grace) | — | `Appointment` |
| GET | `/admin/services` | Services CRUD | — | `Service[]` |
| POST | `/admin/services` | Create service | `ServiceWriteRequest` | `Service` |
| PATCH | `/admin/services/:id` | Update | `ServiceWriteRequest` | `Service` |
| GET | `/admin/conditions` | Conditions CRUD | — | `Condition[]` |
| POST | `/admin/conditions` | Create | `ConditionWriteRequest` | `Condition` |
| PATCH | `/admin/conditions/:id` | Update | `ConditionWriteRequest` | `Condition` |
| GET | `/admin/content` | Content list | `?type&status&locale` | `ContentEntrySummary[]` |
| POST | `/admin/content` | Create entry | `ContentEntryCreateRequest` | `ContentEntryDetail` |
| PATCH | `/admin/content/:id` | Update entry | `ContentEntryUpdateRequest` | `ContentEntryDetail` |
| POST | `/admin/content/:id/publish` | Publish | — | `ContentEntryDetail` |
| POST | `/admin/content/:id/archive` | Archive | — | `ContentEntryDetail` |
| GET | `/admin/testimonials` | Testimonials list | `?status` | `Testimonial[]` |
| POST | `/admin/testimonials/:id/approve` | Approve for public display | — | `Testimonial` |
| POST | `/admin/testimonials/:id/reject` | Reject | `{ reason }` | `Testimonial` |
| GET | `/admin/slots/templates` | Slot templates | — | `SlotTemplate[]` |
| POST | `/admin/slots/templates` | Create | `SlotTemplateWrite` | `SlotTemplate` |
| POST | `/admin/slots/blackouts` | Create blackout | `BlackoutWrite` | `Blackout` |
| POST | `/admin/slots/overrides` | One-off slot | `OverrideWrite` | `Override` |
| GET | `/admin/audit-log` | Audit log query | `?targetUserId&from&to&action` | `AuditEvent[]` |
| GET | `/admin/users` | User list | — | `User[]` |
| POST | `/admin/users/:id/role` | Change role (admin only) | `{ role }` | `User` |
| POST | `/admin/dsar/:userId/access` | KVKK Article 11 access (export bundle) | — | `{ url }` |
| POST | `/admin/dsar/:userId/erase` | KVKK Article 11 erasure | `{ confirmText }` | `{ erasedAt }` |
| GET | `/admin/certificates` | Doctor's certificates | — | `Certificate[]` |
| POST | `/admin/certificates` | Add certificate | `CertificateWrite` | `Certificate` |

## Webhooks — `/api/v1/webhooks/*`

| Method | Path | Purpose | Notes |
|---|---|---|---|
| POST | `/webhooks/resend` | Email delivery / bounce events | HMAC verified |
| POST | `/webhooks/netgsm` | SMS delivery reports | HMAC verified |
| POST | `/webhooks/meta-whatsapp` | WhatsApp delivery + verification | `?verify_token` for verification handshake |

## Health & meta

| Method | Path | Purpose |
|---|---|---|
| GET | `/healthz` | Liveness; returns `{ ok: true, env, region }` |
| GET | `/readyz` | Readiness; pings KV + DB |
| GET | `/.well-known/jwks.json` | JWKS for token verification |
| GET | `/api/v1/openapi.json` | Live OpenAPI spec |
