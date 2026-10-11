import { CompleteResponse, type ChunkResponse } from '../../llm/utils/response-types.js';
import type { LlmRequestCapacity } from '../token-budget.js';
import { BaseLLM } from '../../llm/base.js';
import { LlmResponseStreamCollector } from './llm-response-stream-collector.js';
import { ToolSchemaProvider } from '../../tools/usage/providers/tool-schema-provider.js';
import { LLMRequestAssembler, type RequestPackage } from '../llm-request-assembler.js';
import { CompactionPreparationError } from '../compaction/compaction-preparation-error.js';
import { CompactionRuntimeSettingsResolver } from '../../memory/compaction/compaction-runtime-settings.js';
import { isAgentInterruptionError } from '../interruption/agent-interruption.js';
import { resolveTurnToolNames } from './llm-phase-tools.js';
import { LlmCallCompaction } from './llm-phase-compaction.js';
import { conversationRequestKwargs, conversationRequestOptions } from './conversation-request.js';
import { resolveLlmRequestCapacity } from '../token-budget.js';
import type { AgentContext } from '../context/agent-context.js';
import type { AgentTurn } from '../agent-turn.js';
import type { AgentInputPipelineResult } from '../pipelines/agent-input-pipeline.js';
import type { AgentExternalEventNotifier } from '../events/notifiers.js';
import type { ToolInvocation } from '../tool-invocation.js';
import type { LlmTokenUsageObservation } from '../../llm/utils/llm-token-usage-observation.js';
import { MissingApiKeyError } from '../../secrets/provider-api-key-error.js';
import { extractProviderErrorEvidence } from '../../llm/errors/provider-error.js';
import type { LlmResponseFinish } from '../../llm/utils/llm-response-finish.js';
import { resolveRequestMaxOutputTokens } from '../../llm/utils/max-output-tokens.js';
import { OUTPUT_LIMIT_DISCARDED_TOOL_CALL_ERROR } from './output-limit-recovery.js';

export type LlmPhaseOutcome =
  | { kind: 'compaction_blocked' }
  | { kind: 'final'; response: CompleteResponse; isError?: boolean }
  | { kind: 'tool_invocations'; response: CompleteResponse; toolInvocations: ToolInvocation[] }
  /** The response hit the output limit. Its text (if any) is kept; its tool calls were discarded. */
  | { kind: 'output_limited'; response: CompleteResponse; truncatedToolNames: string[]; outputTokenLimit: number | null };

/** Content-filter and context-window stops fail the request clearly (no recovery, no tool runs). */
const buildResponseStopError = (finish: LlmResponseFinish): Error => {
  const providerReason = finish.providerReason ? ` (provider reason: ${finish.providerReason})` : '';
  return finish.reason === 'context_window_exceeded'
    ? Object.assign(new Error(`The request exceeded the model's context window${providerReason}. Compact or shorten the conversation, then try again.`), { code: 'LLM_CONTEXT_WINDOW_EXCEEDED' })
    : Object.assign(new Error(`The model refused, or a content filter stopped, the response${providerReason}. No tool was run.`), { code: 'LLM_RESPONSE_REFUSED' });
};

const resolveLatestPromptTokens = (usage: LlmTokenUsageObservation): number | null => {
  if (usage.input_tokens === null) return null;
  if (usage.input_token_semantic === 'base_excludes_cache') {
    return usage.input_tokens +
      (usage.cache_read_input_tokens ?? 0) +
      (usage.cache_creation_input_tokens ?? 0);
  }
  return usage.input_tokens;
};

const percentOf = (numerator: number | null, denominator: number | null | undefined): number | null => {
  if (numerator === null || !denominator || denominator <= 0) return null;
  return (numerator / denominator) * 100;
};

/** One LLM call (one request attempt): what every step of the call needs. */
type LlmCall = {
  agentId: string;
  context: AgentContext;
  turn: AgentTurn;
  notifier: AgentExternalEventNotifier | null;
  llm: BaseLLM;
  memoryManager: NonNullable<AgentContext['state']['memoryManager']>;
  callSequence: number;
  callId: string;
  requestCapacity: LlmRequestCapacity | null;
  toolCallsEnabled: boolean;
  toolSchemas: Array<Record<string, unknown>>;
  compaction: LlmCallCompaction | null;
  assembler: LLMRequestAssembler;
  systemPrompt: string | null;
  /** The request's recovery snapshot was committed or restored. */
  recoverySettled: boolean;
};

type LlmCallSettlement =
  | { kind: 'completed'; response: CompleteResponse; toolInvocations: ToolInvocation[] }
  | { kind: 'output_limited'; response: CompleteResponse; truncatedToolNames: string[] };

/**
 * Owns one LLM call: request preparation, starting the stream, settling the call's recovery
 * snapshot (commit or rollback), memory ingestion and token usage per outcome, finish
 * classification and the outcome. Stream consumption and segments belong to
 * `LlmResponseStreamCollector`; the call's automatic compaction to `LlmCallCompaction`.
 */
export class LlmPhase {
  async run(
    input: AgentInputPipelineResult,
    context: AgentContext,
    turn: AgentTurn,
    notifier: AgentExternalEventNotifier | null
  ): Promise<LlmPhaseOutcome> {
    const call = this.beginCall(context, turn, notifier);
    const request = await this.assembleRequest(call, input);
    if (!request) return { kind: 'compaction_blocked' };

    const collector = new LlmResponseStreamCollector({ turnId: turn.turnId, notifier, toolCallsEnabled: call.toolCallsEnabled });
    let settlement: LlmCallSettlement;
    try {
      await collector.consume(this.startStream(call, request), turn.executionScope);
      settlement = this.settle(call, request, collector);
    } catch (error) {
      if (isAgentInterruptionError(error)) {
        this.settleInterrupted(call, request, collector, error.reason);
        throw error;
      }
      return this.settleFailed(call, request, collector, error);
    }
    return this.finishCall(call, request, collector, settlement);
  }

  private beginCall(context: AgentContext, turn: AgentTurn, notifier: AgentExternalEventNotifier | null): LlmCall {
    const agentId = context.agentId;
    const llm = context.state.llmInstance as BaseLLM | null;
    if (!llm) {
      const errorMessage = `Agent '${agentId}' requires an initialized LLM instance.`;
      notifier?.notifyAgentErrorOutputGeneration({
        code: 'LLM_NOT_INITIALIZED',
        message: errorMessage,
        classification: { scope: 'turn', effect: 'diagnostic', turnId: turn.turnId }
      });
      throw new Error(errorMessage);
    }
    const memoryManager = context.state.memoryManager;
    if (!memoryManager) {
      throw new Error(`Agent '${agentId}' requires a memory manager to assemble LLM requests.`);
    }

    const runtimeSettingsResolver = new CompactionRuntimeSettingsResolver();
    const runtimeSettings = runtimeSettingsResolver.resolve();
    const automaticCompaction = memoryManager.getAutomaticCompactionConfiguration();
    const requestCapacity = resolveLlmRequestCapacity(
      llm.model,
      llm.config,
      runtimeSettings,
      automaticCompaction.kind === 'enabled'
        ? automaticCompaction.policy.safetyMarginTokens
        : undefined,
    );
    const toolNames = resolveTurnToolNames(context);
    const toolCallsEnabled = toolNames.length > 0;
    const toolSchemas = toolCallsEnabled
      ? new ToolSchemaProvider().buildSchema(toolNames, llm.model?.provider ?? null)
      : [];
    const compaction = automaticCompaction.kind === 'enabled'
      ? LlmCallCompaction.create({
          automaticCompaction,
          agentId,
          context,
          memoryManager,
          llm,
          toolSchemas,
          requestCapacity,
          runtimeSettingsResolver,
          runtimeSettings,
          notifier,
        })
      : null;
    const assembler = new LLMRequestAssembler(
      memoryManager,
      compaction?.executor ?? null,
      llm.model.multimodalCapabilities,
    );
    const callSequence = turn.nextLlmCallSequence();
    return {
      agentId,
      context,
      turn,
      notifier,
      llm,
      memoryManager,
      callSequence,
      callId: `${turn.turnId}:llm:${callSequence}`,
      requestCapacity,
      toolCallsEnabled,
      toolSchemas,
      compaction,
      assembler,
      systemPrompt: context.state.processedSystemPrompt ?? llm.config.systemMessage ?? null,
      recoverySettled: false,
    };
  }

  /** The prepared request, or `null` when pre-request compaction blocked the call. */
  private async assembleRequest(call: LlmCall, input: AgentInputPipelineResult): Promise<RequestPackage | null> {
    const { turn } = call;
    try {
      return await turn.executionScope.runAbortable(
        { kind: 'llm_request_assembly' },
        () => call.assembler.prepareRequest(
          input.llmUserMessage,
          { turnId: turn.turnId, requestId: call.callId, isTurnContinuation: turn.isContinuation, signal: turn.executionScope.signal },
          call.systemPrompt ?? undefined,
          call.toolSchemas,
        )
      );
    } catch (error) {
      if (error instanceof CompactionPreparationError) {
        turn.executionScope.throwIfAborted({ kind: 'llm_request_assembly' });
        call.notifier?.notifyAgentErrorOutputGeneration({
          code: 'LLM_REQUEST_PREPARATION_FAILED',
          message: error.message,
          details: String(error.cause ?? error),
          classification: { scope: 'turn', effect: 'diagnostic', turnId: turn.turnId }
        });
        return null;
      }
      throw error;
    }
  }

  /** Starts the provider stream with the shared conversation-request definition (CON-001). */
  private startStream(call: LlmCall, request: RequestPackage): AsyncIterable<ChunkResponse> {
    const scope = call.turn.executionScope;
    scope.throwIfAborted({ kind: 'llm_request_assembly' });
    scope.throwIfAborted({ kind: 'llm_stream_start' });
    return call.llm.streamMessages(
      request.outboundMessages,
      conversationRequestKwargs(call.agentId, request.tools),
      conversationRequestOptions({ signal: scope.signal, turnId: call.turn.turnId }),
    ) as AsyncIterable<ChunkResponse>;
  }

  /** Classifies the finish of a fully consumed stream and settles the call. */
  private settle(call: LlmCall, request: RequestPackage, collector: LlmResponseStreamCollector): LlmCallSettlement {
    call.turn.executionScope.throwIfAborted({ kind: 'llm_stream_finalize' });
    const finish = collector.finish;
    if (finish?.reason === 'content_filter' || finish?.reason === 'context_window_exceeded') {
      throw buildResponseStopError(finish);
    }
    return finish?.reason === 'output_limit'
      ? this.settleOutputLimited(call, request, collector, finish)
      : this.settleCompleted(call, request, collector);
  }

  /**
   * Output-limited: commit the input, keep only the partial text (no reasoning, no native
   * turn), discard every tool call. Nothing after the fence can be interrupted.
   */
  private settleOutputLimited(
    call: LlmCall,
    request: RequestPackage,
    collector: LlmResponseStreamCollector,
    finish: LlmResponseFinish,
  ): LlmCallSettlement {
    call.turn.executionScope.throwIfAborted({ kind: 'post_llm_stream' });
    this.commitRequest(call, request);
    if (collector.text) {
      call.memoryManager.ingestAssistantResponse(
        new CompleteResponse({ content: collector.text, reasoning: null, providerNativeAssistantTurn: null }),
        call.turn.turnId,
        'LlmPhaseOutputLimited'
      );
    }
    const truncatedToolNames = collector.completeOutputLimited(OUTPUT_LIMIT_DISCARDED_TOOL_CALL_ERROR);
    const response = new CompleteResponse({ content: collector.text, usage: collector.usage, finish });
    this.notifyTokenUsage(call, collector.usage);
    return { kind: 'output_limited', response, truncatedToolNames };
  }

  /** A normal finish: ingest the answer or its tool calls, then commit the input. */
  private settleCompleted(call: LlmCall, request: RequestPackage, collector: LlmResponseStreamCollector): LlmCallSettlement {
    const { turn, memoryManager } = call;
    const toolInvocations = collector.completeNormally();
    turn.executionScope.throwIfAborted({ kind: 'post_llm_stream' });
    const response = collector.buildResponse();
    this.notifyTokenUsage(call, collector.usage);

    if (toolInvocations.length) {
      turn.executionScope.throwIfAborted({ kind: 'llm_tool_intents' });
      turn.startToolInvocationBatch(toolInvocations);
      memoryManager.ingestAssistantToolResponse(response, toolInvocations, turn.turnId, 'LlmPhase');
    } else {
      turn.executionScope.throwIfAborted({ kind: 'llm_assistant_response' });
      memoryManager.ingestAssistantResponse(response, turn.turnId, 'LlmPhase');
    }
    this.commitRequest(call, request);
    return { kind: 'completed', response, toolInvocations };
  }

  /** Keeps whatever text/reasoning was produced and commits the input; the caller rethrows. */
  private settleInterrupted(call: LlmCall, request: RequestPackage, collector: LlmResponseStreamCollector, reason: string): void {
    collector.abandonInterrupted(reason);
    try {
      if (collector.text || collector.reasoning) {
        call.memoryManager.ingestAssistantResponse(
          new CompleteResponse({
            content: collector.text,
            reasoning: collector.reasoning || null,
            usage: null
          }),
          call.turn.turnId,
          'LlmPhaseInterruptedPartial'
        );
      }
    } finally {
      if (!call.recoverySettled) this.commitRequest(call, request);
    }
  }

  /** Rolls the input back (unless already settled) and ends the turn with a clear error. */
  private settleFailed(
    call: LlmCall,
    request: RequestPackage,
    collector: LlmResponseStreamCollector,
    error: unknown,
  ): LlmPhaseOutcome {
    const evidence = error instanceof MissingApiKeyError
      ? { message: error.message, providerCode: error.kind }
      : extractProviderErrorEvidence(error);
    const errorMessage = evidence.message;
    const errorCode = error instanceof MissingApiKeyError
      ? error.kind
      : evidence.providerCode || 'LLM_PROVIDER_ERROR';
    if (!call.recoverySettled) {
      this.restoreRequest(call, request, 'provider or response ingestion failed before a usable response', 'LlmPhase.stream');
    }
    collector.abandonFailed(errorMessage);
    call.notifier?.notifyAgentErrorOutputGeneration({
      code: errorCode,
      message: errorMessage,
      ...(evidence.details ? { details: evidence.details } : {}),
      ...(evidence.providerStatus !== undefined ? { provider_status: evidence.providerStatus } : {}),
      ...(evidence.providerCode ? { provider_code: evidence.providerCode } : {}),
      ...(evidence.providerRequestId ? { provider_request_id: evidence.providerRequestId } : {}),
      classification: { scope: 'turn', effect: 'diagnostic', turnId: call.turn.turnId }
    });
    return {
      kind: 'final',
      isError: true,
      response: new CompleteResponse({ content: errorMessage, usage: null })
    };
  }

  /** Evaluates compaction after the response, runs after-final compaction, returns the outcome. */
  private async finishCall(
    call: LlmCall,
    request: RequestPackage,
    collector: LlmResponseStreamCollector,
    settlement: LlmCallSettlement,
  ): Promise<LlmPhaseOutcome> {
    const { turn } = call;
    turn.executionScope.throwIfAborted({ kind: 'llm_compaction' });
    const compactionDecision = call.compaction?.evaluateAfterResponse({
      usage: collector.usage,
      observedPromptTokens: collector.usage ? resolveLatestPromptTokens(collector.usage) : null,
      turnId: turn.turnId,
    }) ?? null;

    if (settlement.kind === 'output_limited') {
      // The turn continues, so the compaction threshold is evaluated but nothing runs after it.
      return {
        kind: 'output_limited',
        response: settlement.response,
        truncatedToolNames: settlement.truncatedToolNames,
        outputTokenLimit: resolveRequestMaxOutputTokens(call.llm.model, call.llm.config),
      };
    }
    if (settlement.toolInvocations.length) {
      return { kind: 'tool_invocations', response: settlement.response, toolInvocations: settlement.toolInvocations };
    }
    if (compactionDecision?.kind === 'requested' && call.compaction) {
      await call.compaction.executeAfterFinalResponse({
        assembler: call.assembler,
        requestTools: request.tools,
        turnId: turn.turnId,
        scope: turn.executionScope,
        context: call.context,
        notifier: call.notifier,
      });
    }
    return { kind: 'final', response: settlement.response };
  }

  private commitRequest(call: LlmCall, request: RequestPackage): void {
    call.memoryManager.commitLlmRequestRecoverySnapshot(request.recoverySnapshot);
    call.recoverySettled = true;
  }

  private restoreRequest(call: LlmCall, request: RequestPackage, reason: string, sourceEvent: string): void {
    call.memoryManager.restoreLlmRequestRecoverySnapshot(request.recoverySnapshot, { reason, sourceEvent });
    call.recoverySettled = true;
  }

  private notifyTokenUsage(call: LlmCall, tokenUsage: LlmTokenUsageObservation | null): void {
    if (!tokenUsage) return;
    const latestPromptTokens = resolveLatestPromptTokens(tokenUsage);
    call.notifier?.notifyAgentTokenUsageUpdated({
      usage: tokenUsage,
      turn_id: call.turn.turnId,
      llm_call_id: call.callId,
      call_sequence: call.callSequence,
      runtime_kind: 'autobyteus',
      ingestion_kind: 'autobyteus_llm_phase',
      idempotency_key: `${call.agentId}:${call.callId}`,
      latest_prompt_tokens: latestPromptTokens,
      effective_context_window_tokens: call.requestCapacity?.effectiveContextCapacity ?? null,
      context_window_usage_percent: percentOf(latestPromptTokens, call.requestCapacity?.effectiveContextCapacity)
    });
  }
}
