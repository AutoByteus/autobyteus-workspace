/**
 * Team-specific event handlers.
 * 
 * Layer 3 of the agent streaming architecture - handles team-only events:
 * INTER_AGENT_MESSAGE, TEAM_COMMUNICATION_MESSAGE
 */

import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { InterAgentMessageSegment } from '~/types/segments';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import {
  normalizeAgentRuntimeStatus,
  normalizeTeamRuntimeStatus,
} from '~/services/runHydration/runtimeStatusNormalization';
import type { 
  InterAgentMessagePayload, 
  TeamCommunicationMessagePayload,
  TeamStatusPayload,
} from '../protocol/messageTypes';
import { findOrCreateAIMessage } from './segmentHandler';
import { useTeamCommunicationStore } from '~/stores/teamCommunicationStore';
import type { EventMonitorPresentationMutation } from '~/services/eventMonitor/recentEventMonitorWindow';

/**
 * Handle INTER_AGENT_MESSAGE event.
 */
export function handleInterAgentMessage(
  payload: InterAgentMessagePayload,
  context: AgentContext
): EventMonitorPresentationMutation {
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
      if (!changed) return 'none';
      existing.senderAgentRunId = payload.sender_agent_id;
      existing.recipientRoleName = payload.recipient_role_name;
      existing.content = payload.content;
      existing.messageType = payload.message_type;
      return 'changed';
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
  return 'changed';
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
