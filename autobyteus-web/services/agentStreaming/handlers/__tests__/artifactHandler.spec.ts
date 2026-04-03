import { beforeEach, describe, expect, it, vi } from 'vitest';
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

  describe('handleArtifactPersisted', () => {
    it('marks an existing file touched entry as available without re-announcing discoverability', () => {
      const store = useAgentArtifactsStore();
      const runId = 'agent-1';
      const path = 'src/app.py';

      store.upsertTouchedEntryFromSegmentStart(runId, {
        invocationId: 'write-1',
        path,
        sourceTool: 'write_file',
      });
      store.markTouchedEntryPending(runId, 'write-1');
      const beforeVersion = store.getLatestVisibleArtifactVersionForRun(runId);

      const payload: ArtifactPersistedPayload = {
        artifact_id: 'artifact-123',
        status: 'persisted',
        path,
        agent_id: runId,
        type: 'file',
        workspace_root: '/workspace',
      };

      handleArtifactPersisted(payload, mockContext);

      const artifacts = store.getArtifactsForRun(runId);
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].status).toBe('available');
      expect(artifacts[0].backendArtifactId).toBe('artifact-123');
      expect(artifacts[0].workspaceRoot).toBe('/workspace');
      expect(artifacts[0].sourceTool).toBe('write_file');
      expect(store.getLatestVisibleArtifactVersionForRun(runId)).toBe(beforeVersion);
    });

    it('creates generated output entries directly for persisted media artifacts', () => {
      const store = useAgentArtifactsStore();
      const runId = 'agent-1';
      const path = 'images/generated.png';
      const url = 'http://localhost:8000/rest/files/images/generated.png';

      const payload: ArtifactPersistedPayload = {
        artifact_id: 'artifact-456',
        status: 'persisted',
        path,
        agent_id: runId,
        type: 'image',
        url,
      };

      handleArtifactPersisted(payload, mockContext);

      const artifacts = store.getArtifactsForRun(runId);
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].type).toBe('image');
      expect(artifacts[0].status).toBe('available');
      expect(artifacts[0].sourceTool).toBe('generated_output');
      expect(artifacts[0].url).toBe(url);
    });
  });

  describe('handleArtifactUpdated', () => {
    it('refreshes an existing touched entry by path', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

      const store = useAgentArtifactsStore();
      const runId = 'agent-1';
      const path = 'src/app.py';

      store.upsertTouchedEntryFromSegmentStart(runId, {
        invocationId: 'edit-1',
        path,
        sourceTool: 'edit_file',
      });
      const before = store.getArtifactsForRun(runId)[0].updatedAt;
      const beforeVersion = store.getLatestVisibleArtifactVersionForRun(runId);

      const payload: ArtifactUpdatedPayload = {
        artifact_id: 'artifact-789',
        path,
        agent_id: runId,
        type: 'file',
        workspace_root: '/workspace',
      };

      vi.setSystemTime(new Date('2024-01-01T00:00:01Z'));
      handleArtifactUpdated(payload, mockContext);

      const artifact = store.getArtifactsForRun(runId)[0];
      expect(artifact.status).toBe('pending');
      expect(artifact.backendArtifactId).toBe('artifact-789');
      expect(artifact.workspaceRoot).toBe('/workspace');
      expect(artifact.updatedAt).not.toBe(before);
      expect(store.getLatestVisibleArtifactVersionForRun(runId)).toBe(beforeVersion);

      vi.useRealTimers();
    });

    it('creates a pending touched entry when update arrives before segment registration', () => {
      const store = useAgentArtifactsStore();
      const runId = 'agent-1';
      const path = 'src/new_file.py';

      const payload: ArtifactUpdatedPayload = {
        path,
        agent_id: runId,
        type: 'file',
      };

      handleArtifactUpdated(payload, mockContext);

      const artifacts = store.getArtifactsForRun(runId);
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].path).toBe(path);
      expect(artifacts[0].status).toBe('pending');
      expect(artifacts[0].sourceTool).toBe('runtime_file_change');
    });
  });
});
