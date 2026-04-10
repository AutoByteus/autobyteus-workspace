import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAgentArtifactsStore } from '~/stores/agentArtifactsStore';

describe('AgentArtifactsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('creates generated output artifacts and announces them as latest visible', () => {
    const store = useAgentArtifactsStore();

    const artifact = store.markTouchedEntryAvailableFromArtifactPersisted('agent-1', {
      artifactId: 'artifact-456',
      path: 'images/generated.png',
      type: 'image',
      url: 'http://localhost:8000/rest/files/images/generated.png',
      sourceTool: 'generated_output',
    });

    expect(artifact).toMatchObject({
      id: 'agent-1:images/generated.png',
      status: 'available',
      sourceTool: 'generated_output',
    });
    expect(store.getLatestVisibleArtifactIdForRun('agent-1')).toBe('agent-1:images/generated.png');
  });
});
