import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { handleArtifactPersisted, handleArtifactUpdated } from '../artifactHandler';
import { useAgentArtifactsStore } from '~/stores/agentArtifactsStore';
import type { ArtifactPersistedPayload, ArtifactUpdatedPayload } from '../../protocol/messageTypes';
import type { AgentContext } from '~/types/agent/AgentContext';

describe('artifactHandler', () => {
  let mockContext: AgentContext;

  beforeEach(() => {
    setActivePinia(createPinia());
    mockContext = {} as AgentContext; // Handler doesn't use context currently
  });

  describe('handleArtifactPersisted', () => {
    it('should mark file artifact as persisted when type is file', () => {
      const store = useAgentArtifactsStore();
      const runId = 'agent-1';
      const path = 'src/app.py';
      
      // First create a pending artifact (simulating streaming flow)
      store.createPendingArtifact(runId, path, 'file');
      store.finalizeArtifactStream(runId);
      
      const payload: ArtifactPersistedPayload = {
        artifact_id: 'artifact-123',
        status: 'persisted',
        path,
        agent_id: runId,
        type: 'file',
      };
      
      handleArtifactPersisted(payload, mockContext);
      
      const artifacts = store.getArtifactsForRun(runId);
      expect(artifacts[0].status).toBe('persisted');
    });

    it('should create image artifact directly when type is image', () => {
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
      expect(artifacts[0].status).toBe('persisted');
      expect(artifacts[0].url).toBe(url);
    });

    it('should create audio artifact directly when type is audio', () => {
      const store = useAgentArtifactsStore();
      const runId = 'agent-1';
      const path = 'audio/speech.mp3';
      const url = 'http://localhost:8000/rest/files/audio/speech.mp3';
      
      const payload: ArtifactPersistedPayload = {
        artifact_id: 'artifact-789',
        status: 'persisted',
        path,
        agent_id: runId,
        type: 'audio',
        url,
      };
      
      handleArtifactPersisted(payload, mockContext);
      
      const artifacts = store.getArtifactsForRun(runId);
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].type).toBe('audio');
      expect(artifacts[0].status).toBe('persisted');
      expect(artifacts[0].url).toBe(url);
    });
  });

  describe('handleArtifactUpdated', () => {
    it('should touch existing artifact by path', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      const store = useAgentArtifactsStore();
      const runId = 'agent-1';
      const path = 'src/app.py';

      store.createPendingArtifact(runId, path, 'file');
      store.finalizeArtifactStream(runId);
      store.markArtifactPersisted(runId, path);
      const before = store.getArtifactsForRun(runId)[0].updatedAt;

      const payload: ArtifactUpdatedPayload = {
        path,
        agent_id: runId,
        type: 'file',
      };
      
      vi.setSystemTime(new Date('2024-01-01T00:00:01Z'));
      handleArtifactUpdated(payload, mockContext);
      const after = store.getArtifactsForRun(runId)[0].updatedAt;

      expect(after).not.toBe(before);
      vi.useRealTimers();
    });

    it('should create a persisted artifact when missing', () => {
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
      expect(artifacts[0].status).toBe('persisted');
    });
  });
});
