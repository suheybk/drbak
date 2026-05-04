/**
 * Production composition root.
 *
 * Builds a per-request Container wired with real adapters. Tests build their own
 * via `Container.bindValue(...)` overrides — see `test/fixtures/`.
 *
 * Notifiers and the email-sending adapters are wired in Drop 3b. For now the
 * container binds in-memory no-op stubs for those, so booking still works
 * end-to-end without a notifier service.
 */

import type { ExecutionContext } from '@cloudflare/workers-types';
import type {
  AvailabilityProjector,
  OneTimeTokenStore,
  RateLimiter,
  SessionStore,
  UserRepository,
} from '../application/ports/index.js';
import { Argon2idHasher } from '../infrastructure/crypto/Argon2idHasher.js';
import { Es256TokenIssuer } from '../infrastructure/crypto/Es256TokenIssuer.js';
import { HmacSignedUrlMinter } from '../infrastructure/crypto/HmacSignedUrlMinter.js';
import { HmacUploadTokenMinter } from '../infrastructure/crypto/HmacUploadTokenMinter.js';
import { SystemClock } from '../infrastructure/crypto/SystemClock.js';
import {
  UlidIdGenerator,
  WebcryptoRandomTokens,
} from '../infrastructure/crypto/UlidIdGenerator.js';
import { buildDb } from '../infrastructure/db/client.js';
import { DrizzleAppointmentRepo } from '../infrastructure/db/repositories/DrizzleAppointmentRepo.js';
import { DrizzleAuditLogger } from '../infrastructure/db/repositories/DrizzleAuditLogger.js';
import { DrizzleAvailabilityProjector } from '../infrastructure/db/repositories/DrizzleAvailabilityProjector.js';
import { DrizzleConsentRepo } from '../infrastructure/db/repositories/DrizzleConsentRepo.js';
import { DrizzleDoctorCatalogue } from '../infrastructure/db/repositories/DrizzleDoctorCatalogue.js';
import { DrizzlePatientRepo } from '../infrastructure/db/repositories/DrizzlePatientRepo.js';
import { DrizzleServiceCatalogue } from '../infrastructure/db/repositories/DrizzleServiceCatalogue.js';
import { DrizzleTmsScreeningRepo } from '../infrastructure/db/repositories/DrizzleTmsScreeningRepo.js';
import { DrizzleUserRepo } from '../infrastructure/db/repositories/DrizzleUserRepo.js';
import { SlotLockClient } from '../infrastructure/do/SlotLockClient.js';
import { KVIdempotencyStore } from '../infrastructure/kv/KVIdempotencyStore.js';
import { KVOneTimeTokenStore } from '../infrastructure/kv/KVOneTimeTokenStore.js';
import { KVRateLimiter } from '../infrastructure/kv/KVRateLimiter.js';
import { KVSessionStore } from '../infrastructure/kv/KVSessionStore.js';
import { AnthropicClaudeProvider } from '../infrastructure/llm/AnthropicClaudeProvider.js';
import { JitsiTelehealthFactory } from '../infrastructure/notifiers/JitsiTelehealthFactory.js';
import {
  QueueEmailNotifier,
  QueueSmsNotifier,
  QueueWhatsappNotifier,
} from '../infrastructure/notifiers/QueueNotifierEnqueuers.js';
import { GoogleOauthClient } from '../infrastructure/oauth/GoogleOauthClient.js';
import type { Env } from '../interfaces/workers/env.js';
import { Container } from './container.js';
import { token } from './container.js';
import { T } from './tokens.js';

/** Extra tokens not in `T` because they're auth-only or read-side-only. */
export const Tx = {
  UserRepository: token<UserRepository>('UserRepository'),
  SessionStore: token<SessionStore>('SessionStore'),
  RateLimiter: token<RateLimiter>('RateLimiter'),
  OneTimeTokenStore: token<OneTimeTokenStore>('OneTimeTokenStore'),
  AvailabilityProjector: token<AvailabilityProjector>('AvailabilityProjector'),
} as const;

export const buildContainer = (env: Env, ctx: ExecutionContext): Container => {
  const c = new Container();
  c.bindValue(T.Env, env);
  c.bindValue(T.WorkerCtx, ctx);

  // DB (per-request — Drizzle client is request-scoped).
  // We use the @neondatabase/serverless HTTP driver, which speaks HTTPS
  // straight to Neon — no TCP, no connection pool needed. Hyperdrive is
  // for TCP-based drivers (pg / postgres-js); pairing it with the HTTP
  // driver gives an empty connection string. The Hyperdrive binding
  // stays in wrangler.toml for the future migration to a TCP driver.
  c.bindSingleton(token<ReturnType<typeof buildDb>>('Db'), () =>
    buildDb({ connectionString: env.DATABASE_URL }),
  );

  // Stateless infra
  c.bindSingleton(T.Clock, () => new SystemClock());
  c.bindSingleton(T.IdGenerator, () => new UlidIdGenerator());

  // Crypto
  c.bindSingleton(
    T.SignedUrlMinter,
    () => new HmacSignedUrlMinter(env.JWT_SIGNING_PRIVATE_KEY, env.PUBLIC_BASE_URL),
  );
  c.bindSingleton(
    T.UploadTokenMinter,
    () => new HmacUploadTokenMinter(env.JWT_SIGNING_PRIVATE_KEY),
  );

  // Repositories
  c.bindSingleton(
    T.PatientRepository,
    (cc) => new DrizzlePatientRepo(cc.resolve(token('Db') as never) as never),
  );
  c.bindSingleton(
    T.AppointmentRepository,
    (cc) => new DrizzleAppointmentRepo(cc.resolve(token('Db') as never) as never),
  );
  c.bindSingleton(
    T.ConsentRepository,
    (cc) => new DrizzleConsentRepo(cc.resolve(token('Db') as never) as never),
  );
  c.bindSingleton(
    T.TmsScreeningRepository,
    (cc) => new DrizzleTmsScreeningRepo(cc.resolve(token('Db') as never) as never),
  );
  c.bindSingleton(
    T.ServiceCatalogue,
    (cc) => new DrizzleServiceCatalogue(cc.resolve(token('Db') as never) as never),
  );
  c.bindSingleton(
    T.AuditLogger,
    (cc) => new DrizzleAuditLogger(cc.resolve(token('Db') as never) as never),
  );
  c.bindSingleton(
    T.DoctorCatalogue,
    (cc) => new DrizzleDoctorCatalogue(cc.resolve(token('Db') as never) as never),
  );

  // LLM provider (Tier-2 chat assistant). Falls back to a stub provider
  // when ANTHROPIC_API_KEY is missing — chat endpoints return 503 in
  // that case, but the rest of the API is unaffected.
  c.bindSingleton(T.LlmProvider, () => {
    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        async complete() {
          throw new Error('ANTHROPIC_API_KEY not configured');
        },
      };
    }
    return new AnthropicClaudeProvider(apiKey);
  });

  // Auth-extra
  c.bindSingleton(
    Tx.UserRepository,
    (cc) => new DrizzleUserRepo(cc.resolve(token('Db') as never) as never),
  );
  c.bindSingleton(Tx.SessionStore, () => new KVSessionStore(env.KV_SESSIONS));
  c.bindSingleton(Tx.RateLimiter, () => new KVRateLimiter(env.KV_RATELIMIT));
  c.bindSingleton(Tx.OneTimeTokenStore, () => new KVOneTimeTokenStore(env.KV_SESSIONS));

  // KV
  c.bindSingleton(T.IdempotencyStore, () => new KVIdempotencyStore(env.KV_IDEMPOTENCY));

  // Slot lock (DO)
  c.bindSingleton(T.SlotLockService, () => new SlotLockClient(env.DOCTOR_DAY_LOCK));

  // Availability projector — composes DB + DO into the day projection
  c.bindSingleton(
    Tx.AvailabilityProjector,
    (cc) =>
      new DrizzleAvailabilityProjector(
        cc.resolve(token('Db') as never) as never,
        cc.resolve(T.SlotLockService) as never,
      ),
  );

  // Notifiers — write to outbox (DB) + Cloudflare Queue (queue consumer dispatches)
  c.bindSingleton(
    T.EmailNotifier,
    (cc) =>
      new QueueEmailNotifier(
        cc.resolve(token('Db') as never) as never,
        env.QUEUE_NOTIFICATIONS as never,
      ),
  );
  c.bindSingleton(
    T.SmsNotifier,
    (cc) =>
      new QueueSmsNotifier(
        cc.resolve(token('Db') as never) as never,
        env.QUEUE_NOTIFICATIONS as never,
      ),
  );
  c.bindSingleton(
    T.WhatsappNotifier,
    (cc) =>
      new QueueWhatsappNotifier(
        cc.resolve(token('Db') as never) as never,
        env.QUEUE_NOTIFICATIONS as never,
      ),
  );
  c.bindSingleton(
    T.TelehealthRoomFactory,
    () => new JitsiTelehealthFactory(env.JITSI_APP_ID, env.JITSI_APP_SECRET),
  );

  // Auth crypto helpers (re-exported tokens for use cases)
  c.bindSingleton(token('PasswordHasher'), () => new Argon2idHasher());
  c.bindSingleton(
    token('TokenIssuer'),
    () =>
      new Es256TokenIssuer(
        {
          JWT_SIGNING_PRIVATE_KEY: env.JWT_SIGNING_PRIVATE_KEY,
          JWT_SIGNING_PUBLIC_KEY: env.JWT_SIGNING_PUBLIC_KEY,
          JWT_SIGNING_KID: env.JWT_SIGNING_KID,
        },
        `${env.PUBLIC_BASE_URL.replace(/^https?:\/\//, 'https://api.')}`,
        'drbak-app',
      ),
  );
  c.bindSingleton(token('RandomTokens'), () => new WebcryptoRandomTokens());

  // OAuth
  c.bindSingleton(
    token('GoogleOauthClient'),
    () => new GoogleOauthClient(env.GOOGLE_OAUTH_CLIENT_ID, env.GOOGLE_OAUTH_CLIENT_SECRET),
  );

  return c;
};
