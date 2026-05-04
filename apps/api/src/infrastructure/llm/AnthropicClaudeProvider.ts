/**
 * Anthropic Claude adapter for the LlmProvider port.
 *
 * Uses the Messages API at api.anthropic.com via raw fetch. Why no
 * @anthropic-ai/sdk: Workers bundle size + we only need a thin slice
 * of the API surface. The SDK pulls in form-data, undici-types,
 * stream polyfills — overkill for a single endpoint we control.
 *
 * Prompt caching: the system prompt is marked with
 * `cache_control: { type: "ephemeral" }`. Claude caches it for ~5
 * minutes; subsequent turns in the same conversation hit cache and
 * the input-token cost drops by ~90%. For our patient-conversation
 * pattern (a session has 4-15 turns within minutes) cache hit rate
 * is very high.
 *
 * Model: defaults to `claude-sonnet-4-5-20250929` (Sonnet 4.5). Can
 * override via the request `model` field. Sonnet 4.6 is the next
 * planned step; trivial to bump.
 */

import type {
  LlmCompletionRequest,
  LlmCompletionResponse,
  LlmConversationMessage,
  LlmProvider,
  LlmToolCall,
} from '../../application/ports/LlmProvider.js';

interface AnthropicMessageBlock {
  readonly type: 'text' | 'tool_use' | 'tool_result';
  readonly text?: string;
  readonly id?: string;
  readonly name?: string;
  readonly input?: Record<string, unknown>;
  readonly tool_use_id?: string;
  readonly content?: string;
}

interface AnthropicMessage {
  readonly role: 'user' | 'assistant';
  readonly content: string | ReadonlyArray<AnthropicMessageBlock>;
}

interface AnthropicMessagesRequest {
  readonly model: string;
  readonly max_tokens: number;
  readonly system: ReadonlyArray<{
    type: 'text';
    text: string;
    cache_control?: { type: 'ephemeral' };
  }>;
  readonly messages: ReadonlyArray<AnthropicMessage>;
  readonly tools?: ReadonlyArray<{
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  }>;
}

interface AnthropicMessagesResponse {
  readonly id: string;
  readonly type: 'message';
  readonly role: 'assistant';
  readonly model: string;
  readonly content: ReadonlyArray<AnthropicMessageBlock>;
  readonly stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
  readonly usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

const toAnthropicMessage = (m: LlmConversationMessage): AnthropicMessage => {
  if (m.role === 'tool') {
    return {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: m.toolUseId,
          content: m.content,
        },
      ],
    };
  }
  return { role: m.role, content: m.content };
};

export class AnthropicClaudeProvider implements LlmProvider {
  constructor(private readonly apiKey: string) {}

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const body: AnthropicMessagesRequest = {
      model: request.model ?? DEFAULT_MODEL,
      max_tokens: request.maxTokens,
      system: [
        {
          type: 'text',
          text: request.systemPrompt,
          // Cache the system prompt for 5 minutes; subsequent turns in the
          // same session pay ~90% less for the input tokens.
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: request.messages.map(toAnthropicMessage),
      ...(request.tools && request.tools.length > 0
        ? {
            tools: request.tools.map((t) => ({
              name: t.name,
              description: t.description,
              input_schema: t.inputSchema,
            })),
          }
        : {}),
    };

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${errBody.slice(0, 400)}`);
    }

    const data = (await res.json()) as AnthropicMessagesResponse;

    let text: string | undefined;
    const toolCalls: LlmToolCall[] = [];
    for (const block of data.content) {
      if (block.type === 'text' && block.text) {
        text = (text ?? '') + block.text;
      } else if (block.type === 'tool_use' && block.id && block.name) {
        toolCalls.push({
          id: block.id,
          name: block.name,
          input: block.input ?? {},
        });
      }
    }

    return {
      stopReason: data.stop_reason,
      ...(text !== undefined ? { text } : {}),
      ...(toolCalls.length > 0 ? { toolCalls } : {}),
      usage: {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
        ...(data.usage.cache_creation_input_tokens !== undefined
          ? { cacheCreationTokens: data.usage.cache_creation_input_tokens }
          : {}),
        ...(data.usage.cache_read_input_tokens !== undefined
          ? { cacheReadTokens: data.usage.cache_read_input_tokens }
          : {}),
      },
      model: data.model,
    };
  }
}
