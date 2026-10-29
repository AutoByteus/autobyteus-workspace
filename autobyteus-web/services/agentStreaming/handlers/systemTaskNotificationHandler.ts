import type { AgentContext } from '~/types/agent/AgentContext';
import type { SystemTaskNotificationSegment } from '~/types/segments';
import type { SystemTaskNotificationPayload } from '../protocol/messageTypes';
import { findOrCreateAIMessage } from './segmentHandler';

/**
 * Handle SYSTEM_TASK_NOTIFICATION events for standalone and team member streams.
 */
export function handleSystemTaskNotification(
  payload: SystemTaskNotificationPayload,
  context: AgentContext,
): boolean {
  const aiMessage = findOrCreateAIMessage(context);

  const segment: SystemTaskNotificationSegment = {
    type: 'system_task_notification',
    senderId: payload.sender_id,
    content: payload.content,
  };

  aiMessage.segments.push(segment);
  return true;
}
