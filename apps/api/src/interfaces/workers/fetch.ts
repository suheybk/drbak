/**
 * Worker entry point: HTTP fetch handler + queue consumer + scheduled handler + DO export.
 */

import type {
  ExecutionContext,
  MessageBatch,
  ScheduledController,
} from '@cloudflare/workers-types';
import { handleAppointmentRemindersCron } from '../../infrastructure/cron/appointmentReminders.js';
import type { NotificationJob } from '../../infrastructure/notifiers/QueueNotifierEnqueuers.js';
import { handleNotificationBatch } from '../../infrastructure/queues/notificationConsumer.js';
import { buildApp } from '../http/app.js';
import type { Env } from './env.js';

export { DoctorDayLock } from '../../infrastructure/do/DoctorDayLock.js';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const app = buildApp(env, ctx);
    return app.fetch(request, env, ctx);
  },

  async queue(
    batch: MessageBatch<NotificationJob>,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<void> {
    // Single queue today: drbak-notifications. Webhook queue is event-driven (no consumer).
    await handleNotificationBatch(batch, env);
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    // The reminder cron also acts as the outbox-sweep backstop.
    ctx.waitUntil(handleAppointmentRemindersCron(env));
    void controller;
  },
};
