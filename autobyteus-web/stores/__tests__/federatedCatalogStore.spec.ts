import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useFederatedCatalogStore } from '../federatedCatalogStore';

const mockQuery = vi.fn();
const mockInitializeRegistry = vi.fn();
const mockWaitForBoundBackendReady = vi.fn();

const mockNodeStore = {
  initialized: true,
  nodes: [
    {
      id: 'embedded-local',
      name: 'Embedded Node',
      baseUrl: 'http://localhost:8000',
      nodeType: 'embedded',
      isSystem: true,
      createdAt: '2026-02-12T00:00:00.000Z',
      updatedAt: '2026-02-12T00:00:00.000Z',
    },
    {
      id: 'remote-node-1',
      name: 'Remote Node',
      baseUrl: 'http://localhost:8100',
      nodeType: 'remote',
      isSystem: false,
      createdAt: '2026-02-12T00:00:00.000Z',
      updatedAt: '2026-02-12T00:00:00.000Z',
    },
  ],
  initializeRegistry: mockInitializeRegistry,
};

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({
    query: mockQuery,
  }),
}));

vi.mock('~/stores/nodeStore', () => ({
  useNodeStore: () => mockNodeStore,
}));

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({
    nodeId: 'embedded-local',
    waitForBoundBackendReady: mockWaitForBoundBackendReady,
  }),
}));

describe('federatedCatalogStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockNodeStore.initialized = true;
    mockWaitForBoundBackendReady.mockResolvedValue(true);
  });

  it('loads federated catalog and keeps local node first', async () => {
    mockQuery.mockResolvedValue({
      data: {
        federatedNodeCatalog: [
          {
            nodeId: 'remote-node-1',
            nodeName: 'Remote Node',
            baseUrl: 'http://localhost:8100',
            status: 'ready',
            errorMessage: null,
            agents: [{
              homeNodeId: 'remote-node-1',
              definitionId: 'agent-remote',
              name: 'Remote Agent',
              role: 'helper',
              description: 'Remote helper',
              avatarUrl: null,
              toolNames: ['tool.remote.1'],
              skillNames: ['skill.remote.1'],
            }],
            teams: [{
              homeNodeId: 'remote-node-1',
              definitionId: 'team-remote',
              name: 'Remote Team',
              description: 'Remote coordination team',
              role: 'orchestrator',
              avatarUrl: null,
              coordinatorMemberName: 'remote-lead',
              memberCount: 3,
              nestedTeamCount: 1,
            }],
          },
          {
            nodeId: 'embedded-local',
            nodeName: 'Embedded Node',
            baseUrl: 'http://localhost:8000',
            status: 'ready',
            errorMessage: null,
            agents: [{
              homeNodeId: 'embedded-local',
              definitionId: 'agent-local',
              name: 'Local Agent',
              role: 'coordinator',
              description: 'Local coordinator',
              avatarUrl: null,
              toolNames: null,
              skillNames: ['skill.local.1', 123],
            }],
            teams: [{
              homeNodeId: 'embedded-local',
              definitionId: 'team-local',
              name: 'Local Team',
              description: 'Local team',
              role: 'builder',
              avatarUrl: null,
              coordinatorMemberName: 'local-lead',
            } as any],
          },
        ],
      },
      errors: [],
    });

    const store = useFederatedCatalogStore();
    await store.loadCatalog();

    expect(store.catalogByNode).toHaveLength(2);
    expect(store.catalogByNode[0]?.nodeId).toBe('embedded-local');
    expect(store.catalogByNode[1]?.nodeId).toBe('remote-node-1');
    expect(store.allAgents).toHaveLength(2);
    expect(store.catalogByNode[0]?.agents[0]?.toolNames).toEqual([]);
    expect(store.catalogByNode[0]?.agents[0]?.skillNames).toEqual(['skill.local.1']);
    expect(store.catalogByNode[1]?.agents[0]?.toolNames).toEqual(['tool.remote.1']);
    expect(store.catalogByNode[1]?.agents[0]?.skillNames).toEqual(['skill.remote.1']);
    expect(store.catalogByNode[0]?.teams[0]?.memberCount).toBe(0);
    expect(store.catalogByNode[0]?.teams[0]?.nestedTeamCount).toBe(0);
    expect(store.catalogByNode[1]?.teams[0]?.memberCount).toBe(3);
    expect(store.catalogByNode[1]?.teams[0]?.nestedTeamCount).toBe(1);
  });

  it('records error when bound backend is not ready', async () => {
    mockWaitForBoundBackendReady.mockResolvedValue(false);

    const store = useFederatedCatalogStore();
    await expect(store.loadCatalog()).rejects.toThrow(/Bound backend is not ready/);

    expect(mockQuery).not.toHaveBeenCalled();
    expect(store.error).toBeInstanceOf(Error);
  });
});
