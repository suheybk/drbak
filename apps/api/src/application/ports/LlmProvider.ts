/**
 * LlmProvider port — abstracts the underlying LLM (Claude in v1).
 *
 * The chat use-case talks to this interface; the Anthropic adapter
 * lives in `infrastructure/llm/AnthropicClaudeProvider.ts`. Swapping
 * to a different provider (Mistral on Workers AI, self-hosted Llama,
 * etc.) means writing a new adapter — the use-case stays put.
 *
 * Tool use is part of the contract because the chat assistant calls
 * tools (lookup_services, lookup_my_appointments, etc.) to ground its
 * answers in real clinic data. The provider returns either a final
 * text response OR a tool_use request that the caller resolves and
 * passes back as a tool_result.
 */

export interface LlmTextMessage {
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

export interface LlmToolDefinition {
  readonly name: string;
  readonly description: string;
  // JSON Schema-shaped input shape; LLM produces values matching this.
  readonly inputSchema: Record<string, unknown>;
}

export interface LlmToolCall {
  readonly id: string;
  readonly name: string;
  readonly input: Record<string, unknown>;
}

export interface LlmToolResultMessage {
  readonly role: 'tool';
  readonly toolUseId: string;
  readonly content: string;
}

export type LlmConversationMessage = LlmTextMessage | LlmToolResultMessage;

export interface LlmCompletionRequest {
  readonly systemPrompt: string;
  readonly messages: ReadonlyArray<LlmConversationMessage>;
  readonly tools?: ReadonlyArray<LlmToolDefinition>;
  readonly maxTokens: number;
  readonly model?: string;
}

export interface LlmCompletionResponse {
  readonly stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
  readonly text?: string;
  readonly toolCalls?: ReadonlyArray<LlmToolCall>;
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly cacheCreationTokens?: number;
    readonly cacheReadTokens?: number;
  };
  readonly model: string;
}

export interface LlmProvider {
  /**
   * Run one completion turn. Caller is responsible for the loop
   * (run a turn → if tool_use, execute tools → run another turn).
   *
   * Implementations must enable prompt caching on the system prompt
   * when the underlying API supports it (Claude Sonnet 4.5+ does).
   */
  complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse>;
}
