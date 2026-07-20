import type { AgentContext } from '~/types/agent/AgentContext';
import type { MemberInputMessagePayload } from '../protocol/messageTypes';
import {
  buildUserMessageFromProjectionPayload,
  upsertUserMessageByIdentity,
} from './userMessageProjection';

export const handleMemberInputMessage = (
  payload: MemberInputMessagePayload,
  context: AgentContext,
) => {
  upsertUserMessageByIdentity({
    context,
    userMessage: buildUserMessageFromProjectionPayload(payload),
    preserveExistingContextFilesWhenIncomingEmpty: true,
  });
  context.isSending = true;
};
