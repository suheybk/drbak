/**
 * Chat orchestration use case.
 *
 * One call = one user-message turn. Handles the LLM tool-use loop:
 *   1. Append user message to session
 *   2. Run LLM with system prompt + history
 *   3. If LLM wants to call tools: execute each, append tool results, run LLM again
 *   4. Repeat until stop_reason = 'end_turn' (or max iterations to prevent runaway)
 *   5. Return final assistant text
 *
 * Tier 2 contract: tools are read-only. No state mutation possible.
 *
 * Rate-limit + cost cap: each turn checks the patient's daily-spend
 * counter and rejects when over budget. Anonymous web sessions get
 * a per-IP fallback bucket (KV-backed; not implemented in v1 — open
 * sessions only count when patient_id is set).
 */

import type { Locale } from '@dr-bak/i18n-keys';
import { and, eq } from 'drizzle-orm';
import type { Db } from '../../../infrastructure/db/client.js';
import { chatDailySpend, chatMessages, chatSessions } from '../../../infrastructure/db/schema.js';
import { systemPromptFor } from '../../../infrastructure/llm/systemPrompts.js';
import type { LlmConversationMessage, LlmProvider } from '../../ports/LlmProvider.js';
import { type ChatToolContext, chatTools, executeTool } from './chatTools.js';

const MAX_TURNS = 5; // tool-use loop cap
const MAX_TOKENS = 1024;
// Crude cost model — Sonnet 4.5 list price as of 2026-Q1, in kuruş.
// $3/MTok input, $15/MTok output. ~30 TL = $1 → 9 kuruş per 1k input
// tokens, 45 kuruş per 1k output tokens.
const KURUS_PER_1K_INPUT = 9;
const KURUS_PER_1K_OUTPUT = 45;

export interface ChatTurnInput {
  readonly sessionId: string;
  readonly userMessage: string;
}

export interface ChatTurnDeps {
  readonly db: Db;
  readonly llm: LlmProvider;
  readonly publicBaseUrl: string;
  readonly nowMs: number;
}

export interface ChatTurnOutput {
  readonly reply: string;
  readonly toolsUsed: ReadonlyArray<string>;
  readonly tokensIn: number;
  readonly tokensOut: number;
  readonly costKurus: number;
}

const ymd = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

const idgen = (): string => crypto.randomUUID().replace(/-/g, '').slice(0, 24);

/**
 * Crude plaintext storage for v1. Encryption is a follow-up: derive
 * an AES-GCM key from a Workers secret + per-session salt, encrypt
 * before insert, decrypt on DSAR export. Keeping the columns named
 * for the encrypted form so the migration is forward-compatible.
 */
const enc = new TextEncoder();
const storeMessage = async (
  db: Db,
  row: {
    sessionId: string;
    role: 'user' | 'assistant' | 'tool';
    body: string;
    toolName?: string;
    toolArgs?: string;
    tokensIn?: number;
    tokensOut?: number;
    model?: string;
    stopReason?: string;
  },
) => {
  await db.insert(chatMessages).values({
    id: idgen(),
    sessionId: row.sessionId,
    role: row.role,
    bodyCiphertext: enc.encode(row.body),
    bodyIv: new Uint8Array([0]), // placeholder; real IV when encryption lands
    bodyTag: new Uint8Array([0]),
    ...(row.toolName ? { toolName: row.toolName } : {}),
    ...(row.toolArgs
      ? {
          toolArgsCiphertext: enc.encode(row.toolArgs),
          toolArgsIv: new Uint8Array([0]),
          toolArgsTag: new Uint8Array([0]),
        }
      : {}),
    ...(row.tokensIn !== undefined ? { tokensIn: row.tokensIn } : {}),
    ...(row.tokensOut !== undefined ? { tokensOut: row.tokensOut } : {}),
    ...(row.model ? { model: row.model } : {}),
    ...(row.stopReason ? { stopReason: row.stopReason } : {}),
  });
};

const loadHistory = async (db: Db, sessionId: string): Promise<LlmConversationMessage[]> => {
  const rows = await db
    .select({
      role: chatMessages.role,
      body: chatMessages.bodyCiphertext,
      toolName: chatMessages.toolName,
    })
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(chatMessages.createdAt);

  const dec = new TextDecoder();
  const out: LlmConversationMessage[] = [];
  for (const r of rows) {
    const text = dec.decode(r.body);
    if (r.role === 'user' || r.role === 'assistant') {
      out.push({ role: r.role, content: text });
    }
    // tool messages are reconstructed from the toolName + body; they get
    // re-injected as tool_results during the active turn but we don't
    // replay them in stored history (the LLM sees tool_results inline)
  }
  return out;
};

export const handleChatMessage =
  (deps: ChatTurnDeps) =>
  async (input: ChatTurnInput): Promise<ChatTurnOutput> => {
    // Load session
    const sessionRows = await deps.db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, input.sessionId))
      .limit(1);
    const session = sessionRows[0];
    if (!session) {
      throw new Error('chat_session_not_found');
    }

    // Cost cap (per-patient per-day) — only enforced for authenticated sessions
    if (session.patientId) {
      const today = ymd(deps.nowMs);
      const spendRows = await deps.db
        .select()
        .from(chatDailySpend)
        .where(and(eq(chatDailySpend.patientId, session.patientId), eq(chatDailySpend.ymd, today)))
        .limit(1);
      const spent = spendRows[0]?.costKurus ?? 0;
      // 5000 kuruş = 50 TL/day per patient
      if (spent >= 5000) {
        await storeMessage(deps.db, {
          sessionId: input.sessionId,
          role: 'user',
          body: input.userMessage,
        });
        const fallback =
          'Günlük asistan kullanım sınırına ulaştık. Kliniğimizle WhatsApp veya telefon üzerinden iletişime geçebilirsiniz.';
        await storeMessage(deps.db, {
          sessionId: input.sessionId,
          role: 'assistant',
          body: fallback,
        });
        return {
          reply: fallback,
          toolsUsed: [],
          tokensIn: 0,
          tokensOut: 0,
          costKurus: 0,
        };
      }
    }

    // Append user message
    await storeMessage(deps.db, {
      sessionId: input.sessionId,
      role: 'user',
      body: input.userMessage,
    });

    const messages: LlmConversationMessage[] = await loadHistory(deps.db, input.sessionId);
    // The just-appended user message should already be in history.
    if (messages.length === 0 || messages[messages.length - 1]?.content !== input.userMessage) {
      messages.push({ role: 'user', content: input.userMessage });
    }

    const ctx: ChatToolContext = {
      db: deps.db,
      locale: session.locale as Locale,
      publicBaseUrl: deps.publicBaseUrl,
      ...(session.patientId ? { patientId: session.patientId } : {}),
      sessionId: input.sessionId,
      nowMs: deps.nowMs,
    };

    const toolsUsed: string[] = [];
    let totalTokensIn = 0;
    let totalTokensOut = 0;
    let finalText = '';
    let modelUsed = '';
    let lastStopReason = 'end_turn';

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const completion = await deps.llm.complete({
        systemPrompt: systemPromptFor(session.locale as Locale),
        messages,
        tools: chatTools,
        maxTokens: MAX_TOKENS,
      });

      totalTokensIn += completion.usage.inputTokens;
      totalTokensOut += completion.usage.outputTokens;
      modelUsed = completion.model;
      lastStopReason = completion.stopReason;

      if (completion.text) {
        finalText = completion.text;
      }

      if (completion.stopReason === 'end_turn' || !completion.toolCalls) {
        break;
      }

      // Execute each tool, append results to the LLM message stream
      for (const call of completion.toolCalls) {
        toolsUsed.push(call.name);
        const result = await executeTool(call.name, call.input, ctx);
        const resultJson = JSON.stringify(result);

        // Persist the tool call (for DSAR + admin review)
        await storeMessage(deps.db, {
          sessionId: input.sessionId,
          role: 'tool',
          body: resultJson,
          toolName: call.name,
          toolArgs: JSON.stringify(call.input),
        });

        // Inject as tool_result so the next LLM turn sees it
        messages.push({
          role: 'tool',
          toolUseId: call.id,
          content: resultJson,
        });
      }
    }

    // Persist the final assistant message
    const costKurus =
      Math.ceil((totalTokensIn / 1000) * KURUS_PER_1K_INPUT) +
      Math.ceil((totalTokensOut / 1000) * KURUS_PER_1K_OUTPUT);

    await storeMessage(deps.db, {
      sessionId: input.sessionId,
      role: 'assistant',
      body: finalText,
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
      model: modelUsed,
      stopReason: lastStopReason,
    });

    // Update session totals
    await deps.db
      .update(chatSessions)
      .set({
        tokensInTotal: (session.tokensInTotal ?? 0) + totalTokensIn,
        tokensOutTotal: (session.tokensOutTotal ?? 0) + totalTokensOut,
        costKurusTotal: (session.costKurusTotal ?? 0) + costKurus,
        lastMessageAt: new Date(deps.nowMs),
      })
      .where(eq(chatSessions.id, input.sessionId));

    // Update daily spend (authenticated only)
    if (session.patientId) {
      const today = ymd(deps.nowMs);
      const existing = await deps.db
        .select()
        .from(chatDailySpend)
        .where(and(eq(chatDailySpend.patientId, session.patientId), eq(chatDailySpend.ymd, today)))
        .limit(1);
      if (existing[0]) {
        await deps.db
          .update(chatDailySpend)
          .set({
            messages: existing[0].messages + 1,
            costKurus: existing[0].costKurus + costKurus,
          })
          .where(
            and(eq(chatDailySpend.patientId, session.patientId), eq(chatDailySpend.ymd, today)),
          );
      } else {
        await deps.db.insert(chatDailySpend).values({
          patientId: session.patientId,
          ymd: today,
          messages: 1,
          costKurus,
        });
      }
    }

    return {
      reply: finalText,
      toolsUsed,
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
      costKurus,
    };
  };
