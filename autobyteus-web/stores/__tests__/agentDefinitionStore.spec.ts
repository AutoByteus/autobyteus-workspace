import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentDefinitionStore } from '../agentDefinitionStore';

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

describe('agentDefinitionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('sets error when bound backend is not ready', async () => {
    mockWaitForBoundBackendReady.mockResolvedValue(false);

    const store = useAgentDefinitionStore();
    await store.fetchAllAgentDefinitions();

    expect(mockQuery).not.toHaveBeenCalled();
    expect(store.error).toBeInstanceOf(Error);
    expect(store.error?.message).toBe('Bound backend is not ready');
  });

  it('fetches definitions when bound backend is ready', async () => {
    mockWaitForBoundBackendReady.mockResolvedValue(true);
    mockQuery.mockResolvedValue({
      data: {
        agentDefinitions: [
          {
            id: 'agent-1',
            name: 'Planner',
            role: 'Planner role',
            description: 'Plans tasks',
            toolNames: [],
            inputProcessorNames: [],
            llmResponseProcessorNames: [],
            systemPromptProcessorNames: [],
            toolExecutionResultProcessorNames: [],
            toolInvocationPreprocessorNames: [],
            lifecycleProcessorNames: [],
            skillNames: [],
            prompts: [],
          },
        ],
      },
      errors: [],
    });

    const store = useAgentDefinitionStore();
    await store.fetchAllAgentDefinitions();

    expect(mockWaitForBoundBackendReady).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(store.agentDefinitions).toHaveLength(1);
    expect(store.agentDefinitions[0].id).toBe('agent-1');
  });
});
