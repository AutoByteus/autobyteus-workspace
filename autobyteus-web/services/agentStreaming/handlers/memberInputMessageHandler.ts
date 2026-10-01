import type { AgentContext } from '~/types/agent/AgentContext';
import type { InterAgentMessageSegment } from '~/types/segments';
import type { MemberInputMessagePayload } from '../protocol/messageTypes';
import { parseInterAgentDelivery } from '~/utils/collaboration/interAgentDelivery';
import { findOrCreateAIMessage } from './segmentHandler';
import {
  buildUserMessageFromProjectionPayload,
  upsertUserMessageByIdentity,
} from './userMessageProjection';

/**
 * A member input: the user's message (user-style), or an agent-to-agent delivery, which shows
 * its sender as "From <Sender>:" inside the receiving agent's message block (RD-004).
 */
export const handleMemberInputMessage = (
  payload: MemberInputMessagePayload,
  context: AgentContext,
) => {
  if (payload.input_origin === 'inter_agent_delivery') return upsertInterAgentDelivery(payload, context);
  return upsertUserMessageByIdentity({
    context,
    userMessage: buildUserMessageFromProjectionPayload(payload),
    retainExistingNonExecutableContextFiles: true,
  });
};

const upsertInterAgentDelivery = (payload: MemberInputMessagePayload, context: AgentContext): boolean => {
  const messageId = payload.message_id?.trim() || '';
  const known = messageId && context.conversation.messages.some((message) => message.type === 'ai'
    && message.segments.some((segment) => segment.type === 'inter_agent_message' && segment.messageId === messageId));
  if (known) return false;
  const delivery = parseInterAgentDelivery(payload.content ?? '');
  const segment: InterAgentMessageSegment = {
    type: 'inter_agent_message',
    ...(messageId ? { messageId } : {}),
    senderAgentRunId: payload.sender_agent_run_id?.trim() || delivery.senderAgentRunId || '',
    senderName: delivery.senderName,
    recipientRoleName: '',
    messageType: 'agent_message',
    content: delivery.body,
  };
  findOrCreateAIMessage(context).segments.push(segment);
  return true;
};
