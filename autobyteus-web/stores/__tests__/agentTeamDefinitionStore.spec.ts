import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentTeamDefinitionStore } from '../agentTeamDefinitionStore';

const mockQuery = vi.fn();
const mockWaitForBoundBackendReady = vi.fn();

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({
    query: mockQuery,
    mutate: vi.fn(),
  }),
}));

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({
    waitForBoundBackendReady: mockWaitForBoundBackendReady,
  }),
}));

describe('agentTeamDefinitionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('sets error when bound backend is not ready', async () => {
    mockWaitForBoundBackendReady.mockResolvedValue(false);

    const store = useAgentTeamDefinitionStore();
    await store.fetchAllAgentTeamDefinitions();

    expect(mockQuery).not.toHaveBeenCalled();
    expect(store.error).toBeInstanceOf(Error);
    expect(store.error?.message).toBe('Bound backend is not ready');
  });

  it('fetches team definitions when bound backend is ready', async () => {
    mockWaitForBoundBackendReady.mockResolvedValue(true);
    mockQuery.mockResolvedValue({
      data: {
        agentTeamDefinitions: [
          {
            id: 'team-1',
            name: 'Team One',
            description: 'Test team',
            coordinatorMemberName: 'Coordinator',
            role: 'orchestrator',
            nodes: [],
          },
          {
            id: 'team-2',
            name: 'Team Two',
            description: 'Placement team',
            coordinatorMemberName: 'Leader',
            role: null,
            nodes: [
              {
                memberName: 'leader',
                referenceId: 'agent-1',
                referenceType: 'AGENT',
                homeNodeId: 'remote-node-1',
              },
            ],
          },
        ],
      },
      errors: [],
    });

    const store = useAgentTeamDefinitionStore();
    await store.fetchAllAgentTeamDefinitions();

    expect(mockWaitForBoundBackendReady).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(store.agentTeamDefinitions).toHaveLength(2);
    expect(store.agentTeamDefinitions[0].id).toBe('team-1');
    expect(store.agentTeamDefinitions[1].nodes[0]?.homeNodeId).toBe('remote-node-1');
  });
});
