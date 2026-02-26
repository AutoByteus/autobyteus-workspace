import { randomUUID } from 'node:crypto';
import { AgentEventHandler } from './base-event-handler.js';
import {
  LLMUserMessageReadyEvent,
  LLMCompleteResponseReceivedEvent,
  PendingToolInvocationEvent,
  BaseEvent
} from '../events/agent-events.js';
import { ChunkResponse, CompleteResponse } from '../../llm/utils/response-types.js';
import { BaseLLM } from '../../llm/base.js';
import { StreamingResponseHandlerFactory } from '../streaming/handlers/streaming-handler-factory.js';
import { SegmentEvent, SegmentType } from '../streaming/segments/segment-events.js';
import { ToolInvocationTurn } from '../tool-invocation-turn.js';
import { OpenAIChatRenderer } from '../../llm/prompt-renderers/openai-chat-renderer.js';
import { LLMRequestAssembler } from '../llm-request-assembler.js';
import { applyCompactionPolicy, resolveTokenBudget } from '../token-budget.js';
import type { AgentContext } from '../context/agent-context.js';
import type { LLMUserMessage } from '../../llm/user-message.js';
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
    console.info(`Agent '${agentId}' handling LLMUserMessageReadyEvent: '${llmUserMessage.content}'`);
    console.debug(
      `Agent '${agentId}' preparing to send full message to LLM:\n---\n${llmUserMessage.content}\n---`
    );
    const memoryManager = context.state.memoryManager;
    if (!memoryManager) {
      throw new Error(`Agent '${agentId}' requires a memory manager to assemble LLM requests.`);
    }

    let activeTurnId = context.state.activeTurnId ?? null;
    if (!activeTurnId) {
      activeTurnId = memoryManager.startTurn();
      context.state.activeTurnId = activeTurnId;
    }

    let completeResponseText = '';
    let completeReasoningText = '';
    let tokenUsage: TokenUsage | null = null;
    const completeImageUrls: string[] = [];
    const completeAudioUrls: string[] = [];
    const completeVideoUrls: string[] = [];

    const notifier = context.statusManager?.notifier ?? null;
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
      agentId
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

    const segmentIdPrefix = `turn_${randomUUID().replace(/-/g, '')}:`;
    let currentReasoningPartId: string | null = null;

    const renderer = (llmInstance as any)._renderer ?? new OpenAIChatRenderer();
    const assembler = new LLMRequestAssembler(memoryManager, renderer);
    const systemPrompt = context.state.processedSystemPrompt ?? llmInstance.config.systemMessage ?? null;
    const request = await assembler.prepareRequest(llmUserMessage, activeTurnId, systemPrompt ?? undefined);

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
            emitSegmentEvent(SegmentEvent.start(currentReasoningPartId, SegmentType.REASONING));
          }
          emitSegmentEvent(SegmentEvent.content(currentReasoningPartId, chunkResponse.reasoning));
        }

        streamingHandler.feed(chunkResponse);
      }

      streamingHandler.finalize();

      if (toolNames.length) {
        const toolInvocations = streamingHandler.getAllInvocations();
        if (toolInvocations.length) {
          context.state.activeToolInvocationTurn = new ToolInvocationTurn(activeTurnId, toolInvocations);
          console.info(
            `Agent '${agentId}': Parsed ${toolInvocations.length} tool invocations from streaming parser.`
          );
          for (const invocation of toolInvocations) {
            if (activeTurnId && !invocation.turnId) {
              invocation.turnId = activeTurnId;
            }
            if (memoryManager) {
              memoryManager.ingestToolIntent(invocation, activeTurnId ?? undefined);
            }
            await context.inputEventQueues.enqueueToolInvocationRequest(
              new PendingToolInvocationEvent(invocation)
            );
          }
        }
      }

      if (currentReasoningPartId) {
        emitSegmentEvent(SegmentEvent.end(currentReasoningPartId));
      }
    } catch (error) {
      console.error(`Agent '${agentId}' error during LLM stream: ${error}`);
      const errorMessage = `Error processing your request with the LLM: ${String(error)}`;

      if (notifier) {
        try {
          notifier.notifyAgentErrorOutputGeneration(
            'LLMUserMessageReadyEventHandler.streamUserMessage',
            errorMessage,
            String(error)
          );
        } catch (notifyError) {
          console.error(
            `Agent '${agentId}': Error notifying agent output error after LLM stream failure: ${notifyError}`
          );
        }
      }

      const errorResponse = new CompleteResponse({ content: errorMessage, usage: null });
      await context.inputEventQueues.enqueueInternalSystemEvent(
        new LLMCompleteResponseReceivedEvent(errorResponse, true, activeTurnId)
      );
      console.info(`Agent '${agentId}' enqueued LLMCompleteResponseReceivedEvent with error details.`);
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

    if (memoryManager && activeTurnId) {
      memoryManager.ingestAssistantResponse(completeResponse, activeTurnId, 'LLMCompleteResponseReceivedEvent');
      if (tokenUsage) {
        const budget = resolveTokenBudget(llmInstance.model, llmInstance.config, memoryManager.compactionPolicy);
        if (budget) {
          applyCompactionPolicy(memoryManager.compactionPolicy, budget);
          if (memoryManager.compactor && memoryManager.compactionPolicy.shouldCompact(
            tokenUsage.prompt_tokens,
            budget.inputBudget
          )) {
            memoryManager.requestCompaction();
          }
        }
      }
    }

    await context.inputEventQueues.enqueueInternalSystemEvent(
      new LLMCompleteResponseReceivedEvent(completeResponse, false, activeTurnId)
    );
    console.info(
      `Agent '${agentId}' enqueued LLMCompleteResponseReceivedEvent from LLMUserMessageReadyEventHandler.`
    );
  }
}
