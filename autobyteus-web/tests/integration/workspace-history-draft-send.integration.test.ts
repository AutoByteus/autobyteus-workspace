import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises } from '@vue/test-utils';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useChatDraftStore } from '~/stores/chatDraftStore';
import { launchAgentChat } from '~/services/chat/chatLaunchService';

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
    workspaceMetadataById: {} as Record<string, any>,
    tempWorkspaceId: 'temp_ws_default',
    findWorkspaceInfoByRootPath: vi.fn((rootPath: string) => (
      rootPath === '/tmp/workspace-a' ? { workspaceId: 'ws-1', absolutePath: rootPath, name: 'workspace-a' } : null
    )),
    fetchAllWorkspaces: vi.fn().mockResolvedValue(undefined),
    createWorkspace: vi.fn().mockResolvedValue('ws-1'),
    resolveWorkspaceMetadataByRootPath: vi.fn(async (rootPath: string) => (
      rootPath === '/tmp/workspace-a'
        ? {
            workspaceId: 'ws-1',
            workspaceRootPath: rootPath,
            displayName: 'workspace-a',
            kind: 'filesystem',
          }
        : null
    )),
  },
  windowNodeContextStoreMock: {
    waitForBoundBackendReady: vi.fn().mockResolvedValue(true),
    lastReadyError: null as string | null,
    getBoundEndpoints: vi.fn(() => ({
      agentWs: 'ws://localhost:8000/ws/agent',
    })),
  },
  llmProviderConfigStoreMock: {
    models: vi.fn(() => ['fallback-model-1']),
    fetchProvidersWithModels: vi.fn().mockResolvedValue(undefined),
    ensureMissingDynamicProviders: vi.fn().mockResolvedValue(undefined),
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

describe('tree-plus New chat + first send integration', () => {
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
        prepareAgentRun: {
          success: true,
          message: 'ok',
          runId: 'run-001',
        },
      },
      errors: [],
    });
  });

  it('starts a preset New chat from the tree + and launches it through the first-send path', async () => {
    const contextsStore = useAgentContextsStore();
    const draft = useChatDraftStore().startNewChat({
      agentDefinitionId: 'agent-def-1',
      workspaceRootPath: '/tmp/workspace-a',
    });
    await flushPromises();

    // The New chat draft is not a tree row until it is sent.
    expect(contextsStore.runs.size).toBe(0);
    expect(draft.workspace).toEqual({ kind: 'existing', workspaceId: 'ws-1' });
    expect(draft.context.config.llmModelIdentifier).toBe('fallback-model-1');

    draft.context.requirement = 'what tools do you have';
    const navigate = vi.fn().mockResolvedValue(undefined);
    await launchAgentChat(draft, { navigate });

    const promoted = contextsStore.getRun('run-001');
    expect(promoted).toBeTruthy();
    expect(promoted?.state.conversation.messages[0]?.type).toBe('user');
    expect(navigate).toHaveBeenCalledWith({ path: '/chat', query: { id: 'run-001' } });

    const createRunInput = mutateMock.mock.calls[0]?.[0]?.variables?.input;
    expect(createRunInput).toMatchObject({
      agentDefinitionId: 'agent-def-1',
      llmModelIdentifier: 'fallback-model-1',
      workspaceId: 'ws-1',
      workspaceRootPath: '/tmp/workspace-a',
      autoExecuteTools: true,
      initialSummary: 'what tools do you have',
    });
  });
});
