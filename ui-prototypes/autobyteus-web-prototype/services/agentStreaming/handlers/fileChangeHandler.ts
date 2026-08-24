import { useRunFileChangesStore, type RunFileChangeArtifact } from '~/stores/runFileChangesStore';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { FileChangePayload } from '../protocol/messageTypes';

export const handleFileChange = (
  payload: FileChangePayload,
  _context: AgentContext,
): void => {
  const nextPayload: RunFileChangeArtifact = {
    id: payload.id,
    runId: payload.runId,
    path: payload.path,
    type: payload.type,
    status: payload.status,
    sourceTool: payload.sourceTool,
    sourceInvocationId: payload.sourceInvocationId ?? null,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
  };

  if (Object.prototype.hasOwnProperty.call(payload, 'content')) {
    nextPayload.content = payload.content ?? null;
  }

  useRunFileChangesStore().upsertFromLivePayload(nextPayload);
};
