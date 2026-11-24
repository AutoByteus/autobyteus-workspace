import type { AgentContext } from '~/types/agent/AgentContext';
import type { SystemTaskNotificationSegment } from '~/types/segments';
import type { SystemTaskNotificationPayload } from '../protocol/messageTypes';
import { findOrCreateAIMessage } from './segmentHandler';

/** Whether the conversation already shows the notice with this id (its stored copy, or an earlier frame). */
const showsNotice = (context: AgentContext, messageId: string): boolean =>
  context.conversation.messages.some((message) => message.type === 'ai'
    && message.segments.some((segment) => segment.type === 'system_task_notification' && segment.messageId === messageId));

/**
 * Handle SYSTEM_TASK_NOTIFICATION events for standalone and team member streams. A notice is shown once
 * (autobyteus-526): a frame whose notice id the conversation already shows (a snapshot's stored copy, or the same
 * frame replayed) adds nothing. Every live and replayed frame passes here, so this is the one place of that rule. A
 * notice without an id (older history) is shown as it comes.
 */
export function handleSystemTaskNotification(
  payload: SystemTaskNotificationPayload,
  context: AgentContext,
): boolean {
  const messageId = typeof payload.message_id === 'string' && payload.message_id ? payload.message_id : null;
  if (messageId && showsNotice(context, messageId)) return false;
  const aiMessage = findOrCreateAIMessage(context, payload.occurred_at);

  const segment: SystemTaskNotificationSegment = {
    type: 'system_task_notification',
    senderId: payload.sender_id,
    content: payload.content,
    messageId,
  };

  aiMessage.segments.push(segment);
  return true;
}
