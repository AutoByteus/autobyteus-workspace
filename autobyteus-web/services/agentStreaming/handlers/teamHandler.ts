/**
 * Team-specific event handlers.
 * 
 * Layer 3 of the agent streaming architecture - handles team-only events:
 * INTER_AGENT_MESSAGE, TEAM_COMMUNICATION_MESSAGE, SYSTEM_TASK_NOTIFICATION
 */

import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { InterAgentMessageSegment, SystemTaskNotificationSegment } from '~/types/segments';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import {
  normalizeAgentRuntimeStatus,
  normalizeTeamRuntimeStatus,
} from '~/services/runHydration/runtimeStatusNormalization';
import type { 
  InterAgentMessagePayload, 
  SystemTaskNotificationPayload,
  TeamCommunicationMessagePayload,
  TeamStatusPayload,
} from '../protocol/messageTypes';
import { findOrCreateAIMessage } from './segmentHandler';
import { useTeamCommunicationStore } from '~/stores/teamCommunicationStore';

/**
 * Handle INTER_AGENT_MESSAGE event.
 */
export function handleInterAgentMessage(
  payload: InterAgentMessagePayload,
  context: AgentContext
): void {
  const aiMessage = findOrCreateAIMessage(context);
  
  const segment: InterAgentMessageSegment = {
    type: 'inter_agent_message',
    senderAgentRunId: payload.sender_agent_id,
    recipientRoleName: payload.recipient_role_name,
    content: payload.content,
    messageType: payload.message_type,
  };
  
  aiMessage.segments.push(segment);
}

/**
 * Handle TEAM_COMMUNICATION_MESSAGE event.
 */
export function handleTeamCommunicationMessage(
  payload: TeamCommunicationMessagePayload,
): void {
  useTeamCommunicationStore().upsertFromBackendPayload(payload);
}

/**
 * Handle SYSTEM_TASK_NOTIFICATION event.
 */
export function handleSystemTaskNotification(
  payload: SystemTaskNotificationPayload,
  context: AgentContext
): void {
  const aiMessage = findOrCreateAIMessage(context);
  
  const segment: SystemTaskNotificationSegment = {
    type: 'system_task_notification',
    senderId: payload.sender_id,
    content: payload.content,
  };
  
  aiMessage.segments.push(segment);
}

/**
 * Handle TEAM_STATUS event.
 */
export function handleTeamStatus(
  payload: TeamStatusPayload,
  context: AgentTeamContext
): void {
  const sourceRouteKey = payload.source_route_key?.trim() || payload.source_path?.join('/') || '';
  if (sourceRouteKey) {
    const sourceNode = context.memberNodesByRouteKey.get(sourceRouteKey) || null;
    if (sourceNode?.memberKind === 'agent_team') {
      sourceNode.currentStatus = normalizeAgentRuntimeStatus(payload.status);
    }
    return;
  }

  context.currentStatus = normalizeTeamRuntimeStatus(payload.status) as AgentTeamStatus;
}

