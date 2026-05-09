/**
 * The full Worker Env (bindings + vars + secrets) — typed once and used everywhere.
 * Kept here at the workers entry boundary so domain/application never know about it.
 */
import type {
  DurableObjectNamespace,
  ExecutionContext,
  Hyperdrive,
  KVNamespace,
  Queue,
  R2Bucket,
} from '@cloudflare/workers-types';

export interface Env {
  // ── Vars ─────────────────────────────────────
  ENVIRONMENT: 'dev' | 'staging' | 'production';
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  DEFAULT_LOCALE: string;
  SUPPORTED_LOCALES: string;
  PUBLIC_BASE_URL: string;
  APP_BASE_URL: string;
  /**
   * Absolute base URL of the API itself (no trailing slash, no /api/v1 suffix).
   * If set, used verbatim for OAuth redirect URIs and any other place we need
   * the API's externally-reachable origin. If unset, code derives it from
   * PUBLIC_BASE_URL by prefixing the host with `api.` — that derivation only
   * holds when the production DNS scheme (api.uzmdroguzbak.com) is live, so
   * staging deploys MUST set this explicitly to the workers.dev URL until
   * DNS cut-over (LAUNCH-CHECKLIST §A4).
   */
  API_BASE_URL?: string;
  SLOT_HOLD_TTL_SECONDS: string;
  TOKEN_ACCESS_TTL_SECONDS: string;
  TOKEN_REFRESH_TTL_SECONDS: string;
  RATE_LIMIT_ANON_RPM: string;
  RATE_LIMIT_AUTH_RPM: string;
  RATE_LIMIT_LOGIN_PER_15M: string;
  CONSENT_DOCUMENT_VERSION: string;
  CLINIC_TIMEZONE: string;
  DEFAULT_SLOT_DURATION_MINUTES: string;
  TMS_SCREENING_VALIDITY_DAYS: string;
  APPOINTMENT_RESCHEDULE_WINDOW_HOURS: string;
  APPOINTMENT_CANCEL_WINDOW_HOURS: string;

  // ── KV ──────────────────────────────────────
  KV_SESSIONS: KVNamespace;
  KV_RATELIMIT: KVNamespace;
  KV_IDEMPOTENCY: KVNamespace;
  KV_CACHE: KVNamespace;

  // ── R2 ──────────────────────────────────────
  R2_DOCUMENTS: R2Bucket;
  R2_MEDIA: R2Bucket;

  // ── Durable Objects ─────────────────────────
  DOCTOR_DAY_LOCK: DurableObjectNamespace;

  // ── Queues ──────────────────────────────────
  QUEUE_NOTIFICATIONS: Queue;
  QUEUE_WEBHOOKS: Queue;

  // ── Hyperdrive ──────────────────────────────
  HYPERDRIVE_DB: Hyperdrive;

  // ── Secrets ─────────────────────────────────
  DATABASE_URL: string;
  JWT_SIGNING_PRIVATE_KEY: string;
  JWT_SIGNING_PUBLIC_KEY: string;
  JWT_SIGNING_KID: string;
  RESEND_API_KEY: string;
  /** Optional FROM address for outbound mail (Resend). Falls back to a
   * staging-friendly `onboarding@resend.dev` sender when unset. */
  EMAIL_FROM?: string;
  EMAIL_REPLY_TO?: string;
  CONTACT_EMAIL?: string;
  NETGSM_USERNAME: string;
  NETGSM_PASSWORD: string;
  NETGSM_SENDER_ID: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_FROM_NUMBER?: string;
  META_WA_ACCESS_TOKEN: string;
  META_WA_PHONE_NUMBER_ID: string;
  META_WA_VERIFY_TOKEN: string;
  GOOGLE_OAUTH_CLIENT_ID: string;
  GOOGLE_OAUTH_CLIENT_SECRET: string;
  JITSI_APP_ID: string;
  JITSI_APP_SECRET: string;
  ADMIN_BOOTSTRAP_EMAIL?: string;

  // Tier-2 chat assistant
  ANTHROPIC_API_KEY?: string;
}

export type WorkerCtx = ExecutionContext;
