import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { handleArtifactPersisted, handleArtifactUpdated } from '../artifactHandler';
import { useAgentArtifactsStore } from '~/stores/agentArtifactsStore';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { ArtifactPersistedPayload, ArtifactUpdatedPayload } from '../../protocol/messageTypes';

describe('artifactHandler', () => {
  let mockContext: AgentContext;

  beforeEach(() => {
    setActivePinia(createPinia());
    mockContext = {} as AgentContext;
  });

  it('creates generated output entries for persisted media artifacts', () => {
    const store = useAgentArtifactsStore();

    const payload: ArtifactPersistedPayload = {
      artifact_id: 'artifact-456',
      status: 'persisted',
      path: 'images/generated.png',
      agent_id: 'agent-1',
      type: 'image',
      url: 'http://localhost:8000/rest/files/images/generated.png',
    };

    handleArtifactPersisted(payload, mockContext);

    const artifacts = store.getArtifactsForRun('agent-1');
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0]).toMatchObject({
      path: 'images/generated.png',
      status: 'available',
      sourceTool: 'generated_output',
    });
  });

  it('ignores file-backed artifact updates because file changes now come from dedicated file-change events', () => {
    const store = useAgentArtifactsStore();

    const payload: ArtifactUpdatedPayload = {
      artifact_id: 'artifact-789',
      path: 'src/app.py',
      agent_id: 'agent-1',
      type: 'file',
    };

    handleArtifactUpdated(payload, mockContext);

    expect(store.getArtifactsForRun('agent-1')).toEqual([]);
  });
});
