import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAgentArtifactsStore } from '~/stores/agentArtifactsStore';

describe('AgentArtifactsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a write_file touched entry with stable identity and latest-visible announcement', () => {
    const store = useAgentArtifactsStore();
    const runId = 'agent-1';

    const artifact = store.upsertTouchedEntryFromSegmentStart(runId, {
      invocationId: 'write-1',
      path: 'src/test.py',
      sourceTool: 'write_file',
    });

    expect(artifact).toBeTruthy();
    expect(artifact?.id).toBe('agent-1:src/test.py');
    expect(artifact?.status).toBe('streaming');
    expect(artifact?.sourceTool).toBe('write_file');
    expect(artifact?.sourceInvocationId).toBe('write-1');
    expect(artifact?.content).toBe('');
    expect(store.getActiveStreamingArtifactForRun(runId)?.id).toBe('agent-1:src/test.py');
    expect(store.getLatestVisibleArtifactIdForRun(runId)).toBe('agent-1:src/test.py');
    expect(store.getLatestVisibleArtifactVersionForRun(runId)).toBe(1);
  });

  it('creates an edit_file touched entry without an active stream and re-announces the same row on re-touch', () => {
    const store = useAgentArtifactsStore();
    const runId = 'agent-1';

    const first = store.upsertTouchedEntryFromSegmentStart(runId, {
      invocationId: 'edit-1',
      path: 'src/app.ts',
      sourceTool: 'edit_file',
    });

    expect(first?.id).toBe('agent-1:src/app.ts');
    expect(first?.status).toBe('pending');
    expect(first?.sourceTool).toBe('edit_file');
    expect(store.getActiveStreamingArtifactForRun(runId)).toBeNull();
    expect(store.getLatestVisibleArtifactVersionForRun(runId)).toBe(1);

    const second = store.upsertTouchedEntryFromSegmentStart(runId, {
      invocationId: 'edit-2',
      path: 'src/app.ts',
      sourceTool: 'edit_file',
    });

    expect(second?.id).toBe(first?.id);
    expect(store.getArtifactsForRun(runId)).toHaveLength(1);
    expect(second?.sourceInvocationId).toBe('edit-2');
    expect(store.getLatestVisibleArtifactVersionForRun(runId)).toBe(2);
  });

  it('appends content to the active streaming write_file entry', async () => {
    const store = useAgentArtifactsStore();
    const runId = 'agent-1';

    store.upsertTouchedEntryFromSegmentStart(runId, {
      invocationId: 'write-1',
      path: 'src/test.py',
      sourceTool: 'write_file',
    });

    await new Promise((resolve) => setTimeout(resolve, 2));

    store.appendArtifactContent(runId, 'print(');
    store.appendArtifactContent(runId, '"hello")');

    const active = store.getActiveStreamingArtifactForRun(runId);
    expect(active?.content).toBe('print("hello")');
    expect(active?.updatedAt).not.toBe(active?.createdAt);
  });

  it('transitions write_file entries by invocation and accepts lifecycle alias ids', () => {
    const store = useAgentArtifactsStore();
    const runId = 'agent-1';

    store.upsertTouchedEntryFromSegmentStart(runId, {
      invocationId: 'write-1',
      path: 'src/test.py',
      sourceTool: 'write_file',
    });

    store.markTouchedEntryPending(runId, 'write-1:0');
    let artifact = store.getArtifactsForRun(runId)[0];
    expect(artifact.status).toBe('pending');
    expect(store.getActiveStreamingArtifactForRun(runId)).toBeNull();

    store.markTouchedEntryAvailableByInvocation(runId, 'write-1', {
      workspaceRoot: '/workspace',
      backendArtifactId: 'artifact-123',
    });
    artifact = store.getArtifactsForRun(runId)[0];
    expect(artifact.status).toBe('available');
    expect(artifact.workspaceRoot).toBe('/workspace');
    expect(artifact.backendArtifactId).toBe('artifact-123');
  });

  it('marks touched entries as failed by invocation', () => {
    const store = useAgentArtifactsStore();
    const runId = 'agent-1';

    store.upsertTouchedEntryFromSegmentStart(runId, {
      invocationId: 'edit-1',
      path: 'src/app.ts',
      sourceTool: 'edit_file',
    });

    store.markTouchedEntryFailedByInvocation(runId, 'edit-1');

    const artifact = store.getArtifactsForRun(runId)[0];
    expect(artifact.status).toBe('failed');
    expect(artifact.sourceTool).toBe('edit_file');
  });

  it('deduplicates repeated writes to the same path and resets streaming content', () => {
    const store = useAgentArtifactsStore();
    const runId = 'agent-1';

    store.upsertTouchedEntryFromSegmentStart(runId, {
      invocationId: 'write-1',
      path: 'fibonacci.py',
      sourceTool: 'write_file',
    });
    store.appendArtifactContent(runId, 'version 1');
    store.markTouchedEntryPending(runId, 'write-1');
    store.markTouchedEntryAvailableByInvocation(runId, 'write-1');

    store.upsertTouchedEntryFromSegmentStart(runId, {
      invocationId: 'write-2',
      path: 'fibonacci.py',
      sourceTool: 'write_file',
    });
    store.appendArtifactContent(runId, 'version 2');

    const artifacts = store.getArtifactsForRun(runId);
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].id).toBe('agent-1:fibonacci.py');
    expect(artifacts[0].status).toBe('streaming');
    expect(artifacts[0].content).toBe('version 2');
    expect(artifacts[0].sourceInvocationId).toBe('write-2');
  });

  it('creates generated outputs from persisted artifact events and announces them as latest visible', () => {
    const store = useAgentArtifactsStore();
    const runId = 'agent-1';

    const artifact = store.markTouchedEntryAvailableFromArtifactPersisted(runId, {
      artifactId: 'artifact-456',
      path: 'images/generated.png',
      type: 'image',
      url: 'http://localhost:8000/rest/files/images/generated.png',
      workspaceRoot: '/workspace',
      sourceTool: 'generated_output',
    });

    expect(artifact?.id).toBe('agent-1:images/generated.png');
    expect(artifact?.type).toBe('image');
    expect(artifact?.status).toBe('available');
    expect(artifact?.sourceTool).toBe('generated_output');
    expect(artifact?.url).toBe('http://localhost:8000/rest/files/images/generated.png');
    expect(store.getLatestVisibleArtifactIdForRun(runId)).toBe('agent-1:images/generated.png');
    expect(store.getLatestVisibleArtifactVersionForRun(runId)).toBe(1);
  });

  it('refreshes an existing touched entry from artifact updates without re-announcing discoverability', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    const store = useAgentArtifactsStore();
    const runId = 'agent-1';
    store.upsertTouchedEntryFromSegmentStart(runId, {
      invocationId: 'edit-1',
      path: 'src/app.py',
      sourceTool: 'edit_file',
    });
    const before = store.getArtifactsForRun(runId)[0].updatedAt;
    const beforeVersion = store.getLatestVisibleArtifactVersionForRun(runId);

    vi.setSystemTime(new Date('2024-01-01T00:00:01Z'));
    store.refreshTouchedEntryFromArtifactUpdate(runId, {
      artifactId: 'artifact-789',
      path: 'src/app.py',
      type: 'file',
      workspaceRoot: '/workspace',
    });

    const artifacts = store.getArtifactsForRun(runId);
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].status).toBe('pending');
    expect(artifacts[0].backendArtifactId).toBe('artifact-789');
    expect(artifacts[0].workspaceRoot).toBe('/workspace');
    expect(artifacts[0].updatedAt).not.toBe(before);
    expect(store.getLatestVisibleArtifactVersionForRun(runId)).toBe(beforeVersion);

    vi.useRealTimers();
  });

  it('creates pending runtime file-change entries from update-only artifact updates and announces first visibility', () => {
    const store = useAgentArtifactsStore();
    const runId = 'agent-1';

    const artifact = store.refreshTouchedEntryFromArtifactUpdate(runId, {
      path: 'src/new_file.py',
      type: 'file',
    });

    expect(artifact?.status).toBe('pending');
    expect(artifact?.sourceTool).toBe('runtime_file_change');
    expect(store.getLatestVisibleArtifactIdForRun(runId)).toBe('agent-1:src/new_file.py');
    expect(store.getLatestVisibleArtifactVersionForRun(runId)).toBe(1);
  });

  it('creates lifecycle fallback rows with explicit terminal state when invocation lookup misses', () => {
    const store = useAgentArtifactsStore();
    const runId = 'agent-1';

    const artifact = store.ensureTouchedEntryTerminalStateFromLifecycle(runId, {
      path: 'src/missed.py',
      type: 'file',
      sourceTool: 'edit_file',
      status: 'failed',
    });

    expect(artifact?.status).toBe('failed');
    expect(artifact?.sourceTool).toBe('edit_file');
    expect(store.getLatestVisibleArtifactIdForRun(runId)).toBe('agent-1:src/missed.py');
    expect(store.getLatestVisibleArtifactVersionForRun(runId)).toBe(1);
  });
});
