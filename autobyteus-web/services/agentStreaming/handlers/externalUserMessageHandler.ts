import type { AgentContext } from '~/types/agent/AgentContext';
import type { ExternalUserMessagePayload } from '../protocol/messageTypes';
import {
  buildUserMessageFromProjectionPayload,
  upsertUserMessageByIdentity,
} from './userMessageProjection';
import type { EventMonitorPresentationMutation } from '~/services/eventMonitor/recentEventMonitorWindow';

export const handleExternalUserMessage = (
  payload: ExternalUserMessagePayload,
  context: AgentContext,
): EventMonitorPresentationMutation => {
  const changed = upsertUserMessageByIdentity({
    context,
    userMessage: buildUserMessageFromProjectionPayload(payload),
  });
  context.isSending = true;
  return changed ? 'changed' : 'none';
};
