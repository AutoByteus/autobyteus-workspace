import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useNodeStore } from '../nodeStore';
import { useNodeSyncStore } from '../nodeSyncStore';

const apolloClientMock = {
  mutate: vi.fn(),
};

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => apolloClientMock,
}));

describe('nodeSyncStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      writable: true,
      value: null,
    });
  });

  function seedNodes(): void {
    const nodeStore = useNodeStore();
    nodeStore.nodes = [
      {
        id: 'embedded-local',
        name: 'Embedded Node',
        baseUrl: 'http://localhost:29695',
        nodeType: 'embedded',
        isSystem: true,
        createdAt: '2026-02-11T00:00:00.000Z',
        updatedAt: '2026-02-11T00:00:00.000Z',
      },
      {
        id: 'remote-1',
        name: 'Remote One',
        baseUrl: 'http://localhost:8001',
        nodeType: 'remote',
        isSystem: false,
        createdAt: '2026-02-11T00:00:00.000Z',
        updatedAt: '2026-02-11T00:00:00.000Z',
      },
      {
        id: 'remote-2',
        name: 'Remote Two',
        baseUrl: 'http://localhost:8002',
        nodeType: 'remote',
        isSystem: false,
        createdAt: '2026-02-11T00:00:00.000Z',
        updatedAt: '2026-02-11T00:00:00.000Z',
      },
    ] as any;
  }

  it('initialize is a no-op for runtime-agnostic sync store', async () => {
    seedNodes();
    const store = useNodeSyncStore();
    await expect(store.initialize()).resolves.toBeUndefined();
    expect(store.lastError).toBeNull();
    expect(store.lastResult).toBeNull();
  });

  it('runs selective agent sync via runNodeSync mutation', async () => {
    seedNodes();
    apolloClientMock.mutate.mockResolvedValue({
      data: {
        runNodeSync: {
          status: 'success',
          sourceNodeId: 'embedded-local',
          targetResults: [{ targetNodeId: 'remote-1', status: 'success' }],
          error: null,
          report: {
            sourceNodeId: 'embedded-local',
            scope: ['PROMPT', 'AGENT_DEFINITION'],
            exportByEntity: [
              {
                entityType: 'PROMPT',
                exportedCount: 1,
                sampledKeys: ['prompt-1'],
                sampleTruncated: false,
              },
            ],
            targets: [
              {
                targetNodeId: 'remote-1',
                status: 'success',
                summary: {
                  processed: 1,
                  created: 1,
                  updated: 0,
                  deleted: 0,
                  skipped: 0,
                },
                failureCountTotal: 0,
                failureSamples: [],
                failureSampleTruncated: false,
                message: null,
              },
            ],
          },
        },
      },
      errors: undefined,
    });

    const store = useNodeSyncStore();
    const result = await store.runSelectiveAgentSync({
      sourceNodeId: 'embedded-local',
      targetNodeIds: ['remote-1'],
      agentDefinitionIds: ['agent-1'],
      includeDependencies: true,
      includeDeletes: false,
    });

    expect(result.status).toBe('success');
    expect(result.report).toEqual({
      sourceNodeId: 'embedded-local',
      scope: ['prompt', 'agent_definition'],
      exportByEntity: [
        {
          entityType: 'prompt',
          exportedCount: 1,
          sampledKeys: ['prompt-1'],
          sampleTruncated: false,
        },
      ],
      targets: [
        {
          targetNodeId: 'remote-1',
          status: 'success',
          summary: {
            processed: 1,
            created: 1,
            updated: 0,
            deleted: 0,
            skipped: 0,
          },
          failureCountTotal: 0,
          failureSamples: [],
          failureSampleTruncated: false,
          message: null,
        },
      ],
    });
    expect(apolloClientMock.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          input: {
            source: { nodeId: 'embedded-local', baseUrl: 'http://localhost:29695' },
            targets: [{ nodeId: 'remote-1', baseUrl: 'http://localhost:8001' }],
            scope: ['PROMPT', 'AGENT_DEFINITION'],
            selection: {
              agentDefinitionIds: ['agent-1'],
              includeDependencies: true,
              includeDeletes: false,
            },
            conflictPolicy: 'SOURCE_WINS',
            tombstonePolicy: 'SOURCE_DELETE_WINS',
          },
        },
      }),
    );
  });

  it('rejects full sync when target list is empty', async () => {
    seedNodes();
    const store = useNodeSyncStore();
    await expect(
      store.runFullSync({
        sourceNodeId: 'embedded-local',
        targetNodeIds: [],
      }),
    ).rejects.toThrow('At least one target node is required.');
    expect(apolloClientMock.mutate).not.toHaveBeenCalled();
  });

  it('runs bootstrap sync as a one-target full sync', async () => {
    seedNodes();
    apolloClientMock.mutate.mockResolvedValue({
      data: {
        runNodeSync: {
          status: 'partial-success',
          sourceNodeId: 'embedded-local',
          targetResults: [{ targetNodeId: 'remote-2', status: 'failed', message: 'connection reset' }],
          error: 'One or more target imports failed.',
        },
      },
      errors: undefined,
    });

    const store = useNodeSyncStore();
    const result = await store.runBootstrapSync({
      sourceNodeId: 'embedded-local',
      targetNodeId: 'remote-2',
    });

    expect(result.status).toBe('partial-success');
    expect(result.targetResults[0]?.targetNodeId).toBe('remote-2');
  });
});
