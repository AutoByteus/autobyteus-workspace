import { AgentEventHandler } from './base-event-handler.js';
import { UserMessageReceivedEvent, LLMUserMessageReadyEvent, BaseEvent } from '../events/agent-events.js';
import { AgentInputUserMessage } from '../message/agent-input-user-message.js';
import { buildLLMUserMessage } from '../message/multimodal-message-builder.js';
import { SenderType } from '../sender-type.js';
import type { AgentContext } from '../context/agent-context.js';

type InputProcessorLike = {
  getName: () => string;
  getOrder: () => number;
  process: (
    message: AgentInputUserMessage,
    context: AgentContext,
    triggeringEvent: UserMessageReceivedEvent
  ) => Promise<AgentInputUserMessage>;
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

export class UserInputMessageEventHandler extends AgentEventHandler {
  constructor() {
    super();
    console.info('UserInputMessageEventHandler initialized.');
  }

  async handle(event: BaseEvent, context: AgentContext): Promise<void> {
    if (!(event instanceof UserMessageReceivedEvent)) {
      const eventType = event?.constructor?.name ?? typeof event;
      console.warn(
        `UserInputMessageEventHandler received non-UserMessageReceivedEvent: ${eventType}. Skipping.`
      );
      return;
    }

    const originalMessage = event.agentInputUserMessage;

    if (originalMessage.senderType === SenderType.SYSTEM) {
      const statusManager: any = context.statusManager;
      const notifier = statusManager?.notifier;
      if (notifier?.notifyAgentDataSystemTaskNotificationReceived) {
        const notificationData = {
          sender_id: originalMessage.metadata?.sender_id ?? 'system',
          content: originalMessage.content
        };
        notifier.notifyAgentDataSystemTaskNotificationReceived(notificationData);
        console.info(
          `Agent '${context.agentId}' emitted system task notification for TUI based on SYSTEM senderType.`
        );
      }
    }

    let processedMessage = cloneAgentInputUserMessage(originalMessage);

    console.info(
      `Agent '${context.agentId}' handling UserMessageReceivedEvent (type: ${originalMessage.senderType}): ` +
        `'${originalMessage.content}'`
    );

    const processorInstances = context.config.inputProcessors as unknown[];
    if (processorInstances && processorInstances.length > 0) {
      const validProcessors: InputProcessorLike[] = [];
      for (const processor of processorInstances) {
        if (isInputProcessor(processor)) {
          validProcessors.push(processor);
        } else {
          console.error(
            `Agent '${context.agentId}': Invalid input processor type in config: ${processor?.constructor?.name ?? typeof processor}. Skipping.`
          );
        }
      }

      const sortedProcessors = validProcessors.sort(
        (left, right) => left.getOrder() - right.getOrder()
      );
      const processorNames = sortedProcessors.map((processor) => processor.getName());
      console.debug(
        `Agent '${context.agentId}': Applying input processors in order: ${JSON.stringify(processorNames)}`
      );

      for (const processor of sortedProcessors) {
        let messageBeforeProcessor = processedMessage;
        let processorName = 'unknown';
        try {
          processorName = processor.getName();
          console.debug(
            `Agent '${context.agentId}': Applying input processor '${processorName}'.`
          );
          messageBeforeProcessor = processedMessage;
          processedMessage = await processor.process(
            messageBeforeProcessor,
            context,
            event
          );
          console.info(
            `Agent '${context.agentId}': Input processor '${processorName}' applied successfully.`
          );
        } catch (error) {
          console.error(
            `Agent '${context.agentId}': Error applying input processor '${processorName}': ${error}. ` +
              'Skipping this processor and continuing with message from before this processor.'
          );
          processedMessage = messageBeforeProcessor;
        }
      }
    } else {
      console.debug(`Agent '${context.agentId}': No input processors configured in agent config.`);
    }

    const llmUserMessage = buildLLMUserMessage(processedMessage);
    const llmUserMessageReadyEvent = new LLMUserMessageReadyEvent(llmUserMessage);
    await context.inputEventQueues.enqueueInternalSystemEvent(llmUserMessageReadyEvent);

    console.info(
      `Agent '${context.agentId}' processed AgentInputUserMessage and enqueued LLMUserMessageReadyEvent.`
    );
  }
}
