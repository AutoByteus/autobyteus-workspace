import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentTeamDefinitionStore } from '../agentTeamDefinitionStore';

const mockQuery = vi.fn();
const mockMutate = vi.fn();
const mockWaitForBoundBackendReady = vi.fn();

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({
    query: mockQuery,
    mutate: mockMutate,
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
        ],
      },
      errors: [],
    });

    const store = useAgentTeamDefinitionStore();
    await store.fetchAllAgentTeamDefinitions();

    expect(mockWaitForBoundBackendReady).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(store.agentTeamDefinitions).toHaveLength(1);
    expect(store.agentTeamDefinitions[0].id).toBe('team-1');
  });

  it('deletes a team without replacing local state with Apollo cache references', async () => {
    const store = useAgentTeamDefinitionStore();
    store.agentTeamDefinitions = [
      {
        id: 'team-1',
        name: 'Team One',
        description: 'First team',
        coordinatorMemberName: 'Coordinator One',
        role: 'orchestrator',
        nodes: [],
      },
      {
        id: 'team-2',
        name: 'Team Two',
        description: 'Second team',
        coordinatorMemberName: 'Coordinator Two',
        role: null,
        nodes: [
          {
            memberName: 'member',
            referenceId: 'agent-1',
            referenceType: 'AGENT',
            homeNodeId: 'embedded',
          },
        ],
      },
    ] as any;

    mockMutate.mockImplementation(async ({ update }) => {
      const refs = [{ __ref: 'AgentTeamDefinition:team-1' }, { __ref: 'AgentTeamDefinition:team-2' }];
      const cache = {
        modify: ({ fields }: any) => {
          fields.agentTeamDefinitions(refs, {
            readField: (name: string, ref: { __ref: string }) => {
              if (name !== 'id') {
                return undefined;
              }
              return ref.__ref.split(':')[1];
            },
          });
        },
        identify: ({ __typename, id }: { __typename: string; id: string }) => `${__typename}:${id}`,
        evict: vi.fn(),
        gc: vi.fn(),
      };
      update(cache);
      return {
        data: {
          deleteAgentTeamDefinition: {
            success: true,
          },
        },
        errors: [],
      };
    });

    const success = await store.deleteAgentTeamDefinition('team-1');

    expect(success).toBe(true);
    expect(store.agentTeamDefinitions).toHaveLength(1);
    expect(store.agentTeamDefinitions[0].id).toBe('team-2');
    expect(Array.isArray(store.agentTeamDefinitions[0].nodes)).toBe(true);
    expect((store.agentTeamDefinitions[0] as any).__ref).toBeUndefined();
  });
});
