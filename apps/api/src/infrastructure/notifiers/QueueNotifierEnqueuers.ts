/**
 * Port adapters that satisfy `EmailNotifier` / `SmsNotifier` / `WhatsappNotifier`.
 * They:
 *   1. Persist the message to the `notifications` outbox (durable trail; KVKK-evidence).
 *   2. Send a job onto Cloudflare Queue for the consumer to dispatch.
 *
 * Why both? — Outbox = source of truth + replay. Queue = fast dispatch.
 * If KV/Queue blip, the outbox row stays `queued` and the cron sweep will resend.
 */

import type { Queue } from '@cloudflare/workers-types';
import type {
  EmailNotifier,
  OutboundEmail,
  OutboundSms,
  OutboundWhatsapp,
  SmsNotifier,
  WhatsappNotifier,
} from '../../application/ports/index.js';
import type { Db } from '../db/client.js';
import { notifications } from '../db/schema.js';
import { ulid } from 'ulid';

export type NotificationJob =
  | { kind: 'email'; rowId: string }
  | { kind: 'sms'; rowId: string }
  | { kind: 'whatsapp'; rowId: string };

export class QueueEmailNotifier implements EmailNotifier {
  constructor(private readonly db: Db, private readonly queue: Queue<NotificationJob>) {}
  async enqueue(m: OutboundEmail): Promise<void> {
    const id = ulid();
    // Persist icsAttachment alongside the template payload so the consumer
    // can forward it to Resend. Stored under a reserved `icsAttachment`
    // key — won't collide with template variables (templates use
    // snake_case identifiers).
    const persisted: Record<string, unknown> = { ...m.payload };
    if (m.icsAttachment) persisted.icsAttachment = m.icsAttachment;
    await this.db.insert(notifications).values({
      id,
      channel: 'email',
      toEmail: m.toEmail,
      locale: m.locale,
      template: m.template,
      payloadJson: persisted,
      status: 'queued',
      correlationId: m.correlationId,
    });
    await this.queue.send({ kind: 'email', rowId: id });
  }
}

export class QueueSmsNotifier implements SmsNotifier {
  constructor(private readonly db: Db, private readonly queue: Queue<NotificationJob>) {}
  async enqueue(m: OutboundSms): Promise<void> {
    const id = ulid();
    await this.db.insert(notifications).values({
      id,
      channel: 'sms',
      toPhoneE164: m.toPhoneE164,
      locale: m.locale,
      template: m.template,
      payloadJson: m.payload,
      status: 'queued',
      correlationId: m.correlationId,
    });
    await this.queue.send({ kind: 'sms', rowId: id });
  }
}

export class QueueWhatsappNotifier implements WhatsappNotifier {
  constructor(private readonly db: Db, private readonly queue: Queue<NotificationJob>) {}
  async enqueue(m: OutboundWhatsapp): Promise<void> {
    const id = ulid();
    await this.db.insert(notifications).values({
      id,
      channel: 'whatsapp',
      toPhoneE164: m.toPhoneE164,
      locale: m.locale,
      template: m.template,
      payloadJson: m.payload,
      status: 'queued',
      correlationId: m.correlationId,
    });
    await this.queue.send({ kind: 'whatsapp', rowId: id });
  }
}
