/**
 * Team-specific event handlers.
 * 
 * Layer 3 of the agent streaming architecture - handles team-only events:
 * INTER_AGENT_MESSAGE
 */

import type { AgentContext } from '~/types/agent/AgentContext';
import type { InterAgentMessageSegment } from '~/types/segments';
import type { InterAgentMessagePayload } from '../protocol/messageTypes';
import { findOrCreateAIMessage } from './segmentHandler';

/**
 * Handle INTER_AGENT_MESSAGE event.
 */
export function handleInterAgentMessage(
  payload: InterAgentMessagePayload,
  context: AgentContext
): boolean {
  const messageId = payload.message_id?.trim() || '';
  if (messageId) {
    for (const message of context.conversation.messages) {
      if (message.type !== 'ai') continue;
      const existing = message.segments.find(
        (segment): segment is InterAgentMessageSegment =>
          segment.type === 'inter_agent_message' && segment.messageId === messageId,
      );
      if (!existing) continue;
      const changed = existing.senderAgentRunId !== payload.sender_agent_id
        || existing.recipientRoleName !== payload.recipient_role_name
        || existing.content !== payload.content
        || existing.messageType !== payload.message_type;
      if (!changed) return false;
      existing.senderAgentRunId = payload.sender_agent_id;
      existing.recipientRoleName = payload.recipient_role_name;
      existing.content = payload.content;
      existing.messageType = payload.message_type;
      return true;
    }
  }
  const aiMessage = findOrCreateAIMessage(context);
  
  const segment: InterAgentMessageSegment = {
    type: 'inter_agent_message',
    ...(messageId ? { messageId } : {}),
    senderAgentRunId: payload.sender_agent_id,
    recipientRoleName: payload.recipient_role_name,
    content: payload.content,
    messageType: payload.message_type,
  };
  
  aiMessage.segments.push(segment);
  return true;
}
