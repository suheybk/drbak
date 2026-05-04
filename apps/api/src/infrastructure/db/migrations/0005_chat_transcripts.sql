-- 0005_chat_transcripts.sql — Tier-2 WhatsApp + web AI assistant
--
-- Two tables:
--   chat_sessions  — one row per conversation (per surface + identity)
--   chat_messages  — message log with column-level AES-GCM encryption
--
-- Encryption: body_ciphertext + body_iv + body_tag are written by the
-- application layer using a per-session key derived from a Workers
-- secret (KMS-style). The DB never sees plaintext. DSAR export
-- decrypts; DSAR erasure zeroes body_ciphertext for the user's rows.
--
-- Retention: chat content follows the 10-year medical-record retention
-- per docs/runbook.md §5. Erasure on KVKK Article 11 request.

CREATE TYPE "chat_surface" AS ENUM ('whatsapp', 'web');
CREATE TYPE "chat_role" AS ENUM ('user', 'assistant', 'tool');

CREATE TABLE "chat_sessions" (
  "id" text PRIMARY KEY,
  "surface" "chat_surface" NOT NULL,
  "patient_id" text REFERENCES "patients"("id") ON DELETE SET NULL,
  "anon_session_id" text,
  "wa_phone_e164" text,
  "locale" "locale" NOT NULL,
  "consent_version" text NOT NULL,
  "consent_granted_at" timestamptz NOT NULL DEFAULT now(),
  "human_takeover_until" timestamptz,
  "tokens_in_total" integer NOT NULL DEFAULT 0,
  "tokens_out_total" integer NOT NULL DEFAULT 0,
  "cost_kurus_total" integer NOT NULL DEFAULT 0,
  "last_message_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "chat_sessions_identity_chk" CHECK (
    patient_id IS NOT NULL OR anon_session_id IS NOT NULL OR wa_phone_e164 IS NOT NULL
  )
);

CREATE INDEX "chat_sessions_patient_idx" ON "chat_sessions" ("patient_id");
CREATE INDEX "chat_sessions_phone_idx" ON "chat_sessions" ("wa_phone_e164");
CREATE INDEX "chat_sessions_anon_idx" ON "chat_sessions" ("anon_session_id");

CREATE TABLE "chat_messages" (
  "id" text PRIMARY KEY,
  "session_id" text NOT NULL REFERENCES "chat_sessions"("id") ON DELETE CASCADE,
  "role" "chat_role" NOT NULL,
  -- AES-GCM encrypted body; key derived from per-session salt + Workers secret
  "body_ciphertext" bytea NOT NULL,
  "body_iv" bytea NOT NULL,
  "body_tag" bytea NOT NULL,
  -- Tool call metadata (also encrypted when present)
  "tool_name" text,
  "tool_args_ciphertext" bytea,
  "tool_args_iv" bytea,
  "tool_args_tag" bytea,
  "tokens_in" integer,
  "tokens_out" integer,
  "model" text,
  "stop_reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "chat_messages_session_idx" ON "chat_messages" ("session_id", "created_at");

-- Per-day per-patient cost cap counter (KV would be lighter, but we want
-- transactional correctness with the message insert)
CREATE TABLE "chat_daily_spend" (
  "patient_id" text NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
  "ymd" date NOT NULL,
  "messages" integer NOT NULL DEFAULT 0,
  "cost_kurus" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("patient_id", "ymd")
);
