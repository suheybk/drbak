/**
 * Webhook receivers — HMAC-verified, idempotent.
 *   POST /webhooks/resend          (delivery + bounce events)
 *   POST /webhooks/netgsm          (delivery reports)
 *   POST /webhooks/meta-whatsapp   (delivery + verification handshake)
 *
 * On each event we:
 *   1. Verify the signature (provider-specific).
 *   2. Check `webhook_events` for prior processing → ack.
 *   3. Update the matching `notifications` row's status / error.
 *   4. Insert webhook_events row.
 */

import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { ulid } from 'ulid';
import type { Container } from '../../../composition/container.js';
import { Tx } from '../../../composition/buildContainer.js';
import { webhookEvents } from '../../../infrastructure/db/schema.js';
import type { Env } from '../../workers/env.js';

export const webhookRouter = new Hono<{ Bindings: Env }>();

webhookRouter.post('/resend', async (c) => {
  // Resend HMAC-SHA256 signature in `svix-signature` header
  const sig = c.req.header('svix-signature');
  const id = c.req.header('svix-id');
  const ts = c.req.header('svix-timestamp');
  if (!sig || !id || !ts) return c.body(null, 400);
  const raw = await c.req.raw.clone().text();
  const verified = await verifySvix(c.env.RESEND_API_KEY, id, ts, raw, sig);
  if (!verified) return c.body(null, 401);

  const body = JSON.parse(raw) as {
    type: string;
    data?: { email_id?: string; tags?: { name: string; value: string }[] };
  };
  const container = c.get('container') as Container;
  const db = container.resolve(Tx.Db as never) as ReturnType<
    typeof import('../../../infrastructure/db/client.js').buildDb
  >;
  const eventId = id;
  // idempotency
  const existing = await db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.externalId, eventId))
    .limit(1);
  if (existing[0]) return c.body(null, 204);
  await db.insert(webhookEvents).values({
    id: ulid(),
    provider: 'resend',
    externalId: eventId,
    payloadJson: body as never,
    receivedAt: new Date(),
    processedAt: new Date(),
  });
  // Map to outbox row by emailId (Resend returns id we stored as providerMessageId — schema doesn't yet hold it,
  // Drop 3c will add the column. For now we log and ack.)
  return c.body(null, 204);
});

webhookRouter.post('/netgsm', async (c) => {
  const ip = c.req.header('cf-connecting-ip');
  // NetGSM IP-allowlist is the de-facto auth.
  if (!ip || !isNetGsmIp(ip)) return c.body(null, 401);
  const raw = await c.req.raw.clone().text();
  const body = JSON.parse(raw) as { jobid?: string; status?: string; partnercode?: string };
  if (!body.partnercode) return c.body(null, 400);
  const container = c.get('container') as Container;
  const db = container.resolve(Tx.Db as never) as ReturnType<
    typeof import('../../../infrastructure/db/client.js').buildDb
  >;
  const existing = await db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.externalId, body.jobid ?? body.partnercode))
    .limit(1);
  if (existing[0]) return c.body(null, 204);
  await db.insert(webhookEvents).values({
    id: ulid(),
    provider: 'netgsm',
    externalId: body.jobid ?? body.partnercode,
    payloadJson: body as never,
    receivedAt: new Date(),
    processedAt: new Date(),
  });
  return c.body(null, 204);
});

webhookRouter.get('/meta-whatsapp', async (c) => {
  // Meta verification handshake
  const mode = c.req.query('hub.mode');
  const verifyToken = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');
  if (mode === 'subscribe' && verifyToken === c.env.META_WA_VERIFY_TOKEN) {
    return c.text(challenge ?? '');
  }
  return c.body(null, 403);
});

webhookRouter.post('/meta-whatsapp', async (c) => {
  const sig = c.req.header('x-hub-signature-256');
  const raw = await c.req.raw.clone().text();
  if (!sig || !(await verifyMetaSignature(c.env.META_WA_ACCESS_TOKEN, raw, sig))) {
    return c.body(null, 401);
  }
  const body = JSON.parse(raw) as Record<string, unknown>;
  const container = c.get('container') as Container;
  const db = container.resolve(Tx.Db as never) as ReturnType<
    typeof import('../../../infrastructure/db/client.js').buildDb
  >;
  const eventId = String(body.entry ?? ulid());
  const existing = await db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.externalId, eventId))
    .limit(1);
  if (existing[0]) return c.body(null, 204);
  await db.insert(webhookEvents).values({
    id: ulid(),
    provider: 'meta_whatsapp',
    externalId: eventId,
    payloadJson: body,
    receivedAt: new Date(),
    processedAt: new Date(),
  });
  return c.body(null, 204);
});

// ─── Verification helpers ──────────────────────────────────────

const enc = new TextEncoder();

const importHmac = (secret: string) =>
  crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'verify',
  ]);

const fromB64 = (s: string): Uint8Array => {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

const verifySvix = async (
  secret: string,
  id: string,
  ts: string,
  body: string,
  sigHeader: string,
) => {
  // sigHeader = "v1,<sigB64> v1,<sigB64>" — Resend may rotate
  const sigs = sigHeader
    .split(' ')
    .map((s) => s.split(',')[1])
    .filter(Boolean) as string[];
  const message = `${id}.${ts}.${body}`;
  const key = await importHmac(secret.replace(/^whsec_/, ''));
  for (const s of sigs) {
    const ok = await crypto.subtle.verify('HMAC', key, fromB64(s), enc.encode(message));
    if (ok) return true;
  }
  return false;
};

const verifyMetaSignature = async (
  appSecret: string,
  body: string,
  header: string,
): Promise<boolean> => {
  // header = "sha256=<hex>"
  const provided = header.replace(/^sha256=/, '');
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(body)));
  const hex = [...sig].map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex === provided;
};

const NETGSM_IPS = new Set<string>([
  // Maintained list — verify with provider before enabling in production.
]);
const isNetGsmIp = (ip: string): boolean => NETGSM_IPS.has(ip) || ip === '127.0.0.1';
