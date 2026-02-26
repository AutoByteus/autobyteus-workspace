import { setActivePinia, createPinia } from 'pinia';
import { useAgentArtifactsStore } from '~/stores/agentArtifactsStore';
import { describe, it, expect, beforeEach } from 'vitest';

describe('AgentArtifactsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should create a pending artifact and set it as active', () => {
    const store = useAgentArtifactsStore();
    const runId = 'agent-1';
    
    store.createPendingArtifact(runId, 'test.py', 'file');

    const active = store.getActiveStreamingArtifactForRun(runId);
    expect(active).toBeTruthy();
    expect(active?.path).toBe('test.py');
    expect(active?.status).toBe('streaming');
    expect(active?.content).toBe('');

    const all = store.getArtifactsForRun(runId);
    expect(all).toHaveLength(1);
    expect(all[0]).toBe(active);
  });

  it('should append content to the active artifact', async () => {
    const store = useAgentArtifactsStore();
    const runId = 'agent-1';
    store.createPendingArtifact(runId, 'test.py');
    
    // Check that updatedAt is recent (not the original createdAt)
    // Wait to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 2));

    store.appendArtifactContent(runId, 'print(');
    store.appendArtifactContent(runId, '"hello")');
    
    // Wait for timestamp update
    const active = store.getActiveStreamingArtifactForRun(runId);
    expect(active?.content).toBe('print("hello")');
    expect(active?.updatedAt).toBeDefined();
    // Check that updatedAt is recent (not the original createdAt)
    expect(active?.updatedAt).not.toBe(active?.createdAt);
  });

  it('should finalize artifact stream and clear active state', () => {
    const store = useAgentArtifactsStore();
    const runId = 'agent-1';
    store.createPendingArtifact(runId, 'test.py');
    store.appendArtifactContent(runId, 'code');
    
    store.finalizeArtifactStream(runId);

    const active = store.getActiveStreamingArtifactForRun(runId);
    expect(active).toBeNull(); // Should be cleared

    const all = store.getArtifactsForRun(runId);
    expect(all[0].status).toBe('pending_approval');
    expect(all[0].content).toBe('code');
  });

  it('should mark artifact as persisted', () => {
    const store = useAgentArtifactsStore();
    const runId = 'agent-1';
    store.createPendingArtifact(runId, 'test.py');
    store.finalizeArtifactStream(runId);
    
    store.markArtifactPersisted(runId, 'test.py');
    
    const all = store.getArtifactsForRun(runId);
    expect(all[0].status).toBe('persisted');
  });

  it('should update existing artifact instead of creating duplicate when same path is used', () => {
    const store = useAgentArtifactsStore();
    const runId = 'agent-1';

    // First write to fibonacci.py
    store.createPendingArtifact(runId, 'fibonacci.py');
    store.appendArtifactContent(runId, 'version 1');
    store.finalizeArtifactStream(runId);
    store.markArtifactPersisted(runId, 'fibonacci.py');

    // Second write to same file
    store.createPendingArtifact(runId, 'fibonacci.py');
    store.appendArtifactContent(runId, 'version 2');
    store.finalizeArtifactStream(runId);

    // Should still only have ONE artifact
    const all = store.getArtifactsForRun(runId);
    expect(all).toHaveLength(1);
    expect(all[0].content).toBe('version 2');
    expect(all[0].status).toBe('pending_approval');
  });

  it('should create a media artifact directly with persisted status and url', () => {
    const store = useAgentArtifactsStore();
    const runId = 'agent-1';
    const path = 'images/output.png';
    const url = 'http://localhost:8000/rest/files/images/output.png';
    
    store.createMediaArtifact({
      id: 'media-1',
      runId,
      path,
      type: 'image',
      url
    });
    
    const all = store.getArtifactsForRun(runId);
    expect(all).toHaveLength(1);
    expect(all[0].path).toBe(path);
    expect(all[0].type).toBe('image');
    expect(all[0].status).toBe('persisted');
    expect(all[0].url).toBe(url);
  });

  it('should create an audio artifact directly', () => {
    const store = useAgentArtifactsStore();
    const runId = 'agent-1';
    const path = 'audio/speech.mp3';
    const url = 'http://localhost:8000/rest/files/audio/speech.mp3';
    
    store.createMediaArtifact({
      id: 'media-2',
      runId,
      path,
      type: 'audio',
      url
    });
    
    const all = store.getArtifactsForRun(runId);
    expect(all).toHaveLength(1);
    expect(all[0].type).toBe('audio');
    expect(all[0].status).toBe('persisted');
    expect(all[0].url).toBe(url);
  });
});
