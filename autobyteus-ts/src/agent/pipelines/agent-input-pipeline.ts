import { UserMessageReceivedEvent, InterAgentMessageReceivedEvent } from '../events/agent-events.js';
import { AgentInputUserMessage } from '../message/agent-input-user-message.js';
import { buildLLMUserMessage } from '../message/multimodal-message-builder.js';
import { SenderType } from '../sender-type.js';
import { resolveTeamCommunicationContext } from '../../agent-team/context/team-communication-context.js';
import { getToolContinuationMode, NATIVE_API_TOOL_CONTINUATION_MODE } from '../message/tool-continuation-metadata.js';
import { sortProcessors } from './processor-pipeline-runner.js';
import type { LLMUserMessage } from '../../llm/user-message.js';
import type { AgentContext } from '../context/agent-context.js';
import type { AgentTurn } from '../agent-turn.js';
import type { AgentOutbox } from '../outbox/agent-outbox.js';

type InputProcessorLike = {
  getName: () => string;
  getOrder: () => number;
  process: (
    message: AgentInputUserMessage,
    context: AgentContext,
    triggeringEvent: UserMessageReceivedEvent
  ) => Promise<AgentInputUserMessage>;
};

export type LlmRequestMode = 'append_user_message' | 'tool_history_only';

export type AgentInputPipelineResult = {
  llmUserMessage: LLMUserMessage;
  turnId: string;
  sourceEvent: UserMessageReceivedEvent;
  llmRequestMode?: LlmRequestMode;
};

function isInputProcessor(value: unknown): value is InputProcessorLike {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as InputProcessorLike;
  return (
    typeof candidate.getName === 'function' &&
    typeof candidate.getOrder === 'function' &&
    typeof candidate.process === 'function'
  );
}

function cloneAgentInputUserMessage(message: AgentInputUserMessage): AgentInputUserMessage {
  return AgentInputUserMessage.fromDict(message.toDict());
}

const resolveSenderDisplayName = (context: AgentContext, senderAgentId: string): string | null => {
  const communicationContext = resolveTeamCommunicationContext(context.customData?.teamContext);
  const resolved = communicationContext?.resolveMemberNameByAgentId.call(
    communicationContext,
    senderAgentId
  ) ?? null;
  return typeof resolved === 'string' && resolved.trim().length > 0 ? resolved.trim() : null;
};

const buildReferenceFilesBlock = (referenceFiles: string[]): string =>
  referenceFiles.length > 0
    ? `\n\nReference files:\n${referenceFiles.map((filePath) => `- ${filePath}`).join('\n')}`
    : '';

export class AgentInputPipeline {
  async processExternalTrigger(
    event: UserMessageReceivedEvent | InterAgentMessageReceivedEvent,
    context: AgentContext,
    turn: AgentTurn,
    outbox?: AgentOutbox | null
  ): Promise<AgentInputPipelineResult> {
    const userEvent = event instanceof InterAgentMessageReceivedEvent
      ? this.convertInterAgentEvent(event, context, outbox ?? null)
      : event;
    return this.processForLlm(userEvent, context, turn, { startsNewTurn: true, outbox });
  }

  async processToolContinuation(
    message: AgentInputUserMessage,
    context: AgentContext,
    turn: AgentTurn,
    outbox?: AgentOutbox | null
  ): Promise<AgentInputPipelineResult> {
    const event = new UserMessageReceivedEvent(message);
    return this.processForLlm(event, context, turn, { startsNewTurn: false, outbox });
  }

  async processForLlm(
    event: UserMessageReceivedEvent,
    context: AgentContext,
    turn: AgentTurn,
    options: { startsNewTurn: boolean; outbox?: AgentOutbox | null }
  ): Promise<AgentInputPipelineResult> {
    const originalMessage = event.agentInputUserMessage;
    const isToolContinuation = originalMessage.senderType === SenderType.TOOL;

    if (options.startsNewTurn && isToolContinuation) {
      throw new Error(`Agent '${context.agentId}' cannot start a new turn from SenderType.TOOL input.`);
    }
    if (!options.startsNewTurn && !isToolContinuation) {
      throw new Error(`Agent '${context.agentId}' expected SenderType.TOOL for same-turn continuation.`);
    }
    if (!context.state.activeTurn || context.state.activeTurn.turnId !== turn.turnId) {
      throw new Error(
        `Agent '${context.agentId}' input pipeline expected active turn '${turn.turnId}', ` +
          `got '${context.state.activeTurn?.turnId ?? 'null'}'.`
      );
    }

    if (originalMessage.senderType === SenderType.SYSTEM) {
      options.outbox?.publishSystemTaskNotification({
        sender_id: originalMessage.metadata?.sender_id ?? 'system',
        content: originalMessage.content
      });
    }

    let processedMessage = cloneAgentInputUserMessage(originalMessage);
    const validProcessors = (context.config.inputProcessors as unknown[]).filter(isInputProcessor);
    for (const processor of sortProcessors(validProcessors)) {
      let messageBeforeProcessor = processedMessage;
      let processorName = 'unknown';
      try {
        processorName = processor.getName();
        messageBeforeProcessor = processedMessage;
        processedMessage = await processor.process(messageBeforeProcessor, context, event);
      } catch (error) {
        console.error(
          `Agent '${context.agentId}': Error applying input processor '${processorName}': ${error}. ` +
            'Continuing with message from before this processor.'
        );
        processedMessage = messageBeforeProcessor;
      }
    }

    const originalToolContinuationMode = getToolContinuationMode(originalMessage);
    const processedToolContinuationMode = getToolContinuationMode(processedMessage) ?? originalToolContinuationMode;
    const llmRequestMode: LlmRequestMode =
      isToolContinuation && processedToolContinuationMode === NATIVE_API_TOOL_CONTINUATION_MODE
        ? 'tool_history_only'
        : 'append_user_message';

    return {
      llmUserMessage: buildLLMUserMessage(processedMessage),
      turnId: turn.turnId,
      sourceEvent: event,
      llmRequestMode
    };
  }

  private convertInterAgentEvent(
    event: InterAgentMessageReceivedEvent,
    context: AgentContext,
    outbox: AgentOutbox | null
  ): UserMessageReceivedEvent {
    const interAgentMsg = event.interAgentMessage;
    outbox?.publishInterAgentMessage({
      sender_agent_id: interAgentMsg.senderAgentId,
      recipient_role_name: interAgentMsg.recipientRoleName,
      content: interAgentMsg.content,
      message_type: interAgentMsg.messageType,
      reference_files: interAgentMsg.referenceFiles
    });

    const normalizedSenderName =
      resolveSenderDisplayName(context, interAgentMsg.senderAgentId) ?? interAgentMsg.senderAgentId;
    const referenceFilesBlock = buildReferenceFilesBlock(interAgentMsg.referenceFiles);
    const contentForLlm =
      `You received a message from sender name: ${normalizedSenderName}, sender id: ${interAgentMsg.senderAgentId}\n` +
      `message:\n${interAgentMsg.content}${referenceFilesBlock}`;

    return new UserMessageReceivedEvent(
      new AgentInputUserMessage(contentForLlm, SenderType.AGENT, null, {
        sender_agent_id: interAgentMsg.senderAgentId,
        original_message_type: interAgentMsg.messageType,
        reference_files: interAgentMsg.referenceFiles
      })
    );
  }
}
