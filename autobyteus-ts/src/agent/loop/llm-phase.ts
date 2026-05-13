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
import { PendingCompactionExecutor } from '../../memory/compaction/pending-compaction-executor.js';
import { isAgentInterruptionError } from '../interruption/agent-interruption.js';
import { buildToolArgumentSchemaResolver, resolveTurnToolNames } from './llm-phase-tools.js';
import { evaluateLlmPhaseCompaction } from './llm-phase-compaction.js';
import type { AgentContext } from '../context/agent-context.js';
import type { AgentTurn } from '../agent-turn.js';
import type { AgentInputPipelineResult } from '../pipelines/agent-input-pipeline.js';
import type { AgentOutbox } from '../outbox/agent-outbox.js';
import type { ToolInvocation } from '../tool-invocation.js';
import type { TokenUsage } from '../../llm/utils/token-usage.js';

export type LlmPhaseOutcome =
  | { kind: 'final'; response: CompleteResponse; isError?: boolean }
  | { kind: 'tool_invocations'; response: CompleteResponse; toolInvocations: ToolInvocation[] };

export class LlmPhase {
  async run(
    input: AgentInputPipelineResult,
    context: AgentContext,
    turn: AgentTurn,
    outbox: AgentOutbox
  ): Promise<LlmPhaseOutcome> {
    const agentId = context.agentId;
    const llmInstance = context.state.llmInstance as BaseLLM | null;
    if (!llmInstance) {
      const errorMessage = `Agent '${agentId}' requires an initialized LLM instance.`;
      outbox.publishError('LlmPhase.pre_llm_check', errorMessage);
      throw new Error(errorMessage);
    }

    const activeTurnId = turn.turnId;
    const memoryManager = context.state.memoryManager;
    if (!memoryManager) {
      throw new Error(`Agent '${agentId}' requires a memory manager to assemble LLM requests.`);
    }

    let completeResponseText = '';
    let completeReasoningText = '';
    let tokenUsage: TokenUsage | null = null;
    const completeImageUrls: string[] = [];
    const completeAudioUrls: string[] = [];
    const completeVideoUrls: string[] = [];

    const compactionReporter = new CompactionRuntimeReporter(agentId, context.statusManager?.notifier ?? null);
    const runtimeSettingsResolver = new CompactionRuntimeSettingsResolver();

    const toolNames = resolveTurnToolNames(context);
    const provider = llmInstance.model?.provider ?? null;
    const handlerResult = StreamingResponseHandlerFactory.create({
      toolNames,
      provider,
      onSegmentEvent: (segmentEvent) => outbox.publishSegment(segmentEvent),
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
    const pendingCompactionExecutor = new PendingCompactionExecutor(memoryManager, {
      reporter: compactionReporter,
      runtimeSettingsResolver,
      maxEpisodic: 3,
      maxSemantic: 20
    });
    const assembler = new LLMRequestAssembler(memoryManager, renderer, pendingCompactionExecutor);
    const systemPrompt = context.state.processedSystemPrompt ?? llmInstance.config.systemMessage ?? null;

    let request: RequestPackage;
    try {
      request = await turn.executionScope.runAbortable(
        { kind: 'llm_request_assembly' },
        () => input.llmRequestMode === 'tool_history_only'
          ? assembler.prepareToolContinuationRequest(activeTurnId, systemPrompt ?? undefined)
          : assembler.prepareRequest(input.llmUserMessage, activeTurnId, systemPrompt ?? undefined)
      );
    } catch (error) {
      if (error instanceof CompactionPreparationError) {
        turn.executionScope.throwIfAborted({ kind: 'llm_request_assembly' });
        outbox.publishError('LlmPhase.prepareRequest', error.message, String(error.cause ?? error));
        return {
          kind: 'final',
          isError: true,
          response: new CompleteResponse({ content: error.message, usage: null })
        };
      }
      throw error;
    }
    turn.executionScope.throwIfAborted({ kind: 'llm_request_assembly' });

    const segmentIdPrefix = `segment_${randomUUID().replace(/-/g, '')}:`;
    let currentReasoningPartId: string | null = null;
    let parsedToolInvocationCount = 0;

    try {
      turn.executionScope.throwIfAborted({ kind: 'llm_stream_start' });
      const stream = llmInstance.streamMessages(
        request.messages,
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
            outbox.publishSegment(SegmentEvent.start(activeTurnId, currentReasoningPartId, SegmentType.REASONING));
          }
          outbox.publishSegment(SegmentEvent.content(activeTurnId, currentReasoningPartId, chunkResponse.reasoning));
        }

        streamingHandler.feed(chunkResponse);
      }

      turn.executionScope.throwIfAborted({ kind: 'llm_stream_finalize' });
      streamingHandler.finalize();
      if (currentReasoningPartId) {
        outbox.publishSegment(SegmentEvent.end(activeTurnId, currentReasoningPartId));
        currentReasoningPartId = null;
      }
    } catch (error) {
      if (isAgentInterruptionError(error)) {
        streamingHandler.finalizeInterrupted(error.reason);
        if (currentReasoningPartId) {
          outbox.publishSegment(
            SegmentEvent.end(activeTurnId, currentReasoningPartId, {
              interrupted: true,
              reason: error.reason
            })
          );
          currentReasoningPartId = null;
        }
        throw error;
      }

      const errorMessage = `Error processing your request with the LLM: ${String(error)}`;
      streamingHandler.finalizeFailed(errorMessage);
      if (currentReasoningPartId) {
        outbox.publishSegment(
          SegmentEvent.end(activeTurnId, currentReasoningPartId, {
            failed: true,
            error: errorMessage
          })
        );
        currentReasoningPartId = null;
      }
      outbox.publishError('LlmPhase.stream', errorMessage, String(error));
      return {
        kind: 'final',
        isError: true,
        response: new CompleteResponse({ content: errorMessage, usage: null })
      };
    }

    turn.executionScope.throwIfAborted({ kind: 'post_llm_stream' });
    const completeResponse = new CompleteResponse({
      content: completeResponseText,
      reasoning: completeReasoningText || null,
      usage: tokenUsage,
      image_urls: completeImageUrls,
      audio_urls: completeAudioUrls,
      video_urls: completeVideoUrls
    });

    if (toolNames.length) {
      const toolInvocations = streamingHandler.getAllInvocations();
      if (toolInvocations.length) {
        parsedToolInvocationCount = toolInvocations.length;
        turn.executionScope.throwIfAborted({ kind: 'llm_tool_intents' });
        turn.startToolInvocationBatch(toolInvocations);
        memoryManager.ingestToolIntents(toolInvocations, activeTurnId, {
          assistantContent: completeResponseText || null,
          assistantReasoning: completeReasoningText || null
        });
      }
    }

    turn.executionScope.throwIfAborted({ kind: 'llm_assistant_response' });
    memoryManager.ingestAssistantResponse(
      completeResponse,
      activeTurnId,
      'LlmPhase',
      { appendToWorkingContext: parsedToolInvocationCount === 0 }
    );

    turn.executionScope.throwIfAborted({ kind: 'llm_compaction' });
    evaluateLlmPhaseCompaction({
      llmInstance,
      memoryManager,
      tokenUsage,
      activeTurnId,
      compactionReporter,
      runtimeSettingsResolver,
      outbox
    });

    const toolInvocations = turn.activeToolInvocationBatch && parsedToolInvocationCount > 0
      ? streamingHandler.getAllInvocations()
      : [];
    if (toolInvocations.length) {
      return { kind: 'tool_invocations', response: completeResponse, toolInvocations };
    }
    return { kind: 'final', response: completeResponse };
  }
}
