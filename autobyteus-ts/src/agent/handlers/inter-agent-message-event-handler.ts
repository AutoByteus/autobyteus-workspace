import { AgentEventHandler } from './base-event-handler.js';
import { InterAgentMessageReceivedEvent, UserMessageReceivedEvent, BaseEvent } from '../events/agent-events.js';
import type { InterAgentMessage } from '../message/inter-agent-message.js';
import { AgentInputUserMessage } from '../message/agent-input-user-message.js';
import { SenderType } from '../sender-type.js';
import type { AgentContext } from '../context/agent-context.js';

type TeamContextLike = {
  teamManager?: {
    resolveMemberNameByAgentId?: (agentId: string) => string | null;
  } | null;
};

const resolveSenderDisplayName = (context: AgentContext, senderAgentId: string): string | null => {
  const teamContext = context.customData?.teamContext as TeamContextLike | undefined;
  const teamManager = teamContext?.teamManager;
  if (!teamManager || typeof teamManager.resolveMemberNameByAgentId !== 'function') {
    return null;
  }
  const resolved = teamManager.resolveMemberNameByAgentId(senderAgentId);
  if (typeof resolved !== 'string' || !resolved.trim()) {
    return null;
  }
  return resolved.trim();
};

export class InterAgentMessageReceivedEventHandler extends AgentEventHandler {
  constructor() {
    super();
    console.info('InterAgentMessageReceivedEventHandler initialized.');
  }

  async handle(event: BaseEvent, context: AgentContext): Promise<void> {
    if (!(event instanceof InterAgentMessageReceivedEvent)) {
      const eventType = event?.constructor?.name ?? typeof event;
      console.warn(
        `InterAgentMessageReceivedEventHandler received an event of type ${eventType} instead of InterAgentMessageReceivedEvent. Skipping.`
      );
      return;
    }

    const interAgentMsg: InterAgentMessage = event.interAgentMessage;
    const senderDisplayName = resolveSenderDisplayName(context, interAgentMsg.senderAgentId);

    console.info(
      `Agent '${context.agentId}' handling InterAgentMessageReceivedEvent from sender ` +
        `'${interAgentMsg.senderAgentId}', type '${interAgentMsg.messageType.value}'. ` +
        `Content: '${interAgentMsg.content}'`
    );

    const notifier = context.statusManager?.notifier;
    if (notifier?.notifyAgentDataInterAgentMessageReceived) {
      notifier.notifyAgentDataInterAgentMessageReceived({
        sender_agent_id: interAgentMsg.senderAgentId,
        recipient_role_name: interAgentMsg.recipientRoleName,
        content: interAgentMsg.content,
        message_type: interAgentMsg.messageType.value,
      });
    }

    const normalizedSenderName =
      senderDisplayName && senderDisplayName.trim()
        ? senderDisplayName.trim()
        : interAgentMsg.senderAgentId;

    const contentForLlm =
      `You received a message from sender name: ${normalizedSenderName}, sender id: ${interAgentMsg.senderAgentId}\n` +
      `message:\n${interAgentMsg.content}`;

    const agentInputUserMessage = new AgentInputUserMessage(
      contentForLlm,
      SenderType.AGENT,
      null,
      {
        sender_agent_id: interAgentMsg.senderAgentId,
        original_message_type: interAgentMsg.messageType.value
      }
    );

    const userMessageReceivedEvent = new UserMessageReceivedEvent(agentInputUserMessage);
    await context.inputEventQueues.enqueueUserMessage(userMessageReceivedEvent);

    console.info(
      `Agent '${context.agentId}' processed InterAgentMessage from sender '${interAgentMsg.senderAgentId}' ` +
        'and enqueued UserMessageReceivedEvent to route through input pipeline.'
    );
  }
}
