import { useAgentArtifactsStore, type AgentArtifact } from '~/stores/agentArtifactsStore';
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
  
  if (MEDIA_AND_DOC_TYPES.includes(type)) {
    // Media artifacts are created here (no streaming phase)
    store.createMediaArtifact({
        id: payload.artifact_id,
        runId,
        path,
        type: type as any,
        url: url || '',
        workspaceRoot: workspace_root ?? null
    });
  } else {
    // File artifacts were already created during streaming
    store.markArtifactPersisted(runId, path, workspace_root ?? null);
  }
};

export const handleArtifactUpdated = (
  payload: ArtifactUpdatedPayload,
  context: AgentContext
): void => {
  const store = useAgentArtifactsStore();
  const runId = payload.agent_id;
  store.touchArtifact(
    runId,
    payload.path,
    payload.type as AgentArtifact['type'],
    payload.artifact_id,
    payload.workspace_root ?? null
  );
};
