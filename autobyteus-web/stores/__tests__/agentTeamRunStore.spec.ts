import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentTeamRunStore } from '../agentTeamRunStore';
import { TeamStreamingService } from '~/services/agentStreaming';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';

const {
  mockConnect,
  mockDisconnect,
  mockAttachContext,
  mockConnectionState,
  mockStopGeneration,
  mockMutate,
  mockClearActivities,
  teamContextsStoreMock,
  runHistoryStoreMock,
  teamDefinitionStoreMock,
} = vi.hoisted(() => ({
  mockConnect: vi.fn(),
  mockDisconnect: vi.fn(),
  mockAttachContext: vi.fn(),
  mockConnectionState: { value: 'connected' as 'connected' | 'disconnected' | 'connecting' | 'reconnecting' },
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
    refreshTreeQuietly: vi.fn().mockResolvedValue(undefined),
  },
  teamDefinitionStoreMock: {
    getAgentTeamDefinitionById: vi.fn(),
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

describe('agentTeamRunStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockConnectionState.value = 'connected';
    mockAttachContext.mockReset();
    mockStopGeneration.mockReset();
    teamContextsStoreMock.activeTeamContext = null;
    teamContextsStoreMock.focusedMemberContext = null;
    teamContextsStoreMock.getTeamContextById.mockReset();
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
    mockMutate.mockResolvedValue({});

    const store = useAgentTeamRunStore();
    store.connectToTeamStream('team-1');
    await store.terminateTeamRun('team-1');

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

  it('resubscribes and marks team active when sending to an offline persisted team', async () => {
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
        autoExecuteTools: false,
        memberOverrides: {},
      },
      members: new Map([['professor', focusedMember]]),
    };

    teamContextsStoreMock.activeTeamContext = teamContext;
    teamContextsStoreMock.focusedMemberContext = focusedMember;
    teamContextsStoreMock.getTeamContextById.mockImplementation((teamRunId: string) =>
      teamRunId === 'team-1' ? teamContext : null,
    );

    mockMutate.mockResolvedValue({
      data: {
        sendMessageToTeam: {
          success: true,
          teamRunId: 'team-1',
          message: 'ok',
        },
      },
      errors: [],
    });

    const store = useAgentTeamRunStore();
    await store.sendMessageToFocusedMember('hello from history', []);

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          input: {
            userInput: {
              content: 'hello from history',
              contextFiles: [],
            },
            teamRunId: 'team-1',
            targetMemberName: 'professor',
          },
        },
      }),
    );
    expect(runHistoryStoreMock.markTeamAsActive).toHaveBeenCalledWith('team-1');
    expect(runHistoryStoreMock.refreshTreeQuietly).toHaveBeenCalledTimes(1);
    expect(TeamStreamingService).toHaveBeenCalledWith('ws://node-a.example/ws/agent-team');
    expect(mockConnect).toHaveBeenCalledWith('team-1', teamContext);
    expect(teamContext.isSubscribed).toBe(true);
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
        autoExecuteTools: false,
        memberOverrides: {},
      },
      members: new Map([['professor', focusedMember]]),
    };

    teamContextsStoreMock.activeTeamContext = teamContext;
    teamContextsStoreMock.focusedMemberContext = focusedMember;
    teamContextsStoreMock.getTeamContextById.mockImplementation((teamRunId: string) =>
      teamRunId === teamContext.teamRunId ? teamContext : null,
    );

    mockMutate.mockResolvedValue({
      data: {
        sendMessageToTeam: {
          success: true,
          teamRunId,
          message: 'ok',
        },
      },
      errors: [],
    });

    const store = useAgentTeamRunStore();
    store.connectToTeamStream(teamRunId);
    expect(mockConnect).toHaveBeenCalledTimes(1);

    mockConnectionState.value = 'disconnected';
    await store.sendMessageToFocusedMember('hello after reconnect', []);

    expect(mockConnect).toHaveBeenCalledTimes(2);
    expect(mockConnect).toHaveBeenLastCalledWith(teamRunId, teamContext);
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

  it('uses team runtime kind for all member configs when launching a temporary team', async () => {
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
        autoExecuteTools: false,
        memberOverrides: {
          professor: {
            agentDefinitionId: 'agent-a',
            llmModelIdentifier: 'gpt-5.3-codex',
            runtimeKind: 'autobyteus',
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
        sendMessageToTeam: {
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
            teamRunId: null,
            memberConfigs: expect.arrayContaining([
              expect.objectContaining({ memberName: 'professor', runtimeKind: 'codex_app_server' }),
              expect.objectContaining({ memberName: 'student', runtimeKind: 'codex_app_server' }),
            ]),
          }),
        },
      }),
    );
  });
});
