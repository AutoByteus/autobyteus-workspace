import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentRunStore } from '~/stores/agentRunStore';

const {
  queryMock,
  mutateMock,
  workspaceStoreMock,
  windowNodeContextStoreMock,
  llmProviderConfigStoreMock,
  agentDefinitionStoreMock,
  teamRunConfigStoreMock,
} = vi.hoisted(() => ({
  queryMock: vi.fn(),
  mutateMock: vi.fn(),
  workspaceStoreMock: {
    workspacesFetched: true,
    allWorkspaces: [{ workspaceId: 'ws-1', absolutePath: '/tmp/workspace-a', name: 'workspace-a' }],
    workspaces: {
      'ws-1': {
        workspaceId: 'ws-1',
        absolutePath: '/tmp/workspace-a',
        name: 'workspace-a',
        workspaceConfig: { root_path: '/tmp/workspace-a' },
      },
    } as Record<string, any>,
    fetchAllWorkspaces: vi.fn().mockResolvedValue(undefined),
    createWorkspace: vi.fn().mockResolvedValue('ws-1'),
  },
  windowNodeContextStoreMock: {
    waitForBoundBackendReady: vi.fn().mockResolvedValue(true),
    lastReadyError: null as string | null,
    getBoundEndpoints: vi.fn(() => ({
      agentWs: 'ws://localhost:8000/ws/agent',
    })),
  },
  llmProviderConfigStoreMock: {
    models: ['fallback-model-1'],
    fetchProvidersWithModels: vi.fn().mockResolvedValue(undefined),
  },
  agentDefinitionStoreMock: {
    agentDefinitions: [{ id: 'agent-def-1', name: 'db manager', avatarUrl: null }],
    fetchAllAgentDefinitions: vi.fn().mockResolvedValue(undefined),
    getAgentDefinitionById: vi.fn((id: string) => {
      if (id === 'agent-def-1') {
        return { id: 'agent-def-1', name: 'db manager', avatarUrl: null };
      }
      return null;
    }),
  },
  teamRunConfigStoreMock: {
    clearConfig: vi.fn(),
  },
}));

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({
    query: queryMock,
    mutate: mutateMock,
  }),
}));

vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => workspaceStoreMock,
}));

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => windowNodeContextStoreMock,
}));

vi.mock('~/stores/llmProviderConfig', () => ({
  useLLMProviderConfigStore: () => llmProviderConfigStoreMock,
}));

vi.mock('~/stores/agentDefinitionStore', () => ({
  useAgentDefinitionStore: () => agentDefinitionStoreMock,
}));

vi.mock('~/stores/teamRunConfigStore', () => ({
  useTeamRunConfigStore: () => teamRunConfigStoreMock,
}));

vi.mock('~/services/agentStreaming', () => ({
  ConnectionState: {
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
  },
  AgentStreamingService: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    approveTool: vi.fn(),
    denyTool: vi.fn(),
    sendMessage: vi.fn(),
    connectionState: 'connected',
  })),
}));

describe('workspace history + draft send integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    queryMock.mockResolvedValue({
      data: {
        listWorkspaceRunHistory: [],
      },
      errors: [],
    });

    mutateMock.mockResolvedValue({
      data: {
        createAgentRun: {
          success: true,
          message: 'ok',
          runId: 'run-001',
        },
      },
      errors: [],
    });
  });

  it('supports tree-plus draft creation and first send promotion with a resolved model', async () => {
    const runHistoryStore = useRunHistoryStore();
    const contextsStore = useAgentContextsStore();
    const runStore = useAgentRunStore();
    const tempRunIdFromConfig = await runHistoryStore.createDraftRun({
      workspaceRootPath: '/tmp/workspace-a',
      agentDefinitionId: 'agent-def-1',
    });

    expect(tempRunIdFromConfig).toBeUndefined();

    const tempRunId = contextsStore.createRunFromTemplate();
    const tempContext = contextsStore.getRun(tempRunId);
    expect(tempContext).toBeTruthy();
    expect(tempContext?.config.llmModelIdentifier).toBe('fallback-model-1');

    tempContext!.requirement = 'what tools do you have';

    await runStore.sendUserInputAndSubscribe();

    expect(contextsStore.getRun(tempRunId)).toBeUndefined();
    const promoted = contextsStore.getRun('run-001');
    expect(promoted).toBeTruthy();
    expect(promoted?.state.conversation.messages[0]?.type).toBe('user');

    const createRunInput = mutateMock.mock.calls[0]?.[0]?.variables?.input;
    expect(createRunInput?.llmModelIdentifier).toBe('fallback-model-1');
    expect(createRunInput?.workspaceId).toBe('ws-1');
  });
});
