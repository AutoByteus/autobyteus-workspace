import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAgentRunStore } from '../agentRunStore';
import { useAgentContextsStore } from '../agentContextsStore';
import { AgentStreamingService } from '~/services/agentStreaming';
import { RestoreAgentRun } from '~/graphql/mutations/agentMutations';

const {
  mutateMock,
  llmProviderConfigStoreMock,
  runHistoryStoreMock,
  mockSendMessage,
  mockStopGeneration,
  mockConnect,
  mockDisconnect,
  mockAttachContext,
  mockConnectionState,
  contextFileUploadStoreMock,
} = vi.hoisted(() => ({
  mutateMock: vi.fn().mockResolvedValue({
    data: {
      createAgentRun: {
        success: true,
        runId: 'perm-agent-id',
        message: 'Success',
      },
    },
    errors: [],
  }),
  llmProviderConfigStoreMock: {
    models: ['gpt-4-fallback'],
    fetchProvidersWithModels: vi.fn().mockResolvedValue(undefined),
  },
  runHistoryStoreMock: {
    getResumeConfig: vi.fn().mockReturnValue(null),
    markRunAsActive: vi.fn(),
    markRunAsInactive: vi.fn(),
    refreshTreeQuietly: vi.fn(),
  },
  mockSendMessage: vi.fn(),
  mockStopGeneration: vi.fn(),
  mockConnect: vi.fn(),
  mockDisconnect: vi.fn(),
  mockAttachContext: vi.fn(),
  mockConnectionState: { value: 'connected' as 'connected' | 'disconnected' | 'connecting' | 'reconnecting' },
  contextFileUploadStoreMock: {
    finalizeDraftAttachments: vi.fn(async ({ attachments }: { attachments: any[] }) => attachments),
  },
}));

// Mocks
vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(() => ({
    mutate: mutateMock,
  })),
}));

vi.mock('~/services/agentStreaming', () => ({
  ConnectionState: {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    RECONNECTING: 'reconnecting',
  },
  AgentStreamingService: vi.fn().mockImplementation(() => ({
    get connectionState() {
      return mockConnectionState.value;
    },
    connect: mockConnect,
    disconnect: mockDisconnect,
    attachContext: mockAttachContext,
    sendMessage: mockSendMessage,
    approveTool: vi.fn(),
    denyTool: vi.fn(),
    stopGeneration: mockStopGeneration,
  })),
}));

vi.mock('../agentContextsStore', () => ({
  useAgentContextsStore: vi.fn(),
}));

vi.mock('~/stores/llmProviderConfig', () => ({
  useLLMProviderConfigStore: () => llmProviderConfigStoreMock,
}));

vi.mock('~/stores/runHistoryStore', () => ({
  useRunHistoryStore: () => runHistoryStoreMock,
}));

vi.mock('~/stores/contextFileUploadStore', () => ({
  useContextFileUploadStore: () => contextFileUploadStoreMock,
}));

vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => ({
    workspaces: {
      'ws-1': {
        absolutePath: '/tmp/workspace-one',
      },
    },
  }),
}));

describe('agentRunStore', () => {
    let mockAgentContext: any;
    let mockContextsStore: any;

    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
        mockConnectionState.value = 'connected';
        mockSendMessage.mockReset();
        mockStopGeneration.mockReset();
        llmProviderConfigStoreMock.models = ['gpt-4-fallback'];
        llmProviderConfigStoreMock.fetchProvidersWithModels.mockResolvedValue(undefined);
        contextFileUploadStoreMock.finalizeDraftAttachments.mockImplementation(async ({ attachments }: { attachments: any[] }) => attachments);
        mutateMock.mockResolvedValue({
          data: {
            createAgentRun: {
              success: true,
              runId: 'perm-agent-id',
              message: 'Success',
            },
          },
          errors: [],
        });

        mockAgentContext = {
            config: {
                agentDefinitionId: 'def-1',
                agentDefinitionName: 'Test Agent',
                workspaceId: 'ws-1',
                llmModelIdentifier: 'gpt-4',
                runtimeKind: 'autobyteus',
                autoExecuteTools: false,
                skillAccessMode: 'PRELOADED_ONLY',
                isLocked: false,
            },
            state: {
                runId: 'temp-1',
                currentStatus: 'idle',
                conversation: {
                    messages: [],
                    agentDefinitionId: 'def-1',
                    updatedAt: new Date().toISOString()
                }
            },
            requirement: 'do something',
            contextFilePaths: [],
            isSending: false,
            isSubscribed: false,
        };

        mockContextsStore = {
            activeRun: mockAgentContext, // Initial state
            promoteTemporaryId: vi.fn(),
            lockConfig: vi.fn(),
            getRun: vi.fn((id: string) => {
                if (id === 'perm-agent-id') return mockAgentContext; // mocking return after promotion
                return mockAgentContext; 
            }),
            removeRun: vi.fn(),
        };

        // @ts-ignore
        useAgentContextsStore.mockReturnValue(mockContextsStore);
    });

    it('sendUserInputAndSubscribe should handle new agent flow', async () => {
        const store = useAgentRunStore();
        
        await store.sendUserInputAndSubscribe();

        // 1. Should add user message to state
        expect(mockAgentContext.state.conversation.messages).toHaveLength(1);
        expect(mockAgentContext.state.conversation.messages[0].text).toBe('do something');
        
        // 2. Should call mutation (implicit via successful execution)
        expect(mutateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            variables: expect.objectContaining({
              input: expect.objectContaining({
                runtimeKind: 'autobyteus',
              }),
            }),
          }),
        );
        
        // 3. Should promote temp ID
        expect(mockContextsStore.promoteTemporaryId).toHaveBeenCalledWith('temp-1', 'perm-agent-id');

        // 4. Should lock config after first message
        expect(mockContextsStore.lockConfig).toHaveBeenCalledWith('perm-agent-id');
        
        // 5. Should clear requirement
        expect(mockAgentContext.requirement).toBe('');
        
        // 6. Should connect stream and send the first message over WebSocket
        expect(AgentStreamingService).toHaveBeenCalled(); 
        expect(mockSendMessage).toHaveBeenCalledWith('do something', [], []);
    });

    it('sendUserInputAndSubscribe should apply fallback model for new agent when missing', async () => {
        mockAgentContext.config.llmModelIdentifier = '';
        const store = useAgentRunStore();

        await store.sendUserInputAndSubscribe();

        expect(mockAgentContext.config.llmModelIdentifier).toBe('gpt-4-fallback');
        expect(mockContextsStore.promoteTemporaryId).toHaveBeenCalledWith('temp-1', 'perm-agent-id');
    });

    it('sendUserInputAndSubscribe should throw when no model is available anywhere', async () => {
        mockAgentContext.config.llmModelIdentifier = '';
        llmProviderConfigStoreMock.models = [];
        llmProviderConfigStoreMock.fetchProvidersWithModels.mockResolvedValue(undefined);
        const store = useAgentRunStore();

        await expect(store.sendUserInputAndSubscribe()).rejects.toThrowError(
          'Please select a model for the first message.',
        );
    });

    it('sendUserInputAndSubscribe should throw if no agent selected', async () => {
        // @ts-ignore
        useAgentContextsStore.mockReturnValue({ activeRun: null });
        const store = useAgentRunStore();
        
        await expect(store.sendUserInputAndSubscribe()).rejects.toThrowError("No active agent selected");
    });

    it('sendUserInputAndSubscribe should restore persisted inactive runs before sending', async () => {
        mockAgentContext.state.runId = 'run-1';
        runHistoryStoreMock.getResumeConfig.mockReturnValue({
          isActive: false,
          metadataConfig: {
            workspaceRootPath: '/tmp/workspace-one',
          },
        });
        mutateMock.mockResolvedValueOnce({
          data: {
            restoreAgentRun: {
              success: true,
              runId: 'run-1',
              message: 'restored',
            },
          },
          errors: [],
        });

        const store = useAgentRunStore();
        await store.sendUserInputAndSubscribe();

        expect(mutateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            mutation: RestoreAgentRun,
            variables: { agentRunId: 'run-1' },
          }),
        );
        expect(mockContextsStore.promoteTemporaryId).not.toHaveBeenCalled();
        expect(mockContextsStore.lockConfig).toHaveBeenCalledWith('run-1');
        expect(runHistoryStoreMock.markRunAsActive).toHaveBeenCalledWith('run-1');
        expect(mockSendMessage).toHaveBeenCalledWith('do something', [], []);
    });
    
    it('closeAgent should disconnect and remove context', async () => {
        const store = useAgentRunStore();
        mockAgentContext.isSubscribed = true;
        mockAgentContext.state.runId = 'agent-1';
        store.connectToAgentStream('agent-1');
        
        await store.closeAgent('agent-1', { terminate: false });
        
        expect(mockDisconnect).toHaveBeenCalled();
        expect(mockAgentContext.isSubscribed).toBe(false);
        expect(mockContextsStore.removeRun).toHaveBeenCalledWith('agent-1');
    });

    it('disconnectAgentStream tears down socket state without removing the context', () => {
        const store = useAgentRunStore();
        mockAgentContext.state.runId = 'agent-1';

        store.connectToAgentStream('agent-1');
        store.disconnectAgentStream('agent-1');

        expect(mockDisconnect).toHaveBeenCalledTimes(1);
        expect(mockAgentContext.isSubscribed).toBe(false);
        expect(mockAgentContext.unsubscribe).toBeUndefined();
        expect(mockContextsStore.removeRun).not.toHaveBeenCalled();
    });

    it('terminateRun should not teardown local runtime when persisted termination fails', async () => {
        const store = useAgentRunStore();
        mockAgentContext.isSubscribed = true;
        mockAgentContext.state.runId = 'run-1';
        store.connectToAgentStream('run-1');
        mockAgentContext.state.currentStatus = 'processing_user_input';
        mutateMock.mockResolvedValueOnce({
            data: {
                terminateAgentRun: {
                    success: false,
                    message: 'failure'
                }
            },
            errors: [],
        });

        const result = await store.terminateRun('run-1');

        expect(result).toBe(false);
        expect(mockDisconnect).not.toHaveBeenCalled();
        expect(runHistoryStoreMock.markRunAsInactive).not.toHaveBeenCalled();
    });

    it('terminateRun should teardown local runtime and mark history inactive on success', async () => {
        const store = useAgentRunStore();
        mockAgentContext.isSubscribed = true;
        mockAgentContext.state.runId = 'run-1';
        store.connectToAgentStream('run-1');
        mutateMock.mockResolvedValueOnce({
            data: {
                terminateAgentRun: {
                    success: true,
                    message: 'ok'
                }
            },
            errors: [],
        });

        const result = await store.terminateRun('run-1');

        expect(result).toBe(true);
        expect(mockDisconnect).toHaveBeenCalled();
        expect(runHistoryStoreMock.markRunAsInactive).toHaveBeenCalledWith('run-1');
        expect(runHistoryStoreMock.refreshTreeQuietly).toHaveBeenCalled();
    });

    it('terminateRun should teardown local runtime and skip backend for temp runs', async () => {
        const store = useAgentRunStore();
        mockAgentContext.isSubscribed = true;
        mockAgentContext.state.runId = 'temp-42';
        store.connectToAgentStream('temp-42');

        const result = await store.terminateRun('temp-42');

        expect(result).toBe(true);
        expect(mockDisconnect).toHaveBeenCalled();
        expect(runHistoryStoreMock.markRunAsInactive).toHaveBeenCalledWith('temp-42');
        expect(mutateMock).not.toHaveBeenCalled();
    });

    it('closeAgent should keep context when backend termination fails', async () => {
        const store = useAgentRunStore();
        mutateMock.mockResolvedValueOnce({
            data: {
                terminateAgentRun: {
                    success: false,
                    message: 'failure'
                }
            },
            errors: [],
        });

        await store.closeAgent('run-1', { terminate: true });

        expect(mockContextsStore.removeRun).not.toHaveBeenCalled();
    });

    it('stopGeneration should signal active stream and clear sending state', () => {
        const store = useAgentRunStore();
        mockAgentContext.state.runId = 'agent-1';
        mockAgentContext.isSending = true;

        store.connectToAgentStream('agent-1');
        const result = store.stopGeneration('agent-1');

        expect(result).toBe(true);
        expect(mockStopGeneration).toHaveBeenCalledTimes(1);
        expect(mockAgentContext.isSending).toBe(false);
    });
});
