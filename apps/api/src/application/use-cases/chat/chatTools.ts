/**
 * Chat tool definitions + executors.
 *
 * The LLM is given the `definitions` (JSON-schema-shaped) and decides
 * when to call a tool. The use-case loop calls `executeTool` with the
 * LLM-supplied input and returns the JSON-string result back to the
 * LLM as a tool_result message. Loop continues until stop_reason is
 * 'end_turn'.
 *
 * Tool list (all read-only — Tier 2 contract):
 *   - lookup_services         — list the 5 service slugs
 *   - lookup_service_detail   — single service description
 *   - lookup_condition_detail — single condition description
 *   - lookup_faq              — search FAQ entries
 *   - lookup_my_appointments  — auth-required; patient's upcoming + past
 *   - lookup_availability     — slot availability for a service over a window
 *   - book_link               — produce a deep-link to the booking flow
 *   - cancel_or_reschedule_link — signed link for an existing appointment
 *   - escalate_to_human       — flag the session for human takeover
 *
 * Each executor is purposefully narrow — the LLM can't access the
 * patient's data unless the session is authenticated, can't perform
 * any state mutation, and never gets full transcripts of other
 * patients' conversations.
 */

import type { Locale } from '@dr-bak/i18n-keys';
import { and, eq, isNotNull } from 'drizzle-orm';
import type { Db } from '../../../infrastructure/db/client.js';
import {
  appointments,
  contentEntries,
  contentEntryTranslations,
  serviceTranslations,
  services,
} from '../../../infrastructure/db/schema.js';
import type { LlmToolDefinition } from '../../ports/LlmProvider.js';

export interface ChatToolContext {
  readonly db: Db;
  readonly locale: Locale;
  readonly publicBaseUrl: string;
  readonly patientId?: string; // undefined = anonymous session
  readonly sessionId: string;
  readonly nowMs: number;
}

export type ChatToolResult =
  | { readonly ok: true; readonly data: unknown }
  | { readonly ok: false; readonly error: string };

export const chatTools: ReadonlyArray<LlmToolDefinition> = [
  {
    name: 'lookup_services',
    description:
      'List all clinical services Dr. Bak offers. Returns slug, title, and short lead for each. Use this before recommending a service detail page.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'lookup_service_detail',
    description:
      'Get the full description of a single service by slug (one of: tms, neurology-consultation, home-visit, telehealth, iv-therapy).',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'The service slug' },
      },
      required: ['slug'],
      additionalProperties: false,
    },
  },
  {
    name: 'lookup_condition_detail',
    description:
      'Get information on a clinical condition (e.g. depresyon, migren, ptsd). Returns the condition page content.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'The condition slug' },
      },
      required: ['slug'],
      additionalProperties: false,
    },
  },
  {
    name: 'lookup_faq',
    description:
      'Search FAQ entries by free-text query. Returns up to 5 matching entries with title + body.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'User question or keywords' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'lookup_my_appointments',
    description:
      "List the authenticated patient's upcoming + past appointments. Returns empty list if session is not authenticated.",
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'book_link',
    description:
      'Generate the URL the patient should click to start the secure booking flow. Optional `service` param pre-selects a service.',
    inputSchema: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          description: 'Optional service slug to pre-select',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'cancel_or_reschedule_link',
    description:
      'Generate a signed link for the patient to cancel or reschedule a specific appointment. Subject to the 48h policy.',
    inputSchema: {
      type: 'object',
      properties: {
        appointmentId: {
          type: 'string',
          description: 'ID from lookup_my_appointments',
        },
        action: { type: 'string', enum: ['cancel', 'reschedule'] },
      },
      required: ['appointmentId', 'action'],
      additionalProperties: false,
    },
  },
  {
    name: 'escalate_to_human',
    description:
      'Flag the session for human takeover by clinic staff. Use for medical emergencies, complex cases the AI cannot resolve, or patient frustration. Returns a confirmation message + the clinic WhatsApp link.',
    inputSchema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Brief reason for escalation',
        },
      },
      required: ['reason'],
      additionalProperties: false,
    },
  },
];

const truncate = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n).trim()}…` : s);

export const executeTool = async (
  name: string,
  input: Record<string, unknown>,
  ctx: ChatToolContext,
): Promise<ChatToolResult> => {
  try {
    switch (name) {
      case 'lookup_services': {
        const rows = await ctx.db
          .select({
            slug: services.slug,
            title: serviceTranslations.title,
            lead: serviceTranslations.leadParagraph,
          })
          .from(services)
          .innerJoin(
            serviceTranslations,
            and(
              eq(serviceTranslations.serviceId, services.id),
              eq(serviceTranslations.locale, ctx.locale),
            ),
          )
          .where(isNotNull(services.publishedAt))
          .limit(20);
        return { ok: true, data: rows };
      }
      case 'lookup_service_detail': {
        const slug = String(input.slug ?? '');
        const rows = await ctx.db
          .select({
            slug: services.slug,
            title: serviceTranslations.title,
            lead: serviceTranslations.leadParagraph,
            body: serviceTranslations.bodyMarkdown,
          })
          .from(services)
          .innerJoin(
            serviceTranslations,
            and(
              eq(serviceTranslations.serviceId, services.id),
              eq(serviceTranslations.locale, ctx.locale),
            ),
          )
          .where(eq(services.slug, slug))
          .limit(1);
        if (rows.length === 0) return { ok: false, error: 'service_not_found' };
        const row = rows[0]!;
        return {
          ok: true,
          data: {
            slug: row.slug,
            title: row.title,
            lead: row.lead,
            body: truncate(row.body ?? '', 1500),
            url: `${ctx.publicBaseUrl}/services/${row.slug}`,
          },
        };
      }
      case 'lookup_condition_detail': {
        const slug = String(input.slug ?? '');
        const rows = await ctx.db
          .select({
            title: contentEntryTranslations.title,
            lead: contentEntryTranslations.leadParagraph,
            body: contentEntryTranslations.bodyMarkdown,
          })
          .from(contentEntries)
          .innerJoin(
            contentEntryTranslations,
            and(
              eq(contentEntryTranslations.contentEntryId, contentEntries.id),
              eq(contentEntryTranslations.locale, ctx.locale),
            ),
          )
          .where(and(eq(contentEntries.slug, slug), eq(contentEntries.type, 'condition')))
          .limit(1);
        if (rows.length === 0) return { ok: false, error: 'condition_not_found' };
        const row = rows[0]!;
        return {
          ok: true,
          data: {
            slug,
            title: row.title,
            lead: row.lead,
            body: truncate(row.body ?? '', 2000),
            url: `${ctx.publicBaseUrl}/conditions/${slug}`,
          },
        };
      }
      case 'lookup_faq': {
        const query = String(input.query ?? '').toLowerCase();
        if (!query) return { ok: false, error: 'query_required' };
        const rows = await ctx.db
          .select({
            slug: contentEntries.slug,
            title: contentEntryTranslations.title,
            body: contentEntryTranslations.bodyMarkdown,
          })
          .from(contentEntries)
          .innerJoin(
            contentEntryTranslations,
            and(
              eq(contentEntryTranslations.contentEntryId, contentEntries.id),
              eq(contentEntryTranslations.locale, ctx.locale),
            ),
          )
          .where(eq(contentEntries.type, 'faq'))
          .limit(50);
        const matches = rows
          .map((r) => {
            const text = `${r.title ?? ''} ${r.body ?? ''}`.toLowerCase();
            const score = query
              .split(/\s+/)
              .filter((w) => w.length > 2)
              .reduce((acc, w) => acc + (text.includes(w) ? 1 : 0), 0);
            return { ...r, score };
          })
          .filter((r) => r.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
        return {
          ok: true,
          data: matches.map((m) => ({
            title: m.title,
            body: truncate(m.body ?? '', 600),
            url: `${ctx.publicBaseUrl}/faq#${m.slug}`,
          })),
        };
      }
      case 'lookup_my_appointments': {
        if (!ctx.patientId) {
          return {
            ok: true,
            data: {
              authenticated: false,
              note: 'User is not signed in. Tell them to sign in at /login to see appointments.',
            },
          };
        }
        const rows = await ctx.db
          .select({
            id: appointments.id,
            startsAt: appointments.startsAt,
            endsAt: appointments.endsAt,
            status: appointments.status,
            deliveryMode: appointments.deliveryMode,
          })
          .from(appointments)
          .where(eq(appointments.patientId, ctx.patientId))
          .limit(20);
        const upcoming = rows.filter(
          (a) => new Date(a.startsAt as unknown as string).getTime() > ctx.nowMs,
        );
        const past = rows.filter(
          (a) => new Date(a.startsAt as unknown as string).getTime() <= ctx.nowMs,
        );
        return {
          ok: true,
          data: {
            authenticated: true,
            upcoming: upcoming.slice(0, 5),
            recent_past: past.slice(0, 3),
          },
        };
      }
      case 'lookup_availability': {
        // Tier-2 read-only: return a generic instruction; full slot search
        // happens in the booking flow.
        return {
          ok: true,
          data: {
            note: 'Slot availability requires the secure booking flow. Direct user to book_link.',
            url: `${ctx.publicBaseUrl}/book`,
          },
        };
      }
      case 'book_link': {
        const service = typeof input.service === 'string' ? input.service : undefined;
        const url = service
          ? `${ctx.publicBaseUrl}/book?service=${encodeURIComponent(service)}`
          : `${ctx.publicBaseUrl}/book`;
        return { ok: true, data: { url } };
      }
      case 'cancel_or_reschedule_link': {
        const apptId = String(input.appointmentId ?? '');
        const action = input.action === 'cancel' ? 'cancel' : 'reschedule';
        if (!ctx.patientId) {
          return {
            ok: false,
            error: 'authentication_required',
          };
        }
        // Tier 2 returns the patient-portal URL. The portal already
        // gates by patient + 48h window. The signed-URL email links
        // (HmacSignedUrlMinter) are issued at appointment-confirmation
        // time and not re-issuable from chat.
        return {
          ok: true,
          data: {
            url: `${ctx.publicBaseUrl}/account#appointment-${apptId}`,
            action,
            note: 'The 48h policy applies. If within 48h of the slot, cancel/reschedule is not allowed.',
          },
        };
      }
      case 'escalate_to_human': {
        const reason = String(input.reason ?? '').slice(0, 500);
        // TODO: write to clinic Slack via webhook + set human_takeover_until
        // on chat_sessions. For Tier 2 v1 we just return the WhatsApp link.
        return {
          ok: true,
          data: {
            confirmed: true,
            reason,
            whatsapp: 'https://wa.me/905300874391',
            phone: '+905300874391',
            note: 'Patient should contact the clinic via WhatsApp or phone for direct assistance.',
          },
        };
      }
      default:
        return { ok: false, error: `unknown_tool:${name}` };
    }
  } catch (e) {
    return {
      ok: false,
      error: `tool_failed:${(e as Error).message.slice(0, 200)}`,
    };
  }
};
