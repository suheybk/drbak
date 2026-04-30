-- Drizzle migration 0001 — initial schema
-- Generated and hand-reviewed; do not regenerate without comparing diff.
-- Apply with `pnpm db:migrate` against a Neon dev branch first.

-- ─── Enums ─────────────────────────────────────────────────────────────────────
CREATE TYPE "locale" AS ENUM ('tr', 'ar', 'en', 'fr', 'es');
CREATE TYPE "role" AS ENUM ('patient', 'staff', 'admin', 'doctor');
CREATE TYPE "delivery_mode" AS ENUM ('in_person', 'home_visit', 'telehealth');
CREATE TYPE "slot_kind" AS ENUM (
  'consultation_30','consultation_15','tms_session_45','iv_therapy_60','home_visit_90'
);
CREATE TYPE "appointment_status" AS ENUM (
  'created','confirmed','rescheduled','cancelled_by_patient',
  'cancelled_by_clinic','late_cancellation','no_show','completed'
);
CREATE TYPE "consent_purpose" AS ENUM (
  'appointment_booking','health_data_processing','testimonial_publication',
  'marketing_communications','document_storage','guardian_consent',
  'video_consultation_recording','tms_screening_data'
);
CREATE TYPE "document_mime_kind" AS ENUM ('image','pdf','dicom','text','other');
CREATE TYPE "document_scan_status" AS ENUM ('pending','clean','infected','failed');
CREATE TYPE "testimonial_status" AS ENUM ('submitted','approved','rejected','retracted');
CREATE TYPE "content_entry_type" AS ENUM ('blog','condition','service','faq','guide','legal');
CREATE TYPE "content_entry_status" AS ENUM ('draft','review','published','archived');
CREATE TYPE "tms_screening_status" AS ENUM (
  'pending_review','cleared','requires_review','denied','expired'
);
CREATE TYPE "audit_action" AS ENUM (
  'create','read','update','soft_delete','hard_delete','login','logout',
  'consent_grant','consent_withdraw','document_upload','document_download','export'
);
CREATE TYPE "notification_channel" AS ENUM ('email','sms','whatsapp');
CREATE TYPE "notification_status" AS ENUM ('queued','sent','failed','dlq');

-- ─── Identity ──────────────────────────────────────────────────────────────────
CREATE TABLE "users" (
  "id" text PRIMARY KEY,
  "email" text NOT NULL,
  "email_normalized" text NOT NULL,
  "email_verified_at" timestamptz,
  "password_hash" text,
  "role" "role" NOT NULL DEFAULT 'patient',
  "locale" "locale" NOT NULL DEFAULT 'tr',
  "failed_login_count" integer NOT NULL DEFAULT 0,
  "locked_until" timestamptz,
  "last_login_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz
);
CREATE UNIQUE INDEX "users_email_normalized_unique" ON "users"("email_normalized");
CREATE INDEX "users_role_idx" ON "users"("role");

CREATE TABLE "oauth_accounts" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "provider" text NOT NULL,
  "provider_account_id" text NOT NULL,
  "email" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "oauth_provider_account_unique" ON "oauth_accounts"("provider","provider_account_id");
CREATE INDEX "oauth_user_idx" ON "oauth_accounts"("user_id");

CREATE TABLE "webauthn_credentials" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "public_key" text NOT NULL,
  "counter" integer NOT NULL DEFAULT 0,
  "transports" jsonb,
  "label" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "last_used_at" timestamptz
);

-- ─── Patients ──────────────────────────────────────────────────────────────────
CREATE TABLE "patients" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE RESTRICT,
  "full_name" text NOT NULL,
  "date_of_birth" date NOT NULL,
  "gender" text,
  "phone_e164" text,
  "address_line1" text,
  "address_line2" text,
  "city" text,
  "postal_code" text,
  "country_iso2" text NOT NULL DEFAULT 'TR',
  "emergency_contact_name" text,
  "emergency_contact_phone_e164" text,
  "guardian_patient_id" text REFERENCES "patients"("id"),
  "notes_internal" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz
);
CREATE UNIQUE INDEX "patients_user_unique" ON "patients"("user_id");
CREATE INDEX "patients_guardian_idx" ON "patients"("guardian_patient_id");

-- ─── Doctors / clinic ──────────────────────────────────────────────────────────
CREATE TABLE "doctors" (
  "id" text PRIMARY KEY,
  "user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "full_name" text NOT NULL,
  "title_short" text NOT NULL DEFAULT 'Uzm. Dr.',
  "primary_specialty" text NOT NULL DEFAULT 'Nöroloji',
  "sub_specialty" text DEFAULT 'Algoloji',
  "bio" text,
  "photo_url" text,
  "schema_json_ld" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "clinics" (
  "id" text PRIMARY KEY,
  "brand_name" text NOT NULL,
  "address_line1" text NOT NULL,
  "address_line2" text,
  "district" text NOT NULL,
  "city" text NOT NULL,
  "postal_code" text,
  "country_iso2" text NOT NULL DEFAULT 'TR',
  "geo_lat" text,
  "geo_lng" text,
  "phone_e164" text NOT NULL,
  "whatsapp_e164" text,
  "email" text,
  "hours_json" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "certificates" (
  "id" text PRIMARY KEY,
  "doctor_id" text NOT NULL REFERENCES "doctors"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "issuer" text,
  "issued_year" smallint,
  "image_url" text,
  "display_on_site" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- ─── Service catalogue ─────────────────────────────────────────────────────────
CREATE TABLE "services" (
  "id" text PRIMARY KEY,
  "slug" text NOT NULL,
  "pillar" text NOT NULL,
  "duration_minutes" integer NOT NULL,
  "delivery_modes" jsonb NOT NULL,
  "requires_tms_screening" boolean NOT NULL DEFAULT false,
  "min_patient_age_years" smallint NOT NULL DEFAULT 1,
  "max_patient_age_years" smallint,
  "published_at" timestamptz,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "services_slug_unique" ON "services"("slug");
CREATE INDEX "services_pillar_idx" ON "services"("pillar");

CREATE TABLE "service_translations" (
  "service_id" text NOT NULL REFERENCES "services"("id") ON DELETE CASCADE,
  "locale" "locale" NOT NULL,
  "title" text NOT NULL,
  "lead_paragraph" text,
  "body_markdown" text,
  "meta_description" text,
  "slug_localised" text,
  PRIMARY KEY ("service_id","locale")
);
CREATE INDEX "service_translations_slug_idx" ON "service_translations"("locale","slug_localised");

CREATE TABLE "conditions" (
  "id" text PRIMARY KEY,
  "slug" text NOT NULL,
  "icd10" text,
  "pillar" text NOT NULL,
  "published_at" timestamptz,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "conditions_slug_unique" ON "conditions"("slug");

CREATE TABLE "condition_translations" (
  "condition_id" text NOT NULL REFERENCES "conditions"("id") ON DELETE CASCADE,
  "locale" "locale" NOT NULL,
  "title" text NOT NULL,
  "lead_paragraph" text,
  "body_markdown" text,
  "meta_description" text,
  "slug_localised" text,
  PRIMARY KEY ("condition_id","locale")
);
CREATE INDEX "condition_translations_slug_idx" ON "condition_translations"("locale","slug_localised");

CREATE TABLE "service_conditions" (
  "service_id" text NOT NULL REFERENCES "services"("id") ON DELETE CASCADE,
  "condition_id" text NOT NULL REFERENCES "conditions"("id") ON DELETE CASCADE,
  "is_primary" boolean NOT NULL DEFAULT false,
  PRIMARY KEY ("service_id","condition_id")
);

-- ─── Slot rules ────────────────────────────────────────────────────────────────
CREATE TABLE "slot_templates" (
  "id" text PRIMARY KEY,
  "doctor_id" text NOT NULL REFERENCES "doctors"("id") ON DELETE RESTRICT,
  "service_id" text NOT NULL REFERENCES "services"("id") ON DELETE RESTRICT,
  "days_of_week" jsonb NOT NULL,
  "start_time" text NOT NULL,
  "end_time" text NOT NULL,
  "slot_duration_minutes" integer NOT NULL,
  "buffer_minutes" integer NOT NULL DEFAULT 0,
  "valid_from" date NOT NULL,
  "valid_until" date,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "slot_blackouts" (
  "id" text PRIMARY KEY,
  "doctor_id" text NOT NULL REFERENCES "doctors"("id") ON DELETE CASCADE,
  "starts_at" timestamptz NOT NULL,
  "ends_at" timestamptz NOT NULL,
  "reason_internal" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "slot_overrides" (
  "id" text PRIMARY KEY,
  "doctor_id" text NOT NULL REFERENCES "doctors"("id") ON DELETE CASCADE,
  "service_id" text NOT NULL REFERENCES "services"("id") ON DELETE RESTRICT,
  "starts_at" timestamptz NOT NULL,
  "duration_minutes" integer NOT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- ─── Appointments ──────────────────────────────────────────────────────────────
CREATE TABLE "appointments" (
  "id" text PRIMARY KEY,
  "patient_id" text NOT NULL REFERENCES "patients"("id") ON DELETE RESTRICT,
  "doctor_id" text NOT NULL REFERENCES "doctors"("id") ON DELETE RESTRICT,
  "service_id" text NOT NULL REFERENCES "services"("id") ON DELETE RESTRICT,
  "delivery_mode" "delivery_mode" NOT NULL,
  "starts_at" timestamptz NOT NULL,
  "ends_at" timestamptz NOT NULL,
  "status" "appointment_status" NOT NULL DEFAULT 'created',
  "locale" "locale" NOT NULL,
  "patient_notes" text,
  "home_address_line1" text,
  "home_address_line2" text,
  "telehealth_room_id" text,
  "telehealth_join_url" text,
  "telehealth_expires_at" timestamptz,
  "rescheduled_from_appointment_id" text,
  "cancel_reason" text,
  "cancelled_at" timestamptz,
  "completed_at" timestamptz,
  "correlation_id" text NOT NULL,
  "idempotency_key" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "appointments_doctor_slot_unique"
  ON "appointments"("doctor_id","starts_at")
  WHERE status NOT IN ('cancelled_by_patient','cancelled_by_clinic','late_cancellation','no_show');
CREATE INDEX "appointments_patient_idx" ON "appointments"("patient_id");
CREATE INDEX "appointments_status_idx" ON "appointments"("status");
CREATE INDEX "appointments_starts_at_idx" ON "appointments"("starts_at");
CREATE UNIQUE INDEX "appointments_idempotency_unique"
  ON "appointments"("idempotency_key") WHERE idempotency_key IS NOT NULL;

CREATE TABLE "appointment_status_history" (
  "id" text PRIMARY KEY,
  "appointment_id" text NOT NULL REFERENCES "appointments"("id") ON DELETE CASCADE,
  "from_status" "appointment_status",
  "to_status" "appointment_status" NOT NULL,
  "actor_user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "reason" text,
  "at" timestamptz NOT NULL DEFAULT now()
);

-- ─── TMS screenings ────────────────────────────────────────────────────────────
CREATE TABLE "tms_screenings" (
  "id" text PRIMARY KEY,
  "patient_id" text NOT NULL REFERENCES "patients"("id") ON DELETE RESTRICT,
  "doctor_id" text NOT NULL REFERENCES "doctors"("id") ON DELETE RESTRICT,
  "answers_json" jsonb NOT NULL,
  "status" "tms_screening_status" NOT NULL DEFAULT 'pending_review',
  "decided_at" timestamptz,
  "decided_by_user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "decision_notes" text,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "tms_screenings_patient_idx" ON "tms_screenings"("patient_id","status");

-- ─── KVKK consent ──────────────────────────────────────────────────────────────
CREATE TABLE "consent_documents" (
  "id" text PRIMARY KEY,
  "purpose" "consent_purpose" NOT NULL,
  "version" text NOT NULL,
  "locale" "locale" NOT NULL,
  "body_markdown" text NOT NULL,
  "published_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "consent_records" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "purpose" "consent_purpose" NOT NULL,
  "consent_document_id" text NOT NULL REFERENCES "consent_documents"("id") ON DELETE RESTRICT,
  "granted" boolean NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "locale" "locale" NOT NULL,
  "granted_at" timestamptz NOT NULL DEFAULT now(),
  "withdrawn_at" timestamptz
);
CREATE INDEX "consent_records_user_purpose_idx" ON "consent_records"("user_id","purpose");

-- ─── Patient documents ─────────────────────────────────────────────────────────
CREATE TABLE "patient_documents" (
  "id" text PRIMARY KEY,
  "patient_id" text NOT NULL REFERENCES "patients"("id") ON DELETE RESTRICT,
  "uploaded_by_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "filename" text NOT NULL,
  "mime_type" text NOT NULL,
  "mime_kind" "document_mime_kind" NOT NULL,
  "size_bytes" integer NOT NULL,
  "r2_key" text NOT NULL,
  "scan_status" "document_scan_status" NOT NULL DEFAULT 'pending',
  "scan_completed_at" timestamptz,
  "description" text,
  "appointment_id" text REFERENCES "appointments"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz
);

-- ─── Testimonials ──────────────────────────────────────────────────────────────
CREATE TABLE "testimonials" (
  "id" text PRIMARY KEY,
  "patient_id" text REFERENCES "patients"("id") ON DELETE SET NULL,
  "display_name" text NOT NULL DEFAULT 'Hasta Yorumu',
  "locale" "locale" NOT NULL,
  "quote_markdown" text NOT NULL,
  "condition_id" text REFERENCES "conditions"("id") ON DELETE SET NULL,
  "service_id" text REFERENCES "services"("id") ON DELETE SET NULL,
  "media_r2_keys" jsonb,
  "consent_record_id" text NOT NULL REFERENCES "consent_records"("id") ON DELETE RESTRICT,
  "status" "testimonial_status" NOT NULL DEFAULT 'submitted',
  "submitted_at" timestamptz NOT NULL DEFAULT now(),
  "approved_at" timestamptz,
  "approved_by_user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "retracted_at" timestamptz
);

-- ─── CMS-lite ──────────────────────────────────────────────────────────────────
CREATE TABLE "content_entries" (
  "id" text PRIMARY KEY,
  "type" "content_entry_type" NOT NULL,
  "slug" text NOT NULL,
  "status" "content_entry_status" NOT NULL DEFAULT 'draft',
  "published_at" timestamptz,
  "author_user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "reviewer_user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "schema_json_ld" jsonb,
  "related_condition_id" text REFERENCES "conditions"("id") ON DELETE SET NULL,
  "related_service_id" text REFERENCES "services"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "content_entries_type_slug_unique" ON "content_entries"("type","slug");
CREATE INDEX "content_entries_status_idx" ON "content_entries"("status","published_at");

CREATE TABLE "content_entry_translations" (
  "content_entry_id" text NOT NULL REFERENCES "content_entries"("id") ON DELETE CASCADE,
  "locale" "locale" NOT NULL,
  "title" text NOT NULL,
  "lead_paragraph" text,
  "body_markdown" text NOT NULL,
  "meta_description" text,
  "og_image_r2_key" text,
  "doctor_note_markdown" text,
  "slug_localised" text NOT NULL,
  "reading_minutes" smallint,
  PRIMARY KEY ("content_entry_id","locale")
);
CREATE INDEX "content_entry_translations_slug_idx" ON "content_entry_translations"("locale","slug_localised");

-- ─── Notifications outbox ──────────────────────────────────────────────────────
CREATE TABLE "notifications" (
  "id" text PRIMARY KEY,
  "channel" "notification_channel" NOT NULL,
  "to_user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "to_email" text,
  "to_phone_e164" text,
  "locale" "locale" NOT NULL,
  "template" text NOT NULL,
  "payload_json" jsonb NOT NULL,
  "status" "notification_status" NOT NULL DEFAULT 'queued',
  "attempts" integer NOT NULL DEFAULT 0,
  "last_error" text,
  "appointment_id" text REFERENCES "appointments"("id") ON DELETE SET NULL,
  "correlation_id" text NOT NULL,
  "scheduled_for" timestamptz NOT NULL DEFAULT now(),
  "sent_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "notifications_status_scheduled_idx" ON "notifications"("status","scheduled_for");
CREATE INDEX "notifications_appointment_idx" ON "notifications"("appointment_id");

-- ─── Audit log ─────────────────────────────────────────────────────────────────
CREATE TABLE "audit_log" (
  "id" text PRIMARY KEY,
  "actor_user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "actor_role" "role",
  "action" "audit_action" NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text NOT NULL,
  "target_user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "correlation_id" text NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "metadata_json" jsonb,
  "at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "audit_log_target_user_idx" ON "audit_log"("target_user_id","at");
CREATE INDEX "audit_log_entity_idx" ON "audit_log"("entity_type","entity_id");
CREATE INDEX "audit_log_actor_idx" ON "audit_log"("actor_user_id","at");

-- ─── Webhook idempotency ───────────────────────────────────────────────────────
CREATE TABLE "webhook_events" (
  "id" text PRIMARY KEY,
  "provider" text NOT NULL,
  "external_id" text NOT NULL,
  "received_at" timestamptz NOT NULL DEFAULT now(),
  "processed_at" timestamptz,
  "payload_json" jsonb NOT NULL
);
CREATE UNIQUE INDEX "webhook_events_provider_external_unique" ON "webhook_events"("provider","external_id");
