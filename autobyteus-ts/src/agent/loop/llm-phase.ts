import { CompleteResponse, type ChunkResponse } from '../../llm/utils/response-types.js';
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
    const toolNames = resolveTurnToolNames(context);
    const toolCallsEnabled = toolNames.length > 0;
    const provider = llmInstance.model?.provider ?? null;
    const collector = new LlmResponseStreamCollector({ turnId: activeTurnId, notifier, toolCallsEnabled });
    const toolSchemas = toolCallsEnabled
      ? new ToolSchemaProvider().buildSchema(toolNames, provider)
      : [];

    const compaction = automaticCompaction.kind === 'enabled'
      ? LlmCallCompaction.create({
          automaticCompaction,
          agentId,
          context,
          memoryManager,
          llm: llmInstance,
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
          { turnId: activeTurnId, requestId: llmCallId, isTurnContinuation: turn.isContinuation, signal: turn.executionScope.signal },
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

    let parsedToolInvocations: ToolInvocation[] = [];
    let completeResponse: CompleteResponse;
    let truncatedToolNames: string[] | null = null;
    const notifyTokenUsage = (): void => {
      const tokenUsage = collector.usage;
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
        conversationRequestKwargs(agentId, request.tools),
        conversationRequestOptions({ signal: turn.executionScope.signal, turnId: activeTurnId }),
      );

      await collector.consume(stream as AsyncIterable<ChunkResponse>, turn.executionScope);

      turn.executionScope.throwIfAborted({ kind: 'llm_stream_finalize' });
      const reportedFinish = collector.finish;
      if (reportedFinish?.reason === 'content_filter' || reportedFinish?.reason === 'context_window_exceeded') {
        throw buildResponseStopError(reportedFinish);
      }
      if (reportedFinish?.reason === 'output_limit') {
        // Settle as output-limited: commit the input, keep only the partial text (no reasoning,
        // no native turn), discard every tool call. Nothing below can be interrupted.
        turn.executionScope.throwIfAborted({ kind: 'post_llm_stream' });
        releaseRequest();
        if (collector.text) {
          memoryManager.ingestAssistantResponse(
            new CompleteResponse({ content: collector.text, reasoning: null, providerNativeAssistantTurn: null }),
            activeTurnId,
            'LlmPhaseOutputLimited'
          );
        }
        truncatedToolNames = collector.completeOutputLimited(OUTPUT_LIMIT_DISCARDED_TOOL_CALL_ERROR);
        completeResponse = new CompleteResponse({ content: collector.text, usage: collector.usage, finish: reportedFinish });
        notifyTokenUsage();
      } else {
        const toolInvocations = collector.completeNormally();
        turn.executionScope.throwIfAborted({ kind: 'post_llm_stream' });
        completeResponse = collector.buildResponse();
        notifyTokenUsage();

        if (toolCallsEnabled && toolInvocations.length) {
          parsedToolInvocations = toolInvocations;
          turn.executionScope.throwIfAborted({ kind: 'llm_tool_intents' });
          turn.startToolInvocationBatch(toolInvocations);
          memoryManager.ingestAssistantToolResponse(completeResponse, toolInvocations, activeTurnId, 'LlmPhase');
        }

        if (parsedToolInvocations.length === 0) {
          turn.executionScope.throwIfAborted({ kind: 'llm_assistant_response' });
          memoryManager.ingestAssistantResponse(completeResponse, activeTurnId, 'LlmPhase');
        }
        releaseRequest();
      }
    } catch (error) {
      if (isAgentInterruptionError(error)) {
        collector.abandonInterrupted(error.reason);
        try {
          if (collector.text || collector.reasoning) {
            memoryManager.ingestAssistantResponse(
              new CompleteResponse({
                content: collector.text,
                reasoning: collector.reasoning || null,
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
      collector.abandonFailed(errorMessage);
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
    const compactionDecision = compaction?.evaluateAfterResponse({
      usage: collector.usage,
      observedPromptTokens: collector.usage ? resolveLatestPromptTokens(collector.usage) : null,
      turnId: activeTurnId,
    }) ?? null;

    if (truncatedToolNames) {
      // The turn continues, so the compaction threshold is evaluated but nothing runs after it.
      return {
        kind: 'output_limited',
        response: completeResponse,
        truncatedToolNames,
        outputTokenLimit: resolveRequestMaxOutputTokens(llmInstance.model, llmInstance.config),
      };
    }

    const toolInvocations = turn.activeToolInvocationBatch && parsedToolInvocations.length > 0
      ? parsedToolInvocations
      : [];
    if (!toolInvocations.length && compactionDecision?.kind === 'requested' && compaction) {
      await compaction.executeAfterFinalResponse({
        assembler,
        requestTools: request.tools,
        turnId: activeTurnId,
        scope: turn.executionScope,
        context,
        notifier,
      });
    }
    if (toolInvocations.length) {
      return { kind: 'tool_invocations', response: completeResponse, toolInvocations };
    }
    return { kind: 'final', response: completeResponse };
  }
}
