import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentTeamRunStore } from '../agentTeamRunStore';
import { TeamStreamingService } from '~/services/agentStreaming';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import { RestoreAgentTeamRun } from '~/graphql/mutations/agentTeamRunMutations';

const {
  mockConnect,
  mockDisconnect,
  mockAttachContext,
  mockConnectionState,
  mockSendMessage,
  mockStopGeneration,
  mockMutate,
  mockClearActivities,
  teamContextsStoreMock,
  runHistoryStoreMock,
  teamDefinitionStoreMock,
  contextFileUploadStoreMock,
  runtimeProviderLookup,
} = vi.hoisted(() => ({
  mockConnect: vi.fn(),
  mockDisconnect: vi.fn(),
  mockAttachContext: vi.fn(),
  mockConnectionState: { value: 'connected' as 'connected' | 'disconnected' | 'connecting' | 'reconnecting' },
  mockSendMessage: vi.fn(),
  mockStopGeneration: vi.fn(),
  mockMutate: vi.fn(),
  mockClearActivities: vi.fn(),
  teamContextsStoreMock: {
    activeTeamContext: null as any,
    focusedMemberContext: null as any,
    getTeamContextById: vi.fn(),
    removeTeamContext: vi.fn(),
    promoteTemporaryTeamRunId: vi.fn(),
    lockConfig: vi.fn(),
  },
  runHistoryStoreMock: {
    markTeamAsActive: vi.fn(),
    markTeamAsInactive: vi.fn(),
    refreshTreeQuietly: vi.fn().mockResolvedValue(undefined),
    teamResumeConfigByTeamRunId: {} as Record<string, { isActive: boolean }>,
  },
  teamDefinitionStoreMock: {
    getAgentTeamDefinitionById: vi.fn(),
  },
  contextFileUploadStoreMock: {
    finalizeDraftAttachments: vi.fn(async ({ attachments }: { attachments: any[] }) => attachments),
  },
  runtimeProviderLookup: {
    autobyteus: [{ provider: { id: 'OPENAI', name: 'OpenAI' }, models: [{ modelIdentifier: 'gpt-5.4' }] }],
    codex_app_server: [{ provider: { id: 'OPENAI', name: 'OpenAI' }, models: [{ modelIdentifier: 'gpt-5.3-codex' }, { modelIdentifier: 'gpt-5.4' }] }],
    claude_agent_sdk: [{ provider: { id: 'ANTHROPIC', name: 'Anthropic' }, models: [{ modelIdentifier: 'claude-sonnet' }, { modelIdentifier: 'claude-opus' }] }],
  },
}));

vi.mock('~/services/agentStreaming', () => ({
  ConnectionState: {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    RECONNECTING: 'reconnecting',
  },
  TeamStreamingService: vi.fn().mockImplementation(() => ({
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

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({
    getBoundEndpoints: () => ({
      teamWs: 'ws://node-a.example/ws/agent-team',
    }),
  }),
}));

vi.mock('~/stores/agentTeamContextsStore', () => ({
  useAgentTeamContextsStore: () => teamContextsStoreMock,
}));

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({
    mutate: mockMutate,
  }),
}));

vi.mock('~/stores/agentActivityStore', () => ({
  useAgentActivityStore: () => ({
    clearActivities: mockClearActivities,
  }),
}));

vi.mock('~/stores/runHistoryStore', () => ({
  useRunHistoryStore: () => runHistoryStoreMock,
}));

vi.mock('~/stores/agentTeamDefinitionStore', () => ({
  useAgentTeamDefinitionStore: () => teamDefinitionStoreMock,
}));

vi.mock('~/stores/contextFileUploadStore', () => ({
  useContextFileUploadStore: () => contextFileUploadStoreMock,
}));

vi.mock('~/composables/useRuntimeScopedModelSelection', () => ({
  loadRuntimeProviderGroupsForSelection: vi.fn(async (runtimeKind: string) => runtimeProviderLookup[runtimeKind] ?? []),
}));

describe('agentTeamRunStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockConnectionState.value = 'connected';
    mockConnect.mockReset();
    mockDisconnect.mockReset();
    mockAttachContext.mockReset();
    mockSendMessage.mockReset();
    mockStopGeneration.mockReset();
    teamContextsStoreMock.activeTeamContext = null;
    teamContextsStoreMock.focusedMemberContext = null;
    teamContextsStoreMock.getTeamContextById.mockReset();
    runHistoryStoreMock.teamResumeConfigByTeamRunId = {};
    contextFileUploadStoreMock.finalizeDraftAttachments.mockImplementation(async ({ attachments }: { attachments: any[] }) => attachments);
  });

  it('connects team stream using bound node team WS endpoint', () => {
    const teamContext = {
      teamRunId: 'team-1',
      isSubscribed: false,
      unsubscribe: undefined as undefined | (() => void),
    };
    teamContextsStoreMock.getTeamContextById.mockReturnValue(teamContext);

    const store = useAgentTeamRunStore();
    store.connectToTeamStream('team-1');

    expect(TeamStreamingService).toHaveBeenCalledWith('ws://node-a.example/ws/agent-team');
    expect(mockConnect).toHaveBeenCalledWith('team-1', teamContext);
    expect(teamContext.isSubscribed).toBe(true);
    expect(typeof teamContext.unsubscribe).toBe('function');

    teamContext.unsubscribe?.();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('marks team as shutdown but keeps context for history restore after terminate', async () => {
    const teamContext = {
      teamRunId: 'team-1',
      isSubscribed: true,
      currentStatus: AgentTeamStatus.Processing,
      unsubscribe: undefined as undefined | (() => void),
      members: new Map([
        ['member-a', { state: { runId: 'agent-a', currentStatus: AgentStatus.ProcessingUserInput } }],
        ['member-b', { state: { runId: 'agent-b', currentStatus: AgentStatus.Idle } }],
      ]),
    };
    teamContextsStoreMock.getTeamContextById.mockReturnValue(teamContext);
    mockMutate.mockResolvedValue({
      data: {
        terminateAgentTeamRun: {
          success: true,
          message: 'terminated',
        },
      },
      errors: [],
    });

    const store = useAgentTeamRunStore();
    store.connectToTeamStream('team-1');
    const result = await store.terminateTeamRun('team-1');

    expect(result).toBe(true);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(teamContext.unsubscribe).toBeUndefined();
    expect(teamContext.isSubscribed).toBe(false);
    expect(teamContext.currentStatus).toBe(AgentTeamStatus.ShutdownComplete);
    expect(teamContext.members.get('member-a')?.state.currentStatus).toBe(AgentStatus.ShutdownComplete);
    expect(teamContext.members.get('member-b')?.state.currentStatus).toBe(AgentStatus.ShutdownComplete);
    expect(mockClearActivities).toHaveBeenCalledWith('agent-a');
    expect(mockClearActivities).toHaveBeenCalledWith('agent-b');
    expect(teamContextsStoreMock.removeTeamContext).not.toHaveBeenCalled();
    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(runHistoryStoreMock.markTeamAsInactive).toHaveBeenCalledWith('team-1');
    expect(runHistoryStoreMock.refreshTreeQuietly).toHaveBeenCalledTimes(1);
  });

  it('does not mark a persisted team inactive when backend termination fails', async () => {
    const teamContext = {
      teamRunId: 'team-terminate-fails-1',
      isSubscribed: true,
      currentStatus: AgentTeamStatus.Processing,
      unsubscribe: undefined as undefined | (() => void),
      members: new Map([
        ['member-a', { state: { runId: 'agent-a', currentStatus: AgentStatus.ProcessingUserInput } }],
      ]),
    };
    teamContextsStoreMock.getTeamContextById.mockReturnValue(teamContext);
    mockMutate.mockResolvedValue({
      data: {
        terminateAgentTeamRun: {
          success: false,
          message: 'not found',
        },
      },
      errors: [],
    });

    const store = useAgentTeamRunStore();
    store.connectToTeamStream('team-terminate-fails-1');
    const result = await store.terminateTeamRun('team-terminate-fails-1');

    expect(result).toBe(false);
    expect(mockDisconnect).not.toHaveBeenCalled();
    expect(teamContext.isSubscribed).toBe(true);
    expect(runHistoryStoreMock.markTeamAsInactive).not.toHaveBeenCalled();
    expect(runHistoryStoreMock.refreshTreeQuietly).not.toHaveBeenCalled();
  });

  it('discardDraftTeamRun removes a temporary team locally without backend termination', () => {
    const teamContext = {
      teamRunId: 'temp-team-1',
      isSubscribed: true,
      unsubscribe: undefined as undefined | (() => void),
      members: new Map([
        ['member-a', { isSending: true, state: { runId: 'agent-a', currentStatus: AgentStatus.Idle } }],
        ['member-b', { isSending: false, state: { runId: 'agent-b', currentStatus: AgentStatus.Idle } }],
      ]),
    };
    teamContextsStoreMock.getTeamContextById.mockReturnValue(teamContext);

    const store = useAgentTeamRunStore();
    store.connectToTeamStream('temp-team-1');
    const result = store.discardDraftTeamRun('temp-team-1');

    expect(result).toBe(true);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(teamContext.isSubscribed).toBe(false);
    expect(teamContext.members.get('member-a')?.isSending).toBe(false);
    expect(teamContextsStoreMock.removeTeamContext).toHaveBeenCalledWith('temp-team-1');
    expect(mockClearActivities).toHaveBeenCalledWith('agent-a');
    expect(mockClearActivities).toHaveBeenCalledWith('agent-b');
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('reconnects and sends over WebSocket for a persisted team', async () => {
    const focusedMember = {
      state: {
        runId: 'member-1',
        conversation: {
          messages: [] as any[],
          updatedAt: '2026-02-21T00:00:00.000Z',
        },
      },
    };
    const teamContext = {
      teamRunId: 'team-1',
      focusedMemberName: 'professor',
      isSubscribed: false,
      config: {
        teamDefinitionId: 'team-def-1',
        workspaceId: 'ws-1',
        llmModelIdentifier: 'model-x',
        llmConfig: null,
        autoExecuteTools: false,
        skillAccessMode: 'PRELOADED_ONLY',
        memberOverrides: {},
      },
      members: new Map([['professor', focusedMember]]),
    };

    teamContextsStoreMock.activeTeamContext = teamContext;
    teamContextsStoreMock.focusedMemberContext = focusedMember;
    teamContextsStoreMock.getTeamContextById.mockImplementation((teamRunId: string) =>
      teamRunId === 'team-1' ? teamContext : null,
    );

    const store = useAgentTeamRunStore();
    await store.sendMessageToFocusedMember('hello from history', []);

    expect(mockMutate).not.toHaveBeenCalled();
    expect(runHistoryStoreMock.markTeamAsActive).toHaveBeenCalledWith('team-1');
    expect(runHistoryStoreMock.refreshTreeQuietly).toHaveBeenCalledTimes(1);
    expect(TeamStreamingService).toHaveBeenCalledWith('ws://node-a.example/ws/agent-team');
    expect(mockConnect).toHaveBeenCalledWith('team-1', teamContext);
    expect(mockSendMessage).toHaveBeenCalledWith('hello from history', 'professor', [], []);
    expect(teamContext.isSubscribed).toBe(true);
  });

  it('restores persisted inactive team runs before sending', async () => {
    const focusedMember = {
      state: {
        runId: 'member-1',
        conversation: {
          messages: [] as any[],
          updatedAt: '2026-02-21T00:00:00.000Z',
        },
      },
      isSending: false,
    };
    const teamContext = {
      teamRunId: 'team-restore-1',
      focusedMemberName: 'professor',
      isSubscribed: false,
      config: {
        teamDefinitionId: 'team-def-1',
        workspaceId: 'ws-1',
        llmModelIdentifier: 'model-x',
        llmConfig: null,
        autoExecuteTools: false,
        skillAccessMode: 'PRELOADED_ONLY',
        memberOverrides: {},
      },
      members: new Map([['professor', focusedMember]]),
    };

    teamContextsStoreMock.activeTeamContext = teamContext;
    teamContextsStoreMock.focusedMemberContext = focusedMember;
    teamContextsStoreMock.getTeamContextById.mockImplementation((teamRunId: string) =>
      teamRunId === 'team-restore-1' ? teamContext : null,
    );
    runHistoryStoreMock.teamResumeConfigByTeamRunId = {
      'team-restore-1': { isActive: false },
    };
    mockMutate.mockResolvedValueOnce({
      data: {
        restoreAgentTeamRun: {
          success: true,
          teamRunId: 'team-restore-1',
          message: 'restored',
        },
      },
      errors: [],
    });

    const store = useAgentTeamRunStore();
    await store.sendMessageToFocusedMember('restore then send', []);

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        mutation: RestoreAgentTeamRun,
        variables: { teamRunId: 'team-restore-1' },
      }),
    );
    expect(teamContextsStoreMock.lockConfig).toHaveBeenCalledWith('team-restore-1');
    expect(runHistoryStoreMock.markTeamAsActive).toHaveBeenCalledWith('team-restore-1');
    expect(mockSendMessage).toHaveBeenCalledWith('restore then send', 'professor', [], []);
  });

  it('reconnects stale disconnected team stream after successful send', async () => {
    const teamRunId = `team-reconnect-${Date.now()}`;
    const focusedMember = {
      state: {
        runId: 'member-1',
        conversation: {
          messages: [] as any[],
          updatedAt: '2026-02-21T00:00:00.000Z',
        },
      },
      isSending: false,
    };
    const teamContext = {
      teamRunId,
      focusedMemberName: 'professor',
      isSubscribed: true,
      config: {
        teamDefinitionId: 'team-def-1',
        workspaceId: 'ws-1',
        llmModelIdentifier: 'model-x',
        llmConfig: null,
        autoExecuteTools: false,
        skillAccessMode: 'PRELOADED_ONLY',
        memberOverrides: {},
      },
      members: new Map([['professor', focusedMember]]),
    };

    teamContextsStoreMock.activeTeamContext = teamContext;
    teamContextsStoreMock.focusedMemberContext = focusedMember;
    teamContextsStoreMock.getTeamContextById.mockImplementation((teamRunId: string) =>
      teamRunId === teamContext.teamRunId ? teamContext : null,
    );

    const store = useAgentTeamRunStore();
    store.connectToTeamStream(teamRunId);
    expect(mockConnect).toHaveBeenCalledTimes(1);

    mockConnect.mockImplementation(() => {
      mockConnectionState.value = 'connected';
    });
    mockConnectionState.value = 'disconnected';
    await store.sendMessageToFocusedMember('hello after reconnect', []);

    expect(mockConnect).toHaveBeenCalledTimes(2);
    expect(mockConnect).toHaveBeenLastCalledWith(teamRunId, teamContext);
    expect(mockSendMessage).toHaveBeenCalledWith('hello after reconnect', 'professor', [], []);
  });

  it('reattaches an existing team stream service to the latest team context', () => {
    const teamRunId = `team-reattach-${Date.now()}`;
    const initialTeamContext = {
      teamRunId,
      isSubscribed: false,
      unsubscribe: undefined as undefined | (() => void),
    };
    const replacementTeamContext = {
      teamRunId,
      isSubscribed: false,
      unsubscribe: undefined as undefined | (() => void),
    };

    teamContextsStoreMock.getTeamContextById
      .mockReturnValueOnce(initialTeamContext)
      .mockReturnValueOnce(replacementTeamContext);

    const store = useAgentTeamRunStore();
    store.connectToTeamStream(teamRunId);
    store.connectToTeamStream(teamRunId);

    expect(mockAttachContext).toHaveBeenCalledWith(replacementTeamContext);
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(replacementTeamContext.isSubscribed).toBe(true);
    expect(typeof replacementTeamContext.unsubscribe).toBe('function');
  });

  it('stopGeneration should send STOP_GENERATION to the active team stream', () => {
    const focusedMember = {
      isSending: true,
      state: {
        runId: 'member-1',
        conversation: {
          messages: [] as any[],
          updatedAt: '2026-02-21T00:00:00.000Z',
        },
      },
    };
    const teamContext = {
      teamRunId: 'team-1',
      focusedMemberName: 'professor',
      isSubscribed: false,
      config: {
        teamDefinitionId: 'team-def-1',
        workspaceId: 'ws-1',
        llmModelIdentifier: 'model-x',
        llmConfig: null,
        autoExecuteTools: false,
        memberOverrides: {},
      },
      members: new Map([['professor', focusedMember]]),
    };

    teamContextsStoreMock.activeTeamContext = teamContext;
    teamContextsStoreMock.focusedMemberContext = focusedMember;
    teamContextsStoreMock.getTeamContextById.mockReturnValue(teamContext);

    const store = useAgentTeamRunStore();
    store.connectToTeamStream('team-1');
    const result = store.stopGeneration('team-1');

    expect(result).toBe(true);
    expect(mockStopGeneration).toHaveBeenCalledTimes(1);
    expect(focusedMember.isSending).toBe(false);
  });

  it('fans out mixed member runtimes when launching a temporary team', async () => {
    const focusedMember = {
      isSending: false,
      state: {
        runId: 'member-1',
        conversation: {
          messages: [] as any[],
          updatedAt: '2026-02-21T00:00:00.000Z',
        },
      },
    };
    const teamContext = {
      teamRunId: 'temp-team-123',
      focusedMemberName: 'professor',
      isSubscribed: false,
      config: {
        teamDefinitionId: 'team-def-1',
        runtimeKind: 'codex_app_server',
        workspaceId: 'ws-1',
        llmModelIdentifier: 'gpt-5.3-codex',
        llmConfig: { reasoning_effort: 'high' },
        autoExecuteTools: false,
        skillAccessMode: 'GLOBAL_DISCOVERY',
        memberOverrides: {
          professor: {
            agentDefinitionId: 'agent-a',
            llmModelIdentifier: 'gpt-5.3-codex',
            llmConfig: { reasoning_effort: 'medium' },
          },
          student: {
            agentDefinitionId: 'agent-b',
            runtimeKind: 'claude_agent_sdk',
            llmModelIdentifier: 'claude-sonnet',
            llmConfig: { thinking_enabled: true },
          },
        },
      },
      members: new Map([['professor', focusedMember]]),
    };

    teamDefinitionStoreMock.getAgentTeamDefinitionById.mockReturnValue({
      id: 'team-def-1',
      nodes: [
        { memberName: 'professor', refType: 'AGENT', ref: 'agent-a' },
        { memberName: 'student', refType: 'AGENT', ref: 'agent-b' },
      ],
    });

    teamContextsStoreMock.activeTeamContext = teamContext;
    teamContextsStoreMock.focusedMemberContext = focusedMember;
    teamContextsStoreMock.getTeamContextById.mockImplementation((teamRunId: string) =>
      teamRunId === 'team-1' ? { ...teamContext, teamRunId: 'team-1' } : null,
    );

    mockMutate.mockResolvedValue({
      data: {
        createAgentTeamRun: {
          success: true,
          teamRunId: 'team-1',
          message: 'ok',
        },
      },
      errors: [],
    });

    const store = useAgentTeamRunStore();
    await store.sendMessageToFocusedMember('launch', []);

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          input: expect.objectContaining({
            teamDefinitionId: 'team-def-1',
            memberConfigs: expect.arrayContaining([
              expect.objectContaining({
                memberName: 'professor',
                agentDefinitionId: 'agent-a',
                runtimeKind: 'codex_app_server',
                skillAccessMode: 'GLOBAL_DISCOVERY',
                llmConfig: { reasoning_effort: 'medium' },
              }),
              expect.objectContaining({
                memberName: 'student',
                agentDefinitionId: 'agent-b',
                runtimeKind: 'claude_agent_sdk',
                llmModelIdentifier: 'claude-sonnet',
                skillAccessMode: 'GLOBAL_DISCOVERY',
                llmConfig: { thinking_enabled: true },
              }),
            ]),
          }),
        },
      }),
    );
    expect(teamContextsStoreMock.promoteTemporaryTeamRunId).toHaveBeenCalledWith(
      'temp-team-123',
      'team-1',
    );
    expect(teamContextsStoreMock.lockConfig).toHaveBeenCalledWith('team-1');
    expect(mockSendMessage).toHaveBeenCalledWith('launch', 'professor', [], []);
  });

  it('flattens nested team definitions into mixed leaf member configs when launching a temporary team', async () => {
    const focusedMember = {
      isSending: false,
      state: {
        runId: 'temp-team-123::Leaf A',
        conversation: {
          messages: [] as any[],
          updatedAt: '2026-02-21T00:00:00.000Z',
        },
      },
    };
    const teamContext = {
      teamRunId: 'temp-team-123',
      focusedMemberName: 'Leaf A',
      isSubscribed: false,
      config: {
        teamDefinitionId: 'team-def-nested',
        runtimeKind: 'claude_agent_sdk',
        workspaceId: 'ws-1',
        llmModelIdentifier: 'claude-sonnet',
        llmConfig: { thinking_enabled: true },
        autoExecuteTools: true,
        skillAccessMode: 'PRELOADED_ONLY',
        memberOverrides: {
          'Leaf B': {
            agentDefinitionId: 'agent-leaf-b',
            runtimeKind: 'codex_app_server',
            llmModelIdentifier: 'gpt-5.4',
            llmConfig: { reasoning_effort: 'medium' },
          },
        },
      },
      members: new Map([['Leaf A', focusedMember]]),
    };

    teamDefinitionStoreMock.getAgentTeamDefinitionById.mockImplementation((id: string) => {
      if (id === 'team-def-nested') {
        return {
          id: 'team-def-nested',
          nodes: [
            { memberName: 'Nested Group', refType: 'AGENT_TEAM', ref: 'sub-team-1' },
          ],
        };
      }
      if (id === 'sub-team-1') {
        return {
          id: 'sub-team-1',
          nodes: [
            { memberName: 'Leaf A', refType: 'AGENT', ref: 'agent-leaf-a' },
            { memberName: 'Leaf B', refType: 'AGENT', ref: 'agent-leaf-b' },
          ],
        };
      }
      return null;
    });

    teamContextsStoreMock.activeTeamContext = teamContext;
    teamContextsStoreMock.focusedMemberContext = focusedMember;
    teamContextsStoreMock.getTeamContextById.mockImplementation((teamRunId: string) =>
      teamRunId === 'team-nested-1' ? { ...teamContext, teamRunId: 'team-nested-1' } : null,
    );

    mockMutate.mockResolvedValue({
      data: {
        createAgentTeamRun: {
          success: true,
          teamRunId: 'team-nested-1',
          message: 'ok',
        },
      },
      errors: [],
    });

    const store = useAgentTeamRunStore();
    await store.sendMessageToFocusedMember('launch nested', []);

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          input: expect.objectContaining({
            teamDefinitionId: 'team-def-nested',
            memberConfigs: [
              expect.objectContaining({
                memberName: 'Leaf A',
                memberRouteKey: 'Leaf A',
                agentDefinitionId: 'agent-leaf-a',
                runtimeKind: 'claude_agent_sdk',
                llmModelIdentifier: 'claude-sonnet',
                llmConfig: { thinking_enabled: true },
              }),
              expect.objectContaining({
                memberName: 'Leaf B',
                memberRouteKey: 'Leaf B',
                agentDefinitionId: 'agent-leaf-b',
                runtimeKind: 'codex_app_server',
                llmModelIdentifier: 'gpt-5.4',
                llmConfig: { reasoning_effort: 'medium' },
              }),
            ],
          }),
        },
      }),
    );
    expect(mockSendMessage).toHaveBeenCalledWith('launch nested', 'Leaf A', [], []);
  });
});
