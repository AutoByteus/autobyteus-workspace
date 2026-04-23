import { randomUUID } from 'node:crypto';
import { AgentEventHandler } from './base-event-handler.js';
import {
  LLMUserMessageReadyEvent,
  LLMCompleteResponseReceivedEvent,
  PendingToolInvocationEvent,
  BaseEvent
} from '../events/agent-events.js';
import { CompleteResponse } from '../../llm/utils/response-types.js';
import { BaseLLM } from '../../llm/base.js';
import { StreamingResponseHandlerFactory } from '../streaming/handlers/streaming-handler-factory.js';
import { SegmentEvent, SegmentType } from '../streaming/segments/segment-events.js';
import { OpenAIChatRenderer } from '../../llm/prompt-renderers/openai-chat-renderer.js';
import { LLMRequestAssembler, type RequestPackage } from '../llm-request-assembler.js';
import { CompactionPreparationError } from '../compaction/compaction-preparation-error.js';
import { CompactionRuntimeReporter } from '../compaction/compaction-runtime-reporter.js';
import { applyCompactionPolicy, resolveTokenBudget } from '../token-budget.js';
import { CompactionRuntimeSettingsResolver } from '../../memory/compaction/compaction-runtime-settings.js';
import { PendingCompactionExecutor } from '../../memory/compaction/pending-compaction-executor.js';
import { defaultToolRegistry } from '../../tools/registry/tool-registry.js';
import type { ParameterSchema } from '../../utils/parameter-schema.js';
import type { AgentContext } from '../context/agent-context.js';
import type { TokenUsage } from '../../llm/utils/token-usage.js';

export class LLMUserMessageReadyEventHandler extends AgentEventHandler {
  constructor() {
    super();
    console.info('LLMUserMessageReadyEventHandler initialized.');
  }

  async handle(event: BaseEvent, context: AgentContext): Promise<void> {
    if (!(event instanceof LLMUserMessageReadyEvent)) {
      console.warn(
        `LLMUserMessageReadyEventHandler received non-LLMUserMessageReadyEvent: ${event?.constructor?.name ?? typeof event}. Skipping.`
      );
      return;
    }

    const agentId = context.agentId;
    const llmInstance = context.state.llmInstance as BaseLLM | null;
    if (!llmInstance) {
      const errorMsg = `Agent '${agentId}' received LLMUserMessageReadyEvent but LLM instance is not yet initialized.`;
      console.error(errorMsg);
      context.statusManager?.notifier?.notifyAgentErrorOutputGeneration(
        'LLMUserMessageReadyEventHandler.pre_llm_check',
        errorMsg
      );
      throw new Error(errorMsg);
    }

    const llmUserMessage = event.llmUserMessage;
    const activeTurnId = event.turnId;
    console.info(`Agent '${agentId}' handling LLMUserMessageReadyEvent: '${llmUserMessage.content}'`);
    console.debug(
      `Agent '${agentId}' preparing to send full message to LLM:\n---\n${llmUserMessage.content}\n---`
    );
    const memoryManager = context.state.memoryManager;
    if (!memoryManager) {
      throw new Error(`Agent '${agentId}' requires a memory manager to assemble LLM requests.`);
    }

    const activeTurn = context.state.activeTurn;
    if (!activeTurn || activeTurn.turnId !== activeTurnId) {
      const errorMessage =
        `Agent '${agentId}' received LLMUserMessageReadyEvent for turn '${activeTurnId}', ` +
        `but activeTurn is '${activeTurn?.turnId ?? 'null'}'.`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    let completeResponseText = '';
    let completeReasoningText = '';
    let tokenUsage: TokenUsage | null = null;
    const completeImageUrls: string[] = [];
    const completeAudioUrls: string[] = [];
    const completeVideoUrls: string[] = [];

    const notifier = context.statusManager?.notifier ?? null;
    const compactionReporter = new CompactionRuntimeReporter(agentId, notifier ?? null);
    const runtimeSettingsResolver = new CompactionRuntimeSettingsResolver();
    if (!notifier) {
      console.error(
        `Agent '${agentId}': Notifier not available in LLMUserMessageReadyEventHandler. Cannot emit segment events.`
      );
    }

    const emitSegmentEvent = (segmentEvent: SegmentEvent): void => {
      if (!notifier) {
        return;
      }
      try {
        notifier.notifyAgentSegmentEvent(segmentEvent.toDict());
      } catch (error) {
        console.error(`Agent '${agentId}': Error notifying segment event: ${error}`);
      }
    };

    const toolNames: string[] = [];
    const toolInstances = context.state.toolInstances;
    const toolArgumentSchemaResolver = (toolName: string): ParameterSchema | null => {
      const toolInstance = toolInstances?.[toolName];
      if (toolInstance) {
        try {
          if (toolInstance.definition?.argumentSchema) {
            return toolInstance.definition.argumentSchema;
          }
          const toolClass = toolInstance.constructor as {
            getArgumentSchema?: () => ParameterSchema | null;
          };
          if (typeof toolClass.getArgumentSchema === 'function') {
            return toolClass.getArgumentSchema();
          }
        } catch (error) {
          console.warn(`Agent '${agentId}': Failed to resolve XML argument schema for tool '${toolName}': ${error}`);
        }
      }

      return defaultToolRegistry.getToolDefinition(toolName)?.argumentSchema ?? null;
    };

    if (toolInstances && Object.keys(toolInstances).length > 0) {
      toolNames.push(...Object.keys(toolInstances));
    } else if (context.config.tools) {
      for (const tool of context.config.tools as any[]) {
        if (typeof tool === 'string') {
          toolNames.push(tool);
        } else if (tool && typeof tool.getName === 'function') {
          try {
            toolNames.push(tool.getName());
          } catch {
            console.warn(`Agent '${agentId}': Failed to resolve tool name from ${tool?.constructor?.name ?? typeof tool}.`);
          }
        } else {
          console.warn(`Agent '${agentId}': Unsupported tool entry in config: ${tool?.constructor?.name ?? typeof tool}.`);
        }
      }
    }

    const provider = llmInstance.model?.provider ?? null;
    const handlerResult = StreamingResponseHandlerFactory.create({
      toolNames,
      provider,
      onSegmentEvent: emitSegmentEvent,
      turnId: activeTurnId,
      agentId,
      xmlArgumentSchemaResolver: toolArgumentSchemaResolver
    });
    const streamingHandler = handlerResult.handler;

    console.info(
      `Agent '${agentId}': Streaming handler selected: ${streamingHandler.constructor.name}`
    );

    const streamKwargs: Record<string, any> = {};
    if (handlerResult.toolSchemas) {
      streamKwargs.tools = handlerResult.toolSchemas;
      console.info(
        `Agent '${agentId}': Passing ${handlerResult.toolSchemas.length} tool schemas to LLM API (Provider: ${provider}).`
      );
    }

    const segmentIdPrefix = `segment_${randomUUID().replace(/-/g, '')}:`;
    let currentReasoningPartId: string | null = null;

    const renderer = (llmInstance as any)._renderer ?? new OpenAIChatRenderer();
    const pendingCompactionExecutor = new PendingCompactionExecutor(memoryManager, {
      reporter: compactionReporter,
      runtimeSettingsResolver,
      fallbackCompactionModelIdentifier: llmInstance.model.modelIdentifier,
      maxEpisodic: 3,
      maxSemantic: 20,
    });
    const assembler = new LLMRequestAssembler(memoryManager, renderer, pendingCompactionExecutor);
    const systemPrompt = context.state.processedSystemPrompt ?? llmInstance.config.systemMessage ?? null;

    let request: RequestPackage;
    try {
      request = await assembler.prepareRequest(
        llmUserMessage,
        activeTurnId,
        systemPrompt ?? undefined,
        llmInstance.model.modelIdentifier
      );
    } catch (error) {
      if (error instanceof CompactionPreparationError) {
        await this.enqueueErrorCompletion(
          agentId,
          activeTurnId,
          context,
          notifier,
          'LLMUserMessageReadyEventHandler.prepareRequest',
          error.message,
          String(error.cause ?? error)
        );
        return;
      }
      throw error;
    }

    let parsedToolInvocationCount = 0;

    try {
      for await (const chunkResponse of llmInstance.streamMessages(
        request.messages,
        request.renderedPayload,
        streamKwargs
      )) {
        if (chunkResponse.content) {
          completeResponseText += chunkResponse.content;
        }
        if (chunkResponse.reasoning) {
          completeReasoningText += chunkResponse.reasoning;
        }

        if (chunkResponse.is_complete) {
          if (chunkResponse.usage) {
            tokenUsage = chunkResponse.usage;
          }
          if (chunkResponse.image_urls?.length) {
            completeImageUrls.push(...chunkResponse.image_urls);
          }
          if (chunkResponse.audio_urls?.length) {
            completeAudioUrls.push(...chunkResponse.audio_urls);
          }
          if (chunkResponse.video_urls?.length) {
            completeVideoUrls.push(...chunkResponse.video_urls);
          }
        }

        if (chunkResponse.reasoning) {
          if (!currentReasoningPartId) {
            currentReasoningPartId = `${segmentIdPrefix}reasoning_${randomUUID().replace(/-/g, '')}`;
            emitSegmentEvent(SegmentEvent.start(activeTurnId, currentReasoningPartId, SegmentType.REASONING));
          }
          emitSegmentEvent(SegmentEvent.content(activeTurnId, currentReasoningPartId, chunkResponse.reasoning));
        }

        streamingHandler.feed(chunkResponse);
      }

      streamingHandler.finalize();

      if (toolNames.length) {
        const toolInvocations = streamingHandler.getAllInvocations();
        if (toolInvocations.length) {
          parsedToolInvocationCount = toolInvocations.length;
          activeTurn.startToolInvocationBatch(toolInvocations);
          console.info(
            `Agent '${agentId}': Parsed ${toolInvocations.length} tool invocations from streaming parser.`
          );
          memoryManager.ingestToolIntents(toolInvocations, activeTurnId);
          for (const invocation of toolInvocations) {
            await context.inputEventQueues.enqueueToolInvocationRequest(
              new PendingToolInvocationEvent(invocation)
            );
          }
        }
      }

      if (currentReasoningPartId) {
        emitSegmentEvent(SegmentEvent.end(activeTurnId, currentReasoningPartId));
      }
    } catch (error) {
      console.error(`Agent '${agentId}' error during LLM stream: ${error}`);
      const errorMessage = `Error processing your request with the LLM: ${String(error)}`;
      await this.enqueueErrorCompletion(
        agentId,
        activeTurnId,
        context,
        notifier,
        'LLMUserMessageReadyEventHandler.streamUserMessage',
        errorMessage,
        String(error)
      );
      return;
    }

    const completeResponse = new CompleteResponse({
      content: completeResponseText,
      reasoning: completeReasoningText || null,
      usage: tokenUsage,
      image_urls: completeImageUrls,
      audio_urls: completeAudioUrls,
      video_urls: completeVideoUrls
    });

    memoryManager.ingestAssistantResponse(
      completeResponse,
      activeTurnId,
      'LLMCompleteResponseReceivedEvent',
      {
        appendToWorkingContext: parsedToolInvocationCount === 0
      }
    );

    const runtimeSettings = runtimeSettingsResolver.resolve();
    if (tokenUsage) {
      const budget = resolveTokenBudget(
        llmInstance.model,
        llmInstance.config,
        memoryManager.compactionPolicy,
        runtimeSettings
      );
      if (budget) {
        applyCompactionPolicy(memoryManager.compactionPolicy, budget);
        const compactionRequired = Boolean(
          memoryManager.compactor && memoryManager.compactionPolicy.shouldCompact(
            tokenUsage.prompt_tokens,
            budget.inputBudget
          )
        );

        compactionReporter.logBudgetEvaluated({
          prompt_tokens: tokenUsage.prompt_tokens,
          effective_total_context_tokens: budget.effectiveContextCapacity,
          context_derived_input_cap_tokens: budget.contextDerivedInputCapTokens,
          provider_input_cap_tokens: budget.providerInputCapTokens,
          effective_input_cap_tokens: budget.effectiveInputCapacity,
          reserved_output_tokens: budget.reservedOutputTokens,
          safety_margin_tokens: budget.safetyMarginTokens,
          input_budget_tokens: budget.inputBudget,
          compaction_ratio: budget.compactionRatio,
          trigger_threshold_tokens: budget.triggerThresholdTokens,
          override_active: budget.overrideActive,
          compaction_required: compactionRequired
        }, runtimeSettings.detailedLogsEnabled);

        if (compactionRequired) {
          memoryManager.requestCompaction();
          compactionReporter.emitStatus({
            phase: 'requested',
            turn_id: activeTurnId,
            selected_block_count: null,
            compacted_block_count: null,
            raw_trace_count: null,
            semantic_fact_count: null,
            compaction_model_identifier: runtimeSettings.compactionModelIdentifier ?? llmInstance.model.modelIdentifier
          });
        }
      }
    } else {
      compactionReporter.logBudgetSkippedNoUsage({
        turn_id: activeTurnId,
        reason: 'missing_usage'
      }, runtimeSettings.detailedLogsEnabled);
    }

    await context.inputEventQueues.enqueueInternalSystemEvent(
      new LLMCompleteResponseReceivedEvent(completeResponse, false, activeTurnId)
    );
    console.info(
      `Agent '${agentId}' enqueued LLMCompleteResponseReceivedEvent from LLMUserMessageReadyEventHandler.`
    );
  }

  private async enqueueErrorCompletion(
    agentId: string,
    activeTurnId: string,
    context: AgentContext,
    notifier: {
      notifyAgentErrorOutputGeneration?: (source: string, message: string, details?: string) => void;
    } | null | undefined,
    source: string,
    errorMessage: string,
    errorDetails?: string
  ): Promise<void> {
    if (notifier?.notifyAgentErrorOutputGeneration) {
      try {
        notifier.notifyAgentErrorOutputGeneration(
          source,
          errorMessage,
          errorDetails
        );
      } catch (notifyError) {
        console.error(
          `Agent '${agentId}': Error notifying agent output error after LLM failure: ${notifyError}`
        );
      }
    }

    const errorResponse = new CompleteResponse({ content: errorMessage, usage: null });
    await context.inputEventQueues.enqueueInternalSystemEvent(
      new LLMCompleteResponseReceivedEvent(errorResponse, true, activeTurnId)
    );
    console.info(`Agent '${agentId}' enqueued LLMCompleteResponseReceivedEvent with error details.`);
  }
}
