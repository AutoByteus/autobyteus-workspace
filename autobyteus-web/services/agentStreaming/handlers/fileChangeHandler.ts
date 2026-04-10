import { useRunFileChangesStore } from '~/stores/runFileChangesStore';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { FileChangeUpdatedPayload } from '../protocol/messageTypes';

export const handleFileChangeUpdated = (
  payload: FileChangeUpdatedPayload,
  _context: AgentContext,
): void => {
  useRunFileChangesStore().upsertFromLivePayload({
    id: payload.id,
    runId: payload.runId,
    path: payload.path,
    type: payload.type,
    status: payload.status,
    sourceTool: payload.sourceTool,
    sourceInvocationId: payload.sourceInvocationId ?? null,
    backendArtifactId: payload.backendArtifactId ?? null,
    content: payload.content ?? null,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
  });
};
