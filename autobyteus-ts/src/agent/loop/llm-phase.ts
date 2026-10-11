import { randomUUID } from 'node:crypto';
import { CompleteResponse, type ChunkResponse } from '../../llm/utils/response-types.js';
import { BaseLLM } from '../../llm/base.js';
import { LlmStreamingResponseHandler } from '../streaming/handlers/llm-streaming-response-handler.js';
import { SegmentEvent, SegmentType } from '../streaming/segments/segment-events.js';
import { ToolSchemaProvider } from '../../tools/usage/providers/tool-schema-provider.js';
import { LLMRequestAssembler, type RequestPackage } from '../llm-request-assembler.js';
import { CompactionPreparationError } from '../compaction/compaction-preparation-error.js';
import { CompactionRuntimeReporter } from '../compaction/compaction-runtime-reporter.js';
import { CompactionRuntimeSettingsResolver } from '../../memory/compaction/compaction-runtime-settings.js';
import { PendingCompactionExecutor } from '../../memory/compaction/pending-compaction-executor.js';
import { isAgentInterruptionError } from '../interruption/agent-interruption.js';
import { resolveTurnToolNames } from './llm-phase-tools.js';
import { evaluateLlmPhaseCompaction } from './llm-phase-compaction.js';
import {
  applyCompactionPolicy,
  resolveCompactionTokenBudget,
  resolveLlmRequestCapacity,
} from '../token-budget.js';
import type { AgentContext } from '../context/agent-context.js';
import type { AgentTurn } from '../agent-turn.js';
import type { AgentInputPipelineResult } from '../pipelines/agent-input-pipeline.js';
import type { AgentExternalEventNotifier } from '../events/notifiers.js';
import type { ToolInvocation } from '../tool-invocation.js';
import type { LlmTokenUsageObservation } from '../../llm/utils/llm-token-usage-observation.js';
import { MissingApiKeyError } from '../../secrets/provider-api-key-error.js';
import { extractProviderErrorEvidence } from '../../llm/errors/provider-error.js';
import type { ProviderNativeAssistantTurn } from '../../llm/provider-native/provider-native-assistant-turn.js';
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

export class LlmPhase {
  async run(
    input: AgentInputPipelineResult,
    context: AgentContext,
    turn: AgentTurn,
    notifier: AgentExternalEventNotifier | null
  ): Promise<LlmPhaseOutcome> {
    const agentId = context.agentId;
    const llmInstance = context.state.llmInstance as BaseLLM | null;
    if (!llmInstance) {
      const errorMessage = `Agent '${agentId}' requires an initialized LLM instance.`;
      notifier?.notifyAgentErrorOutputGeneration({
        code: 'LLM_NOT_INITIALIZED',
        message: errorMessage,
        classification: { scope: 'turn', effect: 'diagnostic', turnId: turn.turnId }
      });
      throw new Error(errorMessage);
    }

    const activeTurnId = turn.turnId;
    const memoryManager = context.state.memoryManager;
    if (!memoryManager) {
      throw new Error(`Agent '${agentId}' requires a memory manager to assemble LLM requests.`);
    }

    let completeResponseText = '';
    let completeReasoningText = '';
    let tokenUsage: LlmTokenUsageObservation | null = null;
    let providerNativeAssistantTurn: ProviderNativeAssistantTurn | null = null;
    const completeImageUrls: string[] = [];
    const completeAudioUrls: string[] = [];
    const completeVideoUrls: string[] = [];

    const runtimeSettingsResolver = new CompactionRuntimeSettingsResolver();
    const runtimeSettings = runtimeSettingsResolver.resolve();
    const automaticCompaction = memoryManager.getAutomaticCompactionConfiguration();
    const requestCapacity = resolveLlmRequestCapacity(
      llmInstance.model,
      llmInstance.config,
      runtimeSettings,
      automaticCompaction.kind === 'enabled'
        ? automaticCompaction.policy.safetyMarginTokens
        : undefined,
    );
    const compactionTokenBudget = automaticCompaction.kind === 'enabled' && requestCapacity
      ? resolveCompactionTokenBudget(
          requestCapacity,
          llmInstance.model,
          llmInstance.config,
          automaticCompaction.policy,
          runtimeSettings,
        )
      : null;
    if (automaticCompaction.kind === 'enabled' && compactionTokenBudget) {
      applyCompactionPolicy(automaticCompaction.policy, compactionTokenBudget);
    }

    const toolNames = resolveTurnToolNames(context);
    const toolCallsEnabled = toolNames.length > 0;
    const provider = llmInstance.model?.provider ?? null;
    const streamingHandler = new LlmStreamingResponseHandler({
      onSegmentEvent: (segmentEvent) => notifier?.notifyAgentSegmentEvent(segmentEvent.toDict()),
      turnId: activeTurnId,
      toolCallsEnabled
    });
    const toolSchemas = toolCallsEnabled
      ? new ToolSchemaProvider().buildSchema(toolNames, provider)
      : [];

    let compactionReporter: CompactionRuntimeReporter | null = null;
    let pendingCompactionExecutor: PendingCompactionExecutor | null = null;
    if (automaticCompaction.kind === 'enabled') {
      compactionReporter = new CompactionRuntimeReporter(
        agentId,
        context.statusManager?.notifier ?? null,
      );
      const reporter = compactionReporter;
      pendingCompactionExecutor = new PendingCompactionExecutor(memoryManager, {
        reporter, createCompressionStrategy: automaticCompaction.createCompressionStrategy,
        maxItemChars: automaticCompaction.policy.maxItemChars,
        onRecoveryStateChanged: (previous) => context.state.compactionRecovery?.publish(previous),
      });
    }
    const assembler = new LLMRequestAssembler(
      memoryManager,
      pendingCompactionExecutor,
      llmInstance.model.multimodalCapabilities,
    );
    const systemPrompt = context.state.processedSystemPrompt ?? llmInstance.config.systemMessage ?? null;
    const llmCallSequence = turn.nextLlmCallSequence();
    const llmCallId = `${activeTurnId}:llm:${llmCallSequence}`;

    let request: RequestPackage;
    try {
      request = await turn.executionScope.runAbortable(
        { kind: 'llm_request_assembly' },
        () => assembler.prepareRequest(
          input.llmUserMessage,
          { turnId: activeTurnId, requestId: llmCallId, isTurnContinuation: turn.isContinuation, getParentModelIdentifier: () => (context.state.llmInstance as BaseLLM).model.modelIdentifier, signal: turn.executionScope.signal },
          systemPrompt ?? undefined,
          toolSchemas,
        )
      );
    } catch (error) {
      if (error instanceof CompactionPreparationError) {
        turn.executionScope.throwIfAborted({ kind: 'llm_request_assembly' });
        notifier?.notifyAgentErrorOutputGeneration({
          code: 'LLM_REQUEST_PREPARATION_FAILED',
          message: error.message,
          details: String(error.cause ?? error),
          classification: { scope: 'turn', effect: 'diagnostic', turnId: activeTurnId }
        });
        return { kind: 'compaction_blocked' };
      }
      throw error;
    }

    let recoverySettled = false;
    const restoreRequest = (reason: string, sourceEvent: string): void => {
      memoryManager.restoreLlmRequestRecoverySnapshot(
        request.recoverySnapshot,
        { reason, sourceEvent },
      );
      recoverySettled = true;
    };
    const releaseRequest = (): void => {
      memoryManager.commitLlmRequestRecoverySnapshot(request.recoverySnapshot);
      recoverySettled = true;
    };

    const segmentIdPrefix = `segment_${randomUUID().replace(/-/g, '')}:`;
    let currentReasoningPartId: string | null = null;
    let parsedToolInvocationCount = 0;
    let streamFinalized = false;
    let completeResponse: CompleteResponse;
    let finish: LlmResponseFinish | null = null;
    let truncatedToolNames: string[] | null = null;
    const notifyTokenUsage = (): void => {
      if (!tokenUsage) return;
      const latestPromptTokens = resolveLatestPromptTokens(tokenUsage);
      notifier?.notifyAgentTokenUsageUpdated({
        usage: tokenUsage,
        turn_id: activeTurnId,
        llm_call_id: llmCallId,
        call_sequence: llmCallSequence,
        runtime_kind: 'autobyteus',
        ingestion_kind: 'autobyteus_llm_phase',
        idempotency_key: `${agentId}:${llmCallId}`,
        latest_prompt_tokens: latestPromptTokens,
        effective_context_window_tokens: requestCapacity?.effectiveContextCapacity ?? null,
        context_window_usage_percent: percentOf(latestPromptTokens, requestCapacity?.effectiveContextCapacity)
      });
    };

    try {
      turn.executionScope.throwIfAborted({ kind: 'llm_request_assembly' });
      turn.executionScope.throwIfAborted({ kind: 'llm_stream_start' });
      const stream = llmInstance.streamMessages(
        request.outboundMessages,
        { logicalConversationId: agentId, ...(request.tools.length ? { tools: request.tools } : {}) },
        { promptCacheScope: 'conversation', signal: turn.executionScope.signal, turnId: activeTurnId }
      );

      for await (const chunkResponse of turn.executionScope.iterateAbortable(
        { kind: 'llm_stream' },
        stream as AsyncIterable<ChunkResponse>
      )) {
        turn.executionScope.throwIfAborted({ kind: 'llm_stream_chunk' });
        if (chunkResponse.content) completeResponseText += chunkResponse.content;
        if (chunkResponse.reasoning) completeReasoningText += chunkResponse.reasoning;
        if (chunkResponse.providerNativeAssistantTurn) providerNativeAssistantTurn = chunkResponse.providerNativeAssistantTurn;

        if (chunkResponse.is_complete) {
          tokenUsage = chunkResponse.usage ?? null;
          finish = chunkResponse.finish;
          if (chunkResponse.image_urls?.length) completeImageUrls.push(...chunkResponse.image_urls);
          if (chunkResponse.audio_urls?.length) completeAudioUrls.push(...chunkResponse.audio_urls);
          if (chunkResponse.video_urls?.length) completeVideoUrls.push(...chunkResponse.video_urls);
        }

        if (chunkResponse.reasoning) {
          if (!currentReasoningPartId) {
            currentReasoningPartId = `${segmentIdPrefix}reasoning_${randomUUID().replace(/-/g, '')}`;
            notifier?.notifyAgentSegmentEvent(
              SegmentEvent.start(activeTurnId, currentReasoningPartId, SegmentType.REASONING).toDict()
            );
          }
          notifier?.notifyAgentSegmentEvent(
            SegmentEvent.content(activeTurnId, currentReasoningPartId, chunkResponse.reasoning).toDict()
          );
        }

        streamingHandler.feed(chunkResponse);
      }

      turn.executionScope.throwIfAborted({ kind: 'llm_stream_finalize' });
      const reportedFinish = finish as LlmResponseFinish | null;
      if (reportedFinish?.reason === 'content_filter' || reportedFinish?.reason === 'context_window_exceeded') {
        throw buildResponseStopError(reportedFinish);
      }
      if (reportedFinish?.reason === 'output_limit') {
        // Settle as output-limited: commit the input, keep only the partial text (no reasoning,
        // no native turn), discard every tool call. Nothing below can be interrupted.
        turn.executionScope.throwIfAborted({ kind: 'post_llm_stream' });
        releaseRequest();
        if (completeResponseText) {
          memoryManager.ingestAssistantResponse(
            new CompleteResponse({ content: completeResponseText, reasoning: null, providerNativeAssistantTurn: null }),
            activeTurnId,
            'LlmPhaseOutputLimited'
          );
        }
        truncatedToolNames = streamingHandler.finalizeOutputLimited(OUTPUT_LIMIT_DISCARDED_TOOL_CALL_ERROR);
        streamFinalized = true;
        if (currentReasoningPartId) {
          notifier?.notifyAgentSegmentEvent(SegmentEvent.end(activeTurnId, currentReasoningPartId).toDict());
          currentReasoningPartId = null;
        }
        completeResponse = new CompleteResponse({ content: completeResponseText, usage: tokenUsage, finish: reportedFinish });
        notifyTokenUsage();
      } else {
        streamingHandler.finalize();
        streamFinalized = true;
        if (currentReasoningPartId) {
          notifier?.notifyAgentSegmentEvent(SegmentEvent.end(activeTurnId, currentReasoningPartId).toDict());
          currentReasoningPartId = null;
        }
        turn.executionScope.throwIfAborted({ kind: 'post_llm_stream' });
        completeResponse = new CompleteResponse({
          content: completeResponseText,
          reasoning: completeReasoningText || null,
          usage: tokenUsage,
          image_urls: completeImageUrls,
          audio_urls: completeAudioUrls,
          video_urls: completeVideoUrls,
          providerNativeAssistantTurn,
          finish: reportedFinish,
        });
        notifyTokenUsage();

        if (toolCallsEnabled) {
          const toolInvocations = streamingHandler.getAllInvocations();
          if (toolInvocations.length) {
            parsedToolInvocationCount = toolInvocations.length;
            turn.executionScope.throwIfAborted({ kind: 'llm_tool_intents' });
            turn.startToolInvocationBatch(toolInvocations);
            memoryManager.ingestAssistantToolResponse(completeResponse, toolInvocations, activeTurnId, 'LlmPhase');
          }
        }

        if (parsedToolInvocationCount === 0) {
          turn.executionScope.throwIfAborted({ kind: 'llm_assistant_response' });
          memoryManager.ingestAssistantResponse(completeResponse, activeTurnId, 'LlmPhase');
        }
        releaseRequest();
      }
    } catch (error) {
      if (isAgentInterruptionError(error)) {
        if (!streamFinalized) streamingHandler.finalizeInterrupted(error.reason);
        if (currentReasoningPartId) {
          notifier?.notifyAgentSegmentEvent(
            SegmentEvent.end(activeTurnId, currentReasoningPartId, {
              interrupted: true,
              reason: error.reason
            }).toDict()
          );
          currentReasoningPartId = null;
        }
        try {
          if (completeResponseText || completeReasoningText) {
            memoryManager.ingestAssistantResponse(
              new CompleteResponse({
                content: completeResponseText,
                reasoning: completeReasoningText || null,
                usage: null
              }),
              activeTurnId,
              'LlmPhaseInterruptedPartial'
            );
          }
        } finally {
          if (!recoverySettled) releaseRequest();
        }
        throw error;
      }

      const evidence = error instanceof MissingApiKeyError
        ? { message: error.message, providerCode: error.kind }
        : extractProviderErrorEvidence(error);
      const errorMessage = evidence.message;
      const errorCode = error instanceof MissingApiKeyError
        ? error.kind
        : evidence.providerCode || 'LLM_PROVIDER_ERROR';
      if (!recoverySettled) {
        restoreRequest('provider or response ingestion failed before a usable response', 'LlmPhase.stream');
      }
      if (!streamFinalized) streamingHandler.finalizeFailed(errorMessage);
      if (currentReasoningPartId) {
        notifier?.notifyAgentSegmentEvent(
          SegmentEvent.end(activeTurnId, currentReasoningPartId, {
            failed: true,
            error: errorMessage
          }).toDict()
        );
        currentReasoningPartId = null;
      }
      notifier?.notifyAgentErrorOutputGeneration({
        code: errorCode,
        message: errorMessage,
        ...(evidence.details ? { details: evidence.details } : {}),
        ...(evidence.providerStatus !== undefined ? { provider_status: evidence.providerStatus } : {}),
        ...(evidence.providerCode ? { provider_code: evidence.providerCode } : {}),
        ...(evidence.providerRequestId ? { provider_request_id: evidence.providerRequestId } : {}),
        classification: { scope: 'turn', effect: 'diagnostic', turnId: activeTurnId }
      });
      return {
        kind: 'final',
        isError: true,
        response: new CompleteResponse({ content: errorMessage, usage: null })
      };
    }

    turn.executionScope.throwIfAborted({ kind: 'llm_compaction' });
    const compactionDecision = compactionReporter
      ? evaluateLlmPhaseCompaction({
          memoryManager,
          tokenBudget: compactionTokenBudget,
          tokenUsage,
          observedPromptTokens: tokenUsage ? resolveLatestPromptTokens(tokenUsage) : null,
          activeTurnId,
          compactionReporter,
          runtimeSettingsResolver,
        })
      : null;

    if (truncatedToolNames) {
      // The turn continues, so the compaction threshold is evaluated but nothing runs after it.
      return {
        kind: 'output_limited',
        response: completeResponse,
        truncatedToolNames,
        outputTokenLimit: resolveRequestMaxOutputTokens(llmInstance.model, llmInstance.config),
      };
    }

    const toolInvocations = turn.activeToolInvocationBatch && parsedToolInvocationCount > 0
      ? streamingHandler.getAllInvocations()
      : [];
    if (
      !toolInvocations.length
      && compactionDecision?.kind === 'requested'
      && pendingCompactionExecutor
    ) {
      try {
        await pendingCompactionExecutor.executeIfAuthorized({
          executionSite: 'after_final_response',
          turnId: activeTurnId,
          getParentModelIdentifier: () => (context.state.llmInstance as BaseLLM).model.modelIdentifier, signal: turn.executionScope.signal,
        });
      } catch (error) {
        turn.executionScope.throwIfAborted({ kind: 'llm_compaction' });
        context.state.compactionRecovery?.publish();
        const errorMessage = error instanceof Error ? error.message : String(error);
        notifier?.notifyAgentErrorOutputGeneration({
          code: 'LLM_IMMEDIATE_COMPACTION_FAILED',
          message: errorMessage,
          details: String(error),
          classification: { scope: 'turn', effect: 'diagnostic', turnId: activeTurnId }
        });
        // The parent answer was already consumed. Preserve its response/hooks/completion once.
      }
    }
    if (toolInvocations.length) {
      return { kind: 'tool_invocations', response: completeResponse, toolInvocations };
    }
    return { kind: 'final', response: completeResponse };
  }
}
