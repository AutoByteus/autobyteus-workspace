import type { BaseLLM, LLMInvocationOptions } from '../../llm/base.js';
import type { LLMModel } from '../../llm/models.js';
import type { LLMConfig } from '../../llm/utils/llm-config.js';
import { resolveRequestMaxOutputTokens } from '../../llm/utils/max-output-tokens.js';
import { Message, MessageRole } from '../../llm/utils/messages.js';
import type { LlmTokenUsageObservation } from '../../llm/utils/llm-token-usage-observation.js';
import { sanitizeMediaInputMessages } from '../../llm/utils/media-input-sanitizer.js';
import { completionStatusOf } from '../../llm/utils/llm-response-finish.js';
import { CompactionInvocationError, type CompactionExecutionMetadata, type CompactionSummaryMode } from '../../memory/compaction/compaction-execution.js';
import type { ConversationSummaryPort, SummaryAttemptResult, SummaryRequestIdentity } from '../../memory/compaction/conversation-summary-port.js';
import { estimateMessagesTokens } from '../../memory/compaction/message-budget-strategy.js';
import type { AgentExternalEventNotifier } from '../events/notifiers.js';
import type { LlmRequestCapacity } from '../token-budget.js';
import { conversationRequestKwargs, conversationRequestOptions } from './conversation-request.js';

export const COMPACTION_CONVERSATION_RELEASE_TIMEOUT_MS = 10_000;
/** A known agent output limit below this is raised for summary requests (REQ-009). */
export const SUMMARY_OUTPUT_TOKEN_FLOOR = 16_384;

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

/**
 * The output limit override for summary requests (both paths), or `null` for none (REQ-009).
 * Only a known agent limit `R` below the floor is raised, to the floor bounded by the model
 * maximum and a quarter of the context, and never below `R`. An unknown or high limit is kept.
 */
export const resolveSummaryOutputTokenOverride = (
  model: LLMModel, config: LLMConfig, contextCapacity: number | null,
): number | null => {
  const agentLimit = resolveRequestMaxOutputTokens(model, config);
  if (agentLimit === null || agentLimit >= SUMMARY_OUTPUT_TOKEN_FLOOR) return null;
  const raised = Math.min(SUMMARY_OUTPUT_TOKEN_FLOOR, model.maxOutputTokens ?? SUMMARY_OUTPUT_TOKEN_FLOOR,
    contextCapacity !== null ? Math.floor(contextCapacity / 4) : SUMMARY_OUTPUT_TOKEN_FLOOR);
  return Math.max(agentLimit, raised);
};

const estimateToolSchemaTokens = (tools: ReadonlyArray<Record<string, unknown>>): number =>
  tools.length ? Math.ceil(JSON.stringify(tools).length / 4) : 0;

/**
 * `ConversationSummaryPort` on the agent's own LLM. The cached request is the agent's conversation
 * request (same sanitized messages, tools, settings and cache scope) plus the instruction. Every
 * attempt is one provider call (`single_attempt`) on its own conversation id, never the agent's,
 * which is released afterwards; its usage is reported as an `autobyteus_compaction` usage event.
 */
export class LlmPhaseSummaryPort implements ConversationSummaryPort {
  private readonly outputTokenOverride: number | null;

  constructor(private readonly input: LlmPhaseSummaryPortInput) {
    this.outputTokenOverride = resolveSummaryOutputTokenOverride(input.llm.model, input.llm.config,
      input.requestCapacity?.effectiveContextCapacity ?? null);
  }

  usesCachedSummary(): boolean {
    return this.input.llm.model.compactionSummaryMode === 'cached_conversation';
  }

  fitsInputBudget(messages: readonly Message[], extraText: string): boolean {
    const budget = this.cachedSummaryInputBudget();
    if (budget === null) return false;
    const estimate = estimateMessagesTokens([...messages, new Message(MessageRole.USER, { content: extraText })])
      + estimateToolSchemaTokens(this.input.tools);
    return estimate <= budget;
  }

  /** The agent's input budget, or with the override the same budget reserving the override instead. */
  private cachedSummaryInputBudget(): number | null {
    const capacity = this.input.requestCapacity;
    if (!capacity) return null;
    if (this.outputTokenOverride === null || capacity.effectiveContextCapacity === null) return capacity.inputBudget;
    const contextCap = Math.max(0, capacity.effectiveContextCapacity - this.outputTokenOverride);
    const inputCap = capacity.providerInputCapTokens === null ? contextCap : Math.min(contextCap, capacity.providerInputCapTokens);
    return Math.max(0, inputCap - capacity.safetyMarginTokens);
  }

  private withOutputLimit(options: LLMInvocationOptions): LLMInvocationOptions {
    return this.outputTokenOverride === null ? options : { ...options, maxOutputTokens: this.outputTokenOverride };
  }

  async requestCachedSummary(messages: readonly Message[], instruction: string,
    identity: SummaryRequestIdentity, signal: AbortSignal): Promise<SummaryAttemptResult> {
    const conversationId = compactionConversationId(identity);
    const sanitized = await sanitizeMediaInputMessages([...messages], this.input.llm.model.multimodalCapabilities);
    return this.send('cached', [...sanitized.outboundMessages, new Message(MessageRole.USER, { content: instruction })],
      conversationRequestKwargs(conversationId, this.input.tools),
      this.withOutputLimit(conversationRequestOptions({ signal, turnId: identity.executionTurnId, retryMode: 'single_attempt' })),
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
      this.withOutputLimit({ signal, turnId: identity.executionTurnId, retryMode: 'single_attempt' }), identity, signal);
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
        if (chunk.is_complete) {
          if (chunk.usage) metadata = { ...metadata, usage: chunk.usage };
          if (chunk.finish) {
            metadata = { ...metadata, completionStatus: completionStatusOf(chunk.finish), completionReason: chunk.finish.providerReason };
          }
        }
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
