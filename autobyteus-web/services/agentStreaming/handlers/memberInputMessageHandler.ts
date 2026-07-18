import type { AgentContext } from '~/types/agent/AgentContext';
import type { MemberInputMessagePayload } from '../protocol/messageTypes';
import {
  buildUserMessageFromProjectionPayload,
  upsertUserMessageByIdentity,
} from './userMessageProjection';
import type { EventMonitorPresentationMutation } from '~/services/eventMonitor/recentEventMonitorWindow';

export const handleMemberInputMessage = (
  payload: MemberInputMessagePayload,
  context: AgentContext,
): EventMonitorPresentationMutation => {
  const changed = upsertUserMessageByIdentity({
    context,
    userMessage: buildUserMessageFromProjectionPayload(payload),
    preserveExistingContextFilesWhenIncomingEmpty: true,
  });
  context.isSending = true;
  return changed ? 'changed' : 'none';
};
