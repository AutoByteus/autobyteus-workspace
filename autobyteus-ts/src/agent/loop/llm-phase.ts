import { randomUUID } from 'node:crypto';
import { CompleteResponse, type ChunkResponse } from '../../llm/utils/response-types.js';
import { BaseLLM } from '../../llm/base.js';
import { StreamingResponseHandlerFactory } from '../streaming/handlers/streaming-handler-factory.js';
import { SegmentEvent, SegmentType } from '../streaming/segments/segment-events.js';
import { OpenAIChatRenderer } from '../../llm/prompt-renderers/openai-chat-renderer.js';
import { LLMRequestAssembler, type RequestPackage } from '../llm-request-assembler.js';
import { CompactionPreparationError } from '../compaction/compaction-preparation-error.js';
import { CompactionRuntimeReporter } from '../compaction/compaction-runtime-reporter.js';
import { CompactionRuntimeSettingsResolver } from '../../memory/compaction/compaction-runtime-settings.js';
import { defaultWorkingContextCompactionStrategyRegistry } from '../../memory/compaction/default-working-context-compaction-strategy-registry.js';
import { PendingCompactionExecutor } from '../../memory/compaction/pending-compaction-executor.js';
import type { WorkingContextCompactionDiagnostics } from '../../memory/compaction/working-context-compaction-strategy.js';
import { WorkingContextCompactionStrategyResolver } from '../../memory/compaction/working-context-compaction-strategy-resolver.js';
import { isAgentInterruptionError } from '../interruption/agent-interruption.js';
import { buildToolArgumentSchemaResolver, resolveTurnToolNames } from './llm-phase-tools.js';
import { evaluateLlmPhaseCompaction } from './llm-phase-compaction.js';
import { applyCompactionPolicy, resolveTokenBudget } from '../token-budget.js';
import type { AgentContext } from '../context/agent-context.js';
import type { AgentTurn } from '../agent-turn.js';
import type { AgentInputPipelineResult } from '../pipelines/agent-input-pipeline.js';
import type { AgentExternalEventNotifier } from '../events/notifiers.js';
import type { ToolInvocation } from '../tool-invocation.js';
import type { LlmTokenUsageObservation } from '../../llm/utils/llm-token-usage-observation.js';

export type LlmPhaseOutcome =
  | { kind: 'final'; response: CompleteResponse; isError?: boolean }
  | { kind: 'tool_invocations'; response: CompleteResponse; toolInvocations: ToolInvocation[] };

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
        source: 'LlmPhase.pre_llm_check',
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
    const completeImageUrls: string[] = [];
    const completeAudioUrls: string[] = [];
    const completeVideoUrls: string[] = [];

    const compactionReporter = new CompactionRuntimeReporter(agentId, context.statusManager?.notifier ?? null);
    const runtimeSettingsResolver = new CompactionRuntimeSettingsResolver();
    const requestTokenBudget = resolveTokenBudget(
      llmInstance.model,
      llmInstance.config,
      memoryManager.compactionPolicy,
      runtimeSettingsResolver.resolve()
    );
    if (requestTokenBudget) {
      applyCompactionPolicy(memoryManager.compactionPolicy, requestTokenBudget);
    }

    const toolNames = resolveTurnToolNames(context);
    const provider = llmInstance.model?.provider ?? null;
    const handlerResult = StreamingResponseHandlerFactory.create({
      toolNames,
      provider,
      onSegmentEvent: (segmentEvent) => notifier?.notifyAgentSegmentEvent(segmentEvent.toDict()),
      turnId: activeTurnId,
      agentId,
      xmlArgumentSchemaResolver: buildToolArgumentSchemaResolver(context)
    });
    const streamingHandler = handlerResult.handler;

    const streamKwargs: Record<string, any> = { logicalConversationId: agentId };
    if (handlerResult.toolSchemas) {
      streamKwargs.tools = handlerResult.toolSchemas;
    }

    const renderer = (llmInstance as any)._renderer ?? new OpenAIChatRenderer();
    const compactionDiagnostics: WorkingContextCompactionDiagnostics = {
      reportPlan: (details) => {
        compactionReporter.recordStrategyPlanDiagnostics(details);
        const pending = memoryManager.getPendingCompactionRequest();
        compactionReporter.logExecutionContext({
          turn_id: activeTurnId,
          compaction_operation_id: pending?.operationId ?? null,
          requested_turn_id: pending?.requestedTurnId ?? null,
          execution_turn_id: activeTurnId,
          pending_compaction: true,
          selected_unit_count: details.selectedUnitCount,
          protected_suffix_unit_count: details.protectedSuffixUnitCount,
          retained_unit_count: details.retainedUnitCount,
          working_context_message_count: details.workingContextMessageCount,
          raw_trace_count: details.rawTraceCount,
        }, runtimeSettingsResolver.resolve().detailedLogsEnabled);
      },
      reportResult: (details) => {
        compactionReporter.recordStrategyResultDiagnostics(details);
        const pending = memoryManager.getPendingCompactionRequest();
        const metadata = details.compactionMetadata;
        compactionReporter.logResultSummary({
          turn_id: activeTurnId,
          compaction_operation_id: pending?.operationId ?? null,
          requested_turn_id: pending?.requestedTurnId ?? null,
          execution_turn_id: activeTurnId,
          selected_block_count: details.selectedUnitCount,
          compacted_block_count: details.compactedUnitCount,
          raw_trace_count: details.rawTraceCount,
          episode_summary_length: details.episodeSummaryLength,
          semantic_fact_count: details.semanticFactCount,
          compaction_agent_definition_id: metadata?.compactionAgentDefinitionId ?? null,
          compaction_agent_name: metadata?.compactionAgentName ?? null,
          compaction_runtime_kind: metadata?.runtimeKind ?? null,
          compaction_model_identifier: metadata?.modelIdentifier ?? null,
          compaction_run_id: metadata?.compactionRunId ?? null,
          compaction_task_id: metadata?.taskId ?? null,
        }, runtimeSettingsResolver.resolve().detailedLogsEnabled);
      },
      reportFailure: (metadata) => {
        compactionReporter.recordStrategyFailureMetadata(metadata);
      },
    };
    const strategyResolver = new WorkingContextCompactionStrategyResolver({
      registry: defaultWorkingContextCompactionStrategyRegistry,
      settingsResolver: runtimeSettingsResolver,
      constructionContext: {
        agentId,
        compactionAgentRunner: context.config.compactionAgentRunner,
        inputBudgetTokens: requestTokenBudget?.inputBudget ?? null,
        maxItemChars: memoryManager.compactionPolicy.maxItemChars,
        diagnostics: compactionDiagnostics,
      },
    });
    const pendingCompactionExecutor = new PendingCompactionExecutor(memoryManager, {
      reporter: compactionReporter,
      strategyResolver,
    });
    const assembler = new LLMRequestAssembler(
      memoryManager,
      renderer,
      pendingCompactionExecutor,
      llmInstance.model.multimodalCapabilities,
    );
    const systemPrompt = context.state.processedSystemPrompt ?? llmInstance.config.systemMessage ?? null;
    const llmCallSequence = turn.toolInvocationBatches.length + 1;
    const llmCallId = `${activeTurnId}:llm:${llmCallSequence}`;

    let request: RequestPackage;
    try {
      request = await turn.executionScope.runAbortable(
        { kind: 'llm_request_assembly' },
        () => input.llmRequestMode === 'tool_history_only'
          ? assembler.prepareToolContinuationRequest(
              { turnId: activeTurnId, requestId: llmCallId },
              systemPrompt ?? undefined,
            )
          : assembler.prepareRequest(
              input.llmUserMessage,
              { turnId: activeTurnId, requestId: llmCallId },
              systemPrompt ?? undefined,
            )
      );
    } catch (error) {
      if (error instanceof CompactionPreparationError) {
        turn.executionScope.throwIfAborted({ kind: 'llm_request_assembly' });
        notifier?.notifyAgentErrorOutputGeneration({
          source: 'LlmPhase.prepareRequest',
          message: error.message,
          details: String(error.cause ?? error),
          classification: { scope: 'turn', effect: 'diagnostic', turnId: activeTurnId }
        });
        return {
          kind: 'final',
          isError: true,
          response: new CompleteResponse({ content: error.message, usage: null })
        };
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

    try {
      turn.executionScope.throwIfAborted({ kind: 'llm_request_assembly' });
      turn.executionScope.throwIfAborted({ kind: 'llm_stream_start' });
      const stream = llmInstance.streamMessages(
        request.outboundMessages,
        request.renderedPayload,
        streamKwargs,
        { signal: turn.executionScope.signal, turnId: activeTurnId }
      );

      for await (const chunkResponse of turn.executionScope.iterateAbortable(
        { kind: 'llm_stream' },
        stream as AsyncIterable<ChunkResponse>
      )) {
        turn.executionScope.throwIfAborted({ kind: 'llm_stream_chunk' });
        if (chunkResponse.content) completeResponseText += chunkResponse.content;
        if (chunkResponse.reasoning) completeReasoningText += chunkResponse.reasoning;

        if (chunkResponse.is_complete) {
          tokenUsage = chunkResponse.usage ?? null;
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
        video_urls: completeVideoUrls
      });

      if (tokenUsage) {
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
          effective_context_window_tokens: requestTokenBudget?.effectiveContextCapacity ?? null,
          context_window_usage_percent: percentOf(latestPromptTokens, requestTokenBudget?.effectiveContextCapacity)
        });
      }

      if (toolNames.length) {
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

      const errorDetails = String(error);
      const errorMessage = `Error processing your request with the LLM: ${errorDetails.slice(0, 1000)}`;
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
        source: 'LlmPhase.stream',
        message: errorMessage,
        details: errorDetails,
        classification: { scope: 'turn', effect: 'diagnostic', turnId: activeTurnId }
      });
      return {
        kind: 'final',
        isError: true,
        response: new CompleteResponse({ content: errorMessage, usage: null })
      };
    }

    turn.executionScope.throwIfAborted({ kind: 'llm_compaction' });
    evaluateLlmPhaseCompaction({
      llmInstance,
      memoryManager,
      tokenUsage,
      activeTurnId,
      compactionReporter,
      runtimeSettingsResolver
    });

    const toolInvocations = turn.activeToolInvocationBatch && parsedToolInvocationCount > 0
      ? streamingHandler.getAllInvocations()
      : [];
    if (!toolInvocations.length && memoryManager.compactionRequired) {
      try {
        await pendingCompactionExecutor.executeIfRequired({
          turnId: activeTurnId,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        notifier?.notifyAgentErrorOutputGeneration({
          source: 'LlmPhase.immediateCompaction',
          message: errorMessage,
          details: String(error),
          classification: { scope: 'turn', effect: 'diagnostic', turnId: activeTurnId }
        });
      }
    }
    if (toolInvocations.length) {
      return { kind: 'tool_invocations', response: completeResponse, toolInvocations };
    }
    return { kind: 'final', response: completeResponse };
  }
}
