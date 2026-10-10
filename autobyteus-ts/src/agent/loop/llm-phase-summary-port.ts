import type { BaseLLM, LLMInvocationOptions } from '../../llm/base.js';
import { Message, MessageRole } from '../../llm/utils/messages.js';
import type { LlmTokenUsageObservation } from '../../llm/utils/llm-token-usage-observation.js';
import { sanitizeMediaInputMessages } from '../../llm/utils/media-input-sanitizer.js';
import { CompactionInvocationError, type CompactionExecutionMetadata, type CompactionSummaryMode } from '../../memory/compaction/compaction-execution.js';
import type { ConversationSummaryPort, SummaryAttemptResult, SummaryRequestIdentity } from '../../memory/compaction/conversation-summary-port.js';
import { estimateMessagesTokens } from '../../memory/compaction/message-budget-strategy.js';
import type { AgentExternalEventNotifier } from '../events/notifiers.js';
import type { LlmRequestCapacity } from '../token-budget.js';
import { conversationRequestKwargs, conversationRequestOptions } from './conversation-request.js';

export const COMPACTION_CONVERSATION_RELEASE_TIMEOUT_MS = 10_000;

export type LlmPhaseSummaryPortInput = Readonly<{
  agentId: string;
  llm: BaseLLM;
  /** The exact tool schemas the agent's conversation requests send. */
  tools: ReadonlyArray<Record<string, unknown>>;
  requestCapacity: LlmRequestCapacity | null;
  notifier: AgentExternalEventNotifier | null;
}>;

export const compactionConversationId = (identity: SummaryRequestIdentity): string =>
  `compaction_${identity.operationId}_${identity.attempt}`;

const estimateToolSchemaTokens = (tools: ReadonlyArray<Record<string, unknown>>): number =>
  tools.length ? Math.ceil(JSON.stringify(tools).length / 4) : 0;

/**
 * `ConversationSummaryPort` on the agent's own LLM. The cached request is the agent's conversation
 * request (same sanitized messages, tools, settings and cache scope) plus the instruction. Every
 * attempt is one provider call (`single_attempt`) on its own conversation id, never the agent's,
 * which is released afterwards; its usage is reported as an `autobyteus_compaction` usage event.
 */
export class LlmPhaseSummaryPort implements ConversationSummaryPort {
  constructor(private readonly input: LlmPhaseSummaryPortInput) {}

  fitsInputBudget(messages: readonly Message[], extraText: string): boolean {
    const capacity = this.input.requestCapacity;
    if (!capacity) return false;
    const estimate = estimateMessagesTokens([...messages, new Message(MessageRole.USER, { content: extraText })])
      + estimateToolSchemaTokens(this.input.tools);
    return estimate <= capacity.inputBudget;
  }

  async requestCachedSummary(messages: readonly Message[], instruction: string,
    identity: SummaryRequestIdentity, signal: AbortSignal): Promise<SummaryAttemptResult> {
    const conversationId = compactionConversationId(identity);
    const sanitized = await sanitizeMediaInputMessages([...messages], this.input.llm.model.multimodalCapabilities);
    return this.send('cached', [...sanitized.outboundMessages, new Message(MessageRole.USER, { content: instruction })],
      conversationRequestKwargs(conversationId, this.input.tools),
      conversationRequestOptions({ signal, turnId: identity.executionTurnId, retryMode: 'single_attempt' }),
      identity, signal);
  }

  async requestTranscriptSummary(systemPrompt: string, content: string,
    identity: SummaryRequestIdentity, signal: AbortSignal): Promise<SummaryAttemptResult> {
    const messages = [
      new Message(MessageRole.SYSTEM, { content: systemPrompt }),
      new Message(MessageRole.USER, { content }),
    ];
    const capacity = this.input.requestCapacity;
    if (!capacity) throw new CompactionInvocationError('input_capacity_unavailable', 'Compactor input capacity is unavailable.');
    if (estimateMessagesTokens(messages) > capacity.inputBudget) {
      throw new CompactionInvocationError('input_budget_exceeded', 'Selected compaction history exceeds the compactor input budget.');
    }
    return this.send('transcript', messages, { logicalConversationId: compactionConversationId(identity) },
      { signal, turnId: identity.executionTurnId, retryMode: 'single_attempt' }, identity, signal);
  }

  private async send(mode: CompactionSummaryMode, messages: Message[], kwargs: Record<string, unknown>,
    options: LLMInvocationOptions, identity: SummaryRequestIdentity, signal: AbortSignal): Promise<SummaryAttemptResult> {
    const { llm } = this.input;
    const conversationId = compactionConversationId(identity);
    let metadata: CompactionExecutionMetadata = {
      mode, modelIdentifier: llm.model.modelIdentifier, provider: String(llm.model.provider),
      invocationId: conversationId, completionStatus: 'unknown', completionReason: null, usage: null,
    };
    try {
      let content = '';
      let hasToolCalls = false;
      for await (const chunk of llm.streamMessages(messages, kwargs, options)) {
        signal.throwIfAborted();
        if (chunk.content) content += chunk.content;
        if (chunk.tool_calls?.length) hasToolCalls = true;
        if (chunk.is_complete && chunk.usage) metadata = { ...metadata, usage: chunk.usage };
      }
      if (metadata.usage) this.reportUsage(metadata.usage, identity);
      return { content, hasToolCalls, metadata };
    } catch (error) {
      throw new CompactionInvocationError(signal.aborted ? 'cancelled' : (error as { code?: string })?.code ?? 'generation_failure',
        error instanceof Error ? error.message : String(error), metadata, error);
    } finally {
      await this.release(conversationId);
    }
  }

  private reportUsage(usage: LlmTokenUsageObservation, identity: SummaryRequestIdentity): void {
    const llmCallId = `${identity.executionTurnId}:compaction:${identity.operationId}:${identity.attempt}`;
    try {
      this.input.notifier?.notifyAgentTokenUsageUpdated({
        usage,
        turn_id: identity.executionTurnId,
        llm_call_id: llmCallId,
        runtime_kind: 'autobyteus',
        ingestion_kind: 'autobyteus_compaction',
        idempotency_key: `${this.input.agentId}:${llmCallId}`,
        // The context-fill reading stays with the agent's own requests.
        latest_prompt_tokens: null,
        effective_context_window_tokens: this.input.requestCapacity?.effectiveContextCapacity ?? null,
        context_window_usage_percent: null,
      });
    } catch { /* Metering never alters the attempt outcome. */ }
  }

  /** Bounded, best-effort release on its own controller: the attempt's signal may already be aborted. */
  private async release(conversationId: string): Promise<void> {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        this.input.llm.releaseConversation(conversationId, { signal: controller.signal }),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => {
          controller.abort(); reject(new Error('Compaction conversation release timed out.'));
        }, COMPACTION_CONVERSATION_RELEASE_TIMEOUT_MS); }),
      ]);
    } catch {
      try { console.warn('Compaction conversation release failed.', { conversationId }); }
      catch { /* Cannot mask the attempt outcome. */ }
    } finally { clearTimeout(timeout); }
  }
}
