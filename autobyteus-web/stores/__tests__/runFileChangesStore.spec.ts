import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useRunFileChangesStore } from '~/stores/runFileChangesStore';

describe('RunFileChangesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('announces a same-path retouch when a new invocation updates an existing row', () => {
    const store = useRunFileChangesStore();

    store.upsertFromLivePayload({
      id: 'agent-1:src/test.py',
      runId: 'agent-1',
      path: 'src/test.py',
      type: 'file',
      status: 'pending',
      sourceTool: 'edit_file',
      sourceInvocationId: 'edit-1',
      backendArtifactId: null,
      content: null,
      createdAt: '2026-04-10T00:00:00.000Z',
      updatedAt: '2026-04-10T00:00:00.000Z',
    });

    const firstVersion = store.getLatestVisibleArtifactVersionForRun('agent-1');

    store.upsertFromLivePayload({
      id: 'agent-1:src/test.py',
      runId: 'agent-1',
      path: 'src/test.py',
      type: 'file',
      status: 'available',
      sourceTool: 'edit_file',
      sourceInvocationId: 'edit-2',
      backendArtifactId: null,
      content: 'updated',
      createdAt: '2026-04-10T00:00:00.000Z',
      updatedAt: '2026-04-10T00:00:01.000Z',
    });

    expect(store.getArtifactsForRun('agent-1')).toHaveLength(1);
    expect(store.getArtifactsForRun('agent-1')[0].sourceInvocationId).toBe('edit-2');
    expect(store.getLatestVisibleArtifactVersionForRun('agent-1')).toBe(firstVersion + 1);
  });

  it('applies an explicit null content update so failed writes do not retain stale buffered drafts', () => {
    const store = useRunFileChangesStore();

    store.upsertFromLivePayload({
      id: 'agent-1:src/test.py',
      runId: 'agent-1',
      path: 'src/test.py',
      type: 'file',
      status: 'streaming',
      sourceTool: 'write_file',
      sourceInvocationId: 'write-1',
      backendArtifactId: null,
      content: 'buffered draft',
      createdAt: '2026-04-10T00:00:00.000Z',
      updatedAt: '2026-04-10T00:00:00.000Z',
    });

    store.upsertFromLivePayload({
      id: 'agent-1:src/test.py',
      runId: 'agent-1',
      path: 'src/test.py',
      type: 'file',
      status: 'failed',
      sourceTool: 'write_file',
      sourceInvocationId: 'write-1',
      backendArtifactId: null,
      content: null,
      createdAt: '2026-04-10T00:00:00.000Z',
      updatedAt: '2026-04-10T00:00:01.000Z',
    });

    expect(store.getArtifactsForRun('agent-1')).toHaveLength(1);
    expect(store.getArtifactsForRun('agent-1')[0].status).toBe('failed');
    expect(store.getArtifactsForRun('agent-1')[0].content).toBeNull();
  });

  it('merges authoritative projection rows without dropping newer live rows', () => {
    const store = useRunFileChangesStore();

    store.upsertFromLivePayload({
      id: 'agent-1:src/live.txt',
      runId: 'agent-1',
      path: 'src/live.txt',
      type: 'file',
      status: 'streaming',
      sourceTool: 'write_file',
      sourceInvocationId: 'write-2',
      backendArtifactId: null,
      content: 'newer live draft',
      createdAt: '2026-04-10T00:00:00.000Z',
      updatedAt: '2026-04-10T00:00:02.000Z',
    });

    store.mergeRunProjection('agent-1', [
      {
        id: 'agent-1:src/live.txt',
        runId: 'agent-1',
        path: 'src/live.txt',
        type: 'file',
        status: 'pending',
        sourceTool: 'write_file',
        sourceInvocationId: 'write-1',
        backendArtifactId: null,
        content: 'older projection draft',
        createdAt: '2026-04-10T00:00:00.000Z',
        updatedAt: '2026-04-10T00:00:01.000Z',
      },
      {
        id: 'agent-1:src/history.txt',
        runId: 'agent-1',
        path: 'src/history.txt',
        type: 'file',
        status: 'available',
        sourceTool: 'edit_file',
        sourceInvocationId: 'edit-1',
        backendArtifactId: null,
        content: 'historical content',
        createdAt: '2026-04-10T00:00:00.000Z',
        updatedAt: '2026-04-10T00:00:00.000Z',
      },
    ]);

    expect(store.getArtifactsForRun('agent-1')).toHaveLength(2);
    expect(store.getArtifactsForRun('agent-1')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'agent-1:src/live.txt',
          status: 'streaming',
          sourceInvocationId: 'write-2',
          content: 'newer live draft',
          updatedAt: '2026-04-10T00:00:02.000Z',
        }),
        expect.objectContaining({
          id: 'agent-1:src/history.txt',
          status: 'available',
          sourceInvocationId: 'edit-1',
          content: 'historical content',
        }),
      ]),
    );
  });

  it('replaces an older local row when the authoritative projection is newer', () => {
    const store = useRunFileChangesStore();

    store.upsertFromLivePayload({
      id: 'agent-1:src/test.txt',
      runId: 'agent-1',
      path: 'src/test.txt',
      type: 'file',
      status: 'pending',
      sourceTool: 'edit_file',
      sourceInvocationId: 'edit-1',
      backendArtifactId: null,
      content: null,
      createdAt: '2026-04-10T00:00:00.000Z',
      updatedAt: '2026-04-10T00:00:00.000Z',
    });

    store.mergeRunProjection('agent-1', [
      {
        id: 'agent-1:src/test.txt',
        runId: 'agent-1',
        path: 'src/test.txt',
        type: 'file',
        status: 'available',
        sourceTool: 'edit_file',
        sourceInvocationId: 'edit-1',
        backendArtifactId: 'artifact-1',
        content: 'server snapshot',
        createdAt: '2026-04-10T00:00:00.000Z',
        updatedAt: '2026-04-10T00:00:01.000Z',
      },
    ]);

    expect(store.getArtifactsForRun('agent-1')).toEqual([
      expect.objectContaining({
        id: 'agent-1:src/test.txt',
        status: 'available',
        backendArtifactId: 'artifact-1',
        content: 'server snapshot',
        updatedAt: '2026-04-10T00:00:01.000Z',
      }),
    ]);
  });
});
