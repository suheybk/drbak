/**
 * Chat routes — Tier-2 AI assistant on the web surface.
 *
 *   POST /chat/sessions                      — create a session
 *   POST /chat/sessions/:id/messages         — send a message, get reply
 *   GET  /chat/sessions/:id                  — fetch session metadata
 *
 * The WhatsApp surface uses a separate webhook (see webhooks.ts);
 * both surfaces share the `handleChatMessage` use case underneath.
 *
 * Anonymous sessions are allowed for FAQ-only queries — patient-
 * specific tools (lookup_my_appointments, cancel_or_reschedule_link)
 * return "authentication_required" until the session is associated
 * with a logged-in patient via the existing JWT middleware.
 */

import { LocaleSchema } from '@dr-bak/contracts';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { handleChatMessage } from '../../../application/use-cases/chat/handleChatMessage.js';
import type { Container } from '../../../composition/container.js';
import { Tx } from '../../../composition/buildContainer.js';
import { T } from '../../../composition/tokens.js';
import { chatSessions } from '../../../infrastructure/db/schema.js';
import type { Env } from '../../workers/env.js';

export const chatRouter = new Hono<{ Bindings: Env }>();

const idgen = (): string => crypto.randomUUID().replace(/-/g, '').slice(0, 24);

const CreateSessionSchema = z.object({
  locale: LocaleSchema,
  consentVersion: z.string().min(1),
});

const SendMessageSchema = z.object({
  message: z.string().min(1).max(4000),
});

chatRouter.post('/sessions', zValidator('json', CreateSessionSchema), async (c) => {
  const container = c.get('container') as Container;
  const auth = c.get('auth') as { userId: string; role: string } | undefined;
  const body = c.req.valid('json');
  const db = container.resolve(Tx.Db as never) as ReturnType<
    typeof import('../../../infrastructure/db/client.js').buildDb
  >;

  const id = idgen();
  let patientId: string | undefined;
  if (auth) {
    const patients = container.resolve(T.PatientRepository);
    const patient = await patients.findByUserId(auth.userId as never);
    if (patient) patientId = patient.id;
  }

  await db.insert(chatSessions).values({
    id,
    surface: 'web',
    ...(patientId ? { patientId } : { anonSessionId: idgen() }),
    locale: body.locale,
    consentVersion: body.consentVersion,
  });

  return c.json({ sessionId: id });
});

chatRouter.post(
  '/sessions/:id/messages',
  zValidator('param', z.object({ id: z.string() })),
  zValidator('json', SendMessageSchema),
  async (c) => {
    const container = c.get('container') as Container;
    const env = c.env;
    const { id: sessionId } = c.req.valid('param');
    const { message } = c.req.valid('json');
    const db = container.resolve(Tx.Db as never) as ReturnType<
      typeof import('../../../infrastructure/db/client.js').buildDb
    >;
    const llm = container.resolve(T.LlmProvider);
    const clock = container.resolve(T.Clock);

    const useCase = handleChatMessage({
      db,
      llm,
      publicBaseUrl: env.PUBLIC_BASE_URL,
      nowMs: clock.now() as number,
    });

    try {
      const result = await useCase({
        sessionId,
        userMessage: message,
      });
      return c.json({
        reply: result.reply,
        toolsUsed: result.toolsUsed,
      });
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === 'chat_session_not_found') {
        return c.json({ error: { code: 'NOT_FOUND', message: 'Session not found.' } }, 404);
      }
      console.error('chat error', e);
      return c.json({ error: { code: 'INTERNAL', message: 'Chat service unavailable.' } }, 500);
    }
  },
);

chatRouter.get('/sessions/:id', zValidator('param', z.object({ id: z.string() })), async (c) => {
  const container = c.get('container') as Container;
  const { id: sessionId } = c.req.valid('param');
  const db = container.resolve(Tx.Db as never) as ReturnType<
    typeof import('../../../infrastructure/db/client.js').buildDb
  >;
  const rows = await db.select().from(chatSessions).where(eq(chatSessions.id, sessionId)).limit(1);
  if (rows.length === 0) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Session not found.' } }, 404);
  }
  const s = rows[0]!;
  return c.json({
    id: s.id,
    locale: s.locale,
    tokensIn: s.tokensInTotal,
    tokensOut: s.tokensOutTotal,
    costKurus: s.costKurusTotal,
    humanTakeoverUntil: s.humanTakeoverUntil,
  });
});
