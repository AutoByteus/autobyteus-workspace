import { useAgentArtifactsStore } from '~/stores/agentArtifactsStore';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { ArtifactPersistedPayload, ArtifactUpdatedPayload } from '../protocol/messageTypes';

export const handleArtifactPersisted = (
  payload: ArtifactPersistedPayload,
  context: AgentContext
): void => {
  const { agent_id, path, type, url, workspace_root } = payload;
  const runId = agent_id;
  const store = useAgentArtifactsStore();
  
  const MEDIA_AND_DOC_TYPES = ['image', 'audio', 'video', 'pdf', 'csv', 'excel'];
  if (!MEDIA_AND_DOC_TYPES.includes(type)) {
    return;
  }

  store.markTouchedEntryAvailableFromArtifactPersisted(runId, {
    artifactId: payload.artifact_id,
    path,
    type,
    url: url ?? null,
    workspaceRoot: workspace_root ?? null,
    sourceTool: MEDIA_AND_DOC_TYPES.includes(type) ? 'generated_output' : undefined,
  });
};

export const handleArtifactUpdated = (
  payload: ArtifactUpdatedPayload,
  context: AgentContext
): void => {
  void payload;
  void context;
};
