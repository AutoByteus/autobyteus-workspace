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
  return upsertUserMessageByIdentity({
    context,
    userMessage: buildUserMessageFromProjectionPayload(payload),
    retainExistingNonExecutableContextFiles: true,
  });
};
