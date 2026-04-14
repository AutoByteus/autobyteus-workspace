import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentDefinitionStore } from '../agentDefinitionStore';

const {
  mockApolloClient,
  mockWaitForBoundBackendReady,
} = vi.hoisted(() => ({
  mockApolloClient: {
    query: vi.fn(),
    mutate: vi.fn(),
  },
  mockWaitForBoundBackendReady: vi.fn(),
}))

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => mockApolloClient,
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

    expect(mockApolloClient.query).not.toHaveBeenCalled();
    expect(store.error).toBeInstanceOf(Error);
    expect(store.error?.message).toBe('Bound backend is not ready');
  });

  it('fetches definitions when bound backend is ready', async () => {
    mockWaitForBoundBackendReady.mockResolvedValue(true);
    mockApolloClient.query.mockResolvedValue({
      data: {
        agentDefinitions: [
          {
            id: 'agent-1',
            name: 'Planner',
            role: 'Planner role',
            description: 'Plans tasks',
            instructions: 'Plan and execute tasks.',
            category: 'software-engineering',
            toolNames: [],
            inputProcessorNames: [],
            llmResponseProcessorNames: [],
            systemPromptProcessorNames: [],
            toolExecutionResultProcessorNames: [],
            toolInvocationPreprocessorNames: [],
            lifecycleProcessorNames: [],
            skillNames: [],
            ownershipScope: 'SHARED',
            ownerTeamId: null,
            ownerTeamName: null,
          },
        ],
      },
      errors: [],
    });

    const store = useAgentDefinitionStore();
    await store.fetchAllAgentDefinitions();

    expect(mockWaitForBoundBackendReady).toHaveBeenCalledTimes(1);
    expect(mockApolloClient.query).toHaveBeenCalledTimes(1);
    expect(store.agentDefinitions).toHaveLength(1);
    expect(store.agentDefinitions[0].id).toBe('agent-1');
    expect(store.agentDefinitions[0].instructions).toBe('Plan and execute tasks.');
    expect((store.agentDefinitions[0] as any).activePromptVersion).toBeUndefined();
    expect(store.sharedAgentDefinitions).toHaveLength(1);
  });

  it('derives shared-only agent definitions from the visible list', async () => {
    mockWaitForBoundBackendReady.mockResolvedValue(true);
    mockApolloClient.query.mockResolvedValue({
      data: {
        agentDefinitions: [
          {
            id: 'shared-agent',
            name: 'Shared Agent',
            description: 'Shared',
            instructions: 'Shared instructions',
            toolNames: [],
            inputProcessorNames: [],
            llmResponseProcessorNames: [],
            systemPromptProcessorNames: [],
            toolExecutionResultProcessorNames: [],
            toolInvocationPreprocessorNames: [],
            lifecycleProcessorNames: [],
            skillNames: [],
            ownershipScope: 'SHARED',
            ownerTeamId: null,
            ownerTeamName: null,
          },
          {
            id: 'team-local:team-a:local-agent',
            name: 'Local Agent',
            description: 'Local',
            instructions: 'Local instructions',
            toolNames: [],
            inputProcessorNames: [],
            llmResponseProcessorNames: [],
            systemPromptProcessorNames: [],
            toolExecutionResultProcessorNames: [],
            toolInvocationPreprocessorNames: [],
            lifecycleProcessorNames: [],
            skillNames: [],
            ownershipScope: 'TEAM_LOCAL',
            ownerTeamId: 'team-a',
            ownerTeamName: 'Team A',
          },
        ],
      },
      errors: [],
    });

    const store = useAgentDefinitionStore();
    await store.fetchAllAgentDefinitions();

    expect(store.agentDefinitions).toHaveLength(2);
    expect(store.sharedAgentDefinitions).toHaveLength(1);
    expect(store.sharedAgentDefinitions[0].id).toBe('shared-agent');
  });

  it('sends defaultLaunchConfig through create and update mutations', async () => {
    mockApolloClient.mutate
      .mockResolvedValueOnce({
        data: {
          createAgentDefinition: {
            id: 'agent-1',
            name: 'Planner',
            description: 'Plans tasks',
            instructions: 'Plan carefully',
            toolNames: [],
            inputProcessorNames: [],
            llmResponseProcessorNames: [],
            systemPromptProcessorNames: [],
            toolExecutionResultProcessorNames: [],
            toolInvocationPreprocessorNames: [],
            lifecycleProcessorNames: [],
            skillNames: [],
            defaultLaunchConfig: {
              runtimeKind: 'autobyteus',
              llmModelIdentifier: 'gpt-5.4-mini',
              llmConfig: { reasoning_effort: 'medium' },
            },
          },
        },
        errors: [],
      })
      .mockResolvedValueOnce({
        data: {
          updateAgentDefinition: {
            id: 'agent-1',
            defaultLaunchConfig: {
              runtimeKind: 'codex_app_server',
              llmModelIdentifier: 'gpt-5.4',
              llmConfig: { temperature: 0.1 },
            },
          },
        },
        errors: [],
      })

    const store = useAgentDefinitionStore();
    const cacheMock = {
      readQuery: vi.fn().mockReturnValue({ agentDefinitions: [] }),
      writeQuery: vi.fn(),
    }

    await store.createAgentDefinition({
      name: 'Planner',
      description: 'Plans tasks',
      instructions: 'Plan carefully',
      defaultLaunchConfig: {
        runtimeKind: 'autobyteus',
        llmModelIdentifier: 'gpt-5.4-mini',
        llmConfig: { reasoning_effort: 'medium' },
      },
    })

    const createCall = mockApolloClient.mutate.mock.calls[0]?.[0]
    expect(createCall.variables.input.defaultLaunchConfig).toEqual({
      runtimeKind: 'autobyteus',
      llmModelIdentifier: 'gpt-5.4-mini',
      llmConfig: { reasoning_effort: 'medium' },
    })
    createCall.update(cacheMock, {
      data: {
        createAgentDefinition: {
          id: 'agent-1',
          name: 'Planner',
          description: 'Plans tasks',
          instructions: 'Plan carefully',
          toolNames: [],
          inputProcessorNames: [],
          llmResponseProcessorNames: [],
          systemPromptProcessorNames: [],
          toolExecutionResultProcessorNames: [],
          toolInvocationPreprocessorNames: [],
          lifecycleProcessorNames: [],
          skillNames: [],
          defaultLaunchConfig: {
            runtimeKind: 'autobyteus',
            llmModelIdentifier: 'gpt-5.4-mini',
            llmConfig: { reasoning_effort: 'medium' },
          },
        },
      },
    })

    await store.updateAgentDefinition({
      id: 'agent-1',
      defaultLaunchConfig: {
        runtimeKind: 'codex_app_server',
        llmModelIdentifier: 'gpt-5.4',
        llmConfig: { temperature: 0.1 },
      },
    })

    const updateCall = mockApolloClient.mutate.mock.calls[1]?.[0]
    expect(updateCall.variables.input.defaultLaunchConfig).toEqual({
      runtimeKind: 'codex_app_server',
      llmModelIdentifier: 'gpt-5.4',
      llmConfig: { temperature: 0.1 },
    })
  });
});
