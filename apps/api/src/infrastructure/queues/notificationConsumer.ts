/**
 * Cloudflare Queue consumer — `drbak-notifications`.
 *
 * For each message:
 *   1. Load notifications row by id.
 *   2. Render the template per (channel, locale).
 *   3. Dispatch via the right provider client (Resend / NetGSM|Twilio / Meta WA).
 *   4. Update outbox row → sent / failed (+ attempt counter).
 *   5. Return ack/retry.
 *
 * Retry policy is set in wrangler.toml (`max_retries=5`); we ack on success,
 * call `message.retry()` for retryable errors, ack-with-failure for terminal.
 *
 * The `notifications` row is the audit-evidence — provider message ids stored on success.
 */

import type { MessageBatch } from '@cloudflare/workers-types';
import { eq } from 'drizzle-orm';
import type { Env } from '../../interfaces/workers/env.js';
import { buildDb } from '../db/client.js';
import { notifications } from '../db/schema.js';
import type { NotificationJob } from '../notifiers/QueueNotifierEnqueuers.js';
import { ResendEmailClient, ResendError } from '../notifiers/ResendEmailClient.js';
import { NetGsmSmsClient, NetGsmError } from '../notifiers/NetGsmSmsClient.js';
import { TwilioSmsClient } from '../notifiers/TwilioSmsClient.js';
import { MetaWhatsappClient, MetaWhatsappError } from '../notifiers/MetaWhatsappClient.js';
import { renderEmail, renderSms, renderWhatsapp } from '../notifiers/templates.js';

export const handleNotificationBatch = async (
  batch: MessageBatch<NotificationJob>,
  env: Env,
): Promise<void> => {
  const db = buildDb({ connectionString: env.HYPERDRIVE_DB.connectionString });
  const resend = new ResendEmailClient(env.RESEND_API_KEY);
  const netgsm = new NetGsmSmsClient(env.NETGSM_USERNAME, env.NETGSM_PASSWORD, env.NETGSM_SENDER_ID);
  const twilio = env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER
    ? new TwilioSmsClient(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN, env.TWILIO_FROM_NUMBER)
    : null;
  const wa = new MetaWhatsappClient(env.META_WA_ACCESS_TOKEN, env.META_WA_PHONE_NUMBER_ID);

  for (const message of batch.messages) {
    const job = message.body;
    try {
      const rows = await db.select().from(notifications).where(eq(notifications.id, job.rowId)).limit(1);
      const row = rows[0];
      if (!row) { message.ack(); continue; }
      if (row.status === 'sent') { message.ack(); continue; }

      // Dispatch
      const payload = (row.payloadJson as Record<string, unknown>) ?? {};
      switch (job.kind) {
        case 'email': {
          const r = renderEmail(row.template, row.locale, payload);
          // Forward optional ICS attachment from the original OutboundEmail
          // (booking-confirmation + reschedule emails attach a calendar
          // invite). Shape mirrors `OutboundEmail.icsAttachment` in
          // ports/Notifiers.ts; the QueueEmailNotifier persists it inside
          // payloadJson so we read it back here.
          const ics = (payload as { icsAttachment?: { filename: string; content: string } })
            .icsAttachment;
          await resend.send({
            to: row.toEmail!,
            from: 'Uzm. Dr. Oğuz Bak <info@uzmdroguzbak.com>',
            subject: r.subject,
            html: r.html,
            text: r.text,
            replyTo: 'info@uzmdroguzbak.com',
            idempotencyKey: row.id,
            ...(ics ? { icsAttachment: ics } : {}),
          });
          break;
        }
        case 'sms': {
          const r = renderSms(row.template, row.locale, payload);
          const isTr = row.toPhoneE164!.startsWith('+90');
          if (isTr) {
            await netgsm.send({ toE164: row.toPhoneE164!, text: r.text, idempotencyKey: row.id });
          } else if (twilio) {
            await twilio.send({ toE164: row.toPhoneE164!, text: r.text, idempotencyKey: row.id });
          } else {
            throw new Error('non-TR SMS attempted but Twilio not configured');
          }
          break;
        }
        case 'whatsapp': {
          const r = renderWhatsapp(row.template, row.locale, payload);
          await wa.send({
            toE164: row.toPhoneE164!,
            templateName: r.templateName,
            locale: localeMetaCode(row.locale),
            bodyParams: r.params,
            idempotencyKey: row.id,
          });
          break;
        }
      }

      await db.update(notifications)
        .set({ status: 'sent', sentAt: new Date(), attempts: row.attempts + 1, lastError: null })
        .where(eq(notifications.id, row.id));
      message.ack();
    } catch (e) {
      const retryable = e instanceof ResendError ? e.retryable
        : e instanceof NetGsmError ? e.retryable
        : e instanceof MetaWhatsappError ? e.retryable
        : true;
      const errMsg = e instanceof Error ? e.message : String(e);
      try {
        await db.update(notifications)
          .set({
            status: retryable ? 'queued' : 'failed',
            attempts: 1, // approximate — true count tracked on retry below
            lastError: errMsg.slice(0, 500),
          })
          .where(eq(notifications.id, job.rowId));
      } catch {/* swallow — outbox update is best-effort */}

      if (retryable) message.retry({ delaySeconds: backoffSeconds(message.attempts) });
      else message.ack();
    }
  }
};

const backoffSeconds = (attempts: number): number =>
  Math.min(2 ** attempts * 30, 30 * 60); // 30s, 60s, 2m, 4m, 8m, 16m, capped 30m

const localeMetaCode = (l: string): string =>
  ({ tr: 'tr_TR', en: 'en_US', ar: 'ar_SA', fr: 'fr_FR', es: 'es_ES' })[l] ?? 'tr_TR';
