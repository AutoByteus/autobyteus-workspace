import type { LLMInvocationOptions } from '../../llm/base.js';

/**
 * The single definition of an agent conversation request's invocation arguments, shared by
 * the agent's own LLM calls and the cached compaction summary request, so the summary request
 * keeps a byte-identical (cacheable) prefix.
 */
export const conversationRequestKwargs = (
  conversationId: string,
  tools: ReadonlyArray<Record<string, unknown>>,
): Record<string, unknown> => ({ logicalConversationId: conversationId, ...(tools.length ? { tools } : {}) });

export const conversationRequestOptions = (input: {
  signal: AbortSignal;
  turnId: string;
  retryMode?: LLMInvocationOptions['retryMode'];
}): LLMInvocationOptions => ({
  promptCacheScope: 'conversation',
  signal: input.signal,
  turnId: input.turnId,
  ...(input.retryMode ? { retryMode: input.retryMode } : {}),
});
