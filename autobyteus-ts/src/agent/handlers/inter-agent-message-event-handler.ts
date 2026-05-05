import { AgentEventHandler } from './base-event-handler.js';
import { InterAgentMessageReceivedEvent, UserMessageReceivedEvent, BaseEvent } from '../events/agent-events.js';
import type { InterAgentMessage } from '../message/inter-agent-message.js';
import { AgentInputUserMessage } from '../message/agent-input-user-message.js';
import { SenderType } from '../sender-type.js';
import type { AgentContext } from '../context/agent-context.js';
import { resolveTeamCommunicationContext } from '../../agent-team/context/team-communication-context.js';

const resolveSenderDisplayName = (context: AgentContext, senderAgentId: string): string | null => {
  const communicationContext = resolveTeamCommunicationContext(context.customData?.teamContext);
  if (!communicationContext) {
    return null;
  }
  const resolved = communicationContext.resolveMemberNameByAgentId(senderAgentId);
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
        `'${interAgentMsg.senderAgentId}', type '${interAgentMsg.messageType}'. ` +
        `Content: '${interAgentMsg.content}'`
    );

    const notifier = context.statusManager?.notifier;
    if (notifier?.notifyAgentDataInterAgentMessageReceived) {
      notifier.notifyAgentDataInterAgentMessageReceived({
        sender_agent_id: interAgentMsg.senderAgentId,
        recipient_role_name: interAgentMsg.recipientRoleName,
        content: interAgentMsg.content,
        message_type: interAgentMsg.messageType,
        reference_files: interAgentMsg.referenceFiles,
      });
    }

    const normalizedSenderName =
      senderDisplayName && senderDisplayName.trim()
        ? senderDisplayName.trim()
        : interAgentMsg.senderAgentId;

    const referenceFilesBlock =
      interAgentMsg.referenceFiles.length > 0
        ? `\n\nReference files:\n${interAgentMsg.referenceFiles.map((filePath) => `- ${filePath}`).join('\n')}`
        : '';

    const contentForLlm =
      `You received a message from sender name: ${normalizedSenderName}, sender id: ${interAgentMsg.senderAgentId}\n` +
      `message:\n${interAgentMsg.content}${referenceFilesBlock}`;

    const agentInputUserMessage = new AgentInputUserMessage(
      contentForLlm,
      SenderType.AGENT,
      null,
      {
        sender_agent_id: interAgentMsg.senderAgentId,
        original_message_type: interAgentMsg.messageType,
        reference_files: interAgentMsg.referenceFiles
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
