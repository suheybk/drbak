# Email sequences

Five sequences. Each sequence has one folder; inside, `tr.md` and `en.md` are
canonical (final voice), and `ar.md` / `fr.md` / `es.md` are first-pass
placeholders flagged `STATUS: needs medical-translator review` per
`memory/dr-bak-locked-decisions.md` §12.14.

| Sequence | Trigger | Channel(s) | Folder |
|---|---|---|---|
| Booking confirmation | `appointment.created` event | Email + SMS + WhatsApp | `01-booking-confirmation/` |
| T-24h reminder | Cron sweep at T-24h before `startsAt` | Email + SMS | `02-reminder-t-24h/` |
| T-1h reminder (telehealth) | Cron sweep at T-1h, telehealth only | Email + WhatsApp | `03-reminder-t-1h/` |
| No-show recovery | Cron sweep 6h after `startsAt` if status = `no_show` | Email | `04-no-show-recovery/` |
| Post-visit nurture | 48h after `appointment.completed` | Email | `05-post-visit-nurture/` |

## Variables

Every template uses these substitutions, evaluated server-side (`apps/api`
notifier). Names match `OutboundEmail.payload`:

| Variable | Source | Notes |
|---|---|---|
| `{{patient_first_name}}` | `patients.full_name` first token | Honorifics handled per locale below |
| `{{appointment_date}}` | `appointments.starts_at` formatted via `Intl.DateTimeFormat(locale)` | Western digits forced in AR (numberingSystem: 'latn') |
| `{{appointment_time}}` | same | 24h, Europe/Istanbul |
| `{{service_title}}` | `service_translations.title` | Already localised |
| `{{delivery_mode}}` | `appointments.delivery_mode` enum mapped to localised label | `in_person`/`home_visit`/`telehealth` |
| `{{join_url}}` | `appointments.telehealth_join_url` | Only present for telehealth |
| `{{reschedule_url}}` | `appointments.reschedule_url` | HMAC-signed, expires in 7d |
| `{{cancel_url}}` | `appointments.cancel_url` | HMAC-signed, expires in 7d |
| `{{clinic_phone}}` | `+90 530 087 43 91` | Western digits via `digit-western` class in HTML version |
| `{{clinic_email}}` | `info@uzmdroguzbak.com` | |
| `{{address}}` | "Helis More Residence, Kartal/İstanbul" | |
| `{{kvkk_url}}` | `https://uzmdroguzbak.com/<locale>/kvkk` | Localised |

## Compliance gates per send

Every send goes through these gates server-side:

1. **Marketing nurture (sequence 05)** — recipient's `consent_records` row
   for purpose `marketing_communications` must be `granted`. If revoked,
   the send is suppressed.
2. **Transactional (sequences 01–04)** — KVKK lawful basis is
   *contract-performance*, not consent; these can send without marketing
   consent. Still subject to per-channel gates (NetGSM İYS, Meta WA template
   approval).
3. **No fee-listing.** Templates must not embed currency amounts. The system
   enforces this via the `noFeeListing` linter on render.
4. **No "guaranteed result" / "%100 başarı" / "mucize" / "Türkiye'nin en
   iyisi"** — flagged at lint time and on PR review.

## SMS character budget

NetGSM SMS templates are GSM-7 (160 chars) or UCS-2 (70 chars per part if
TR Turkish-specific characters are used). Templates here are tagged
`SMS:GSM-7-X-PARTS` so accounting is explicit.

## How copy maps to channels

Each step file lists one or more `CHANNEL:` blocks. Email blocks include
both `SUBJECT:` and `BODY:`. SMS blocks are 1–2 messages per part. WhatsApp
template names match what we submit to Meta for approval (`booking_confirm`,
`reminder_t24h`, etc.).
