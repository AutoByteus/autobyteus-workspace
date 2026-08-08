import type { AgentContext } from '~/types/agent/AgentContext';
import type { ExternalUserMessagePayload } from '../protocol/messageTypes';
import {
  buildUserMessageFromProjectionPayload,
  upsertUserMessageByIdentity,
} from './userMessageProjection';

export const handleExternalUserMessage = (
  payload: ExternalUserMessagePayload,
  context: AgentContext,
) => {
  upsertUserMessageByIdentity({
    context,
    userMessage: buildUserMessageFromProjectionPayload(payload),
  });
};
