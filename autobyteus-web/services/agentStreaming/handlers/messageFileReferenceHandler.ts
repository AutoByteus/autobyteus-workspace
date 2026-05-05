import { useMessageFileReferencesStore, type MessageFileReferenceArtifact } from '~/stores/messageFileReferencesStore';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { MessageFileReferencePayload } from '../protocol/messageTypes';

export const handleMessageFileReferenceDeclared = (
  payload: MessageFileReferencePayload,
  _context: AgentContext,
): void => {
  const reference: MessageFileReferenceArtifact = {
    referenceId: payload.referenceId,
    teamRunId: payload.teamRunId,
    senderRunId: payload.senderRunId,
    senderMemberName: payload.senderMemberName ?? null,
    receiverRunId: payload.receiverRunId,
    receiverMemberName: payload.receiverMemberName ?? null,
    path: payload.path,
    type: payload.type,
    messageType: payload.messageType,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
  };

  useMessageFileReferencesStore().upsertFromBackend(reference);
};
