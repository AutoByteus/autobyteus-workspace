import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentTeamRunStore } from '../agentTeamRunStore';
import { ConnectionState, TeamStreamingService } from '~/services/agentStreaming';

const {
  connectMock,
  disconnectMock,
  approveToolMock,
  denyToolMock,
  mutateMock,
  markTeamAsActiveMock,
  markTeamAsInactiveMock,
  refreshTreeQuietlyMock,
  promoteTemporaryTeamIdMock,
  lockConfigMock,
  removeTeamContextMock,
  activeTeamRef,
  focusedMemberRef,
  getTeamContextByIdMock,
  getAgentTeamDefinitionByIdMock,
  teamStreamConnections,
} = vi.hoisted(() => {
  const activeTeamRef = { value: null as any };
  const focusedMemberRef = { value: null as any };
  const teamStreamConnections: Array<{ connectionState: string }> = [];

  return {
    connectMock: vi.fn(),
    disconnectMock: vi.fn(),
    approveToolMock: vi.fn(),
    denyToolMock: vi.fn(),
    mutateMock: vi.fn(),
    markTeamAsActiveMock: vi.fn(),
    markTeamAsInactiveMock: vi.fn(),
    refreshTreeQuietlyMock: vi.fn().mockResolvedValue(undefined),
    promoteTemporaryTeamIdMock: vi.fn((temporaryId: string, permanentId: string) => {
      if (activeTeamRef.value?.teamId === temporaryId) {
        activeTeamRef.value.teamId = permanentId;
      }
    }),
    lockConfigMock: vi.fn(),
    removeTeamContextMock: vi.fn(),
    activeTeamRef,
    focusedMemberRef,
    getTeamContextByIdMock: vi.fn((teamId: string) => {
      if (activeTeamRef.value?.teamId === teamId) {
        return activeTeamRef.value;
      }
      return undefined;
    }),
    getAgentTeamDefinitionByIdMock: vi.fn(),
    teamStreamConnections,
  };
});

vi.mock('~/services/agentStreaming', () => ({
  ConnectionState: {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    RECONNECTING: 'reconnecting',
  },
  TeamStreamingService: vi.fn().mockImplementation(() => {
    const streamConnection = {
      connectionState: 'disconnected',
      connect: (...args: unknown[]) => {
        connectMock(...args);
        streamConnection.connectionState = 'connected';
      },
      disconnect: () => {
        disconnectMock();
        streamConnection.connectionState = 'disconnected';
      },
      approveTool: approveToolMock,
      denyTool: denyToolMock,
    };
    teamStreamConnections.push(streamConnection);
    return streamConnection;
  }),
}));

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({
    mutate: mutateMock,
  }),
}));

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({
    getBoundEndpoints: () => ({
      teamWs: 'ws://node-a.example/ws/agent-team',
    }),
  }),
}));

vi.mock('~/stores/agentTeamContextsStore', () => ({
  useAgentTeamContextsStore: () => ({
    get activeTeamContext() {
      return activeTeamRef.value;
    },
    get focusedMemberContext() {
      return focusedMemberRef.value;
    },
    getTeamContextById: getTeamContextByIdMock,
    promoteTemporaryTeamId: promoteTemporaryTeamIdMock,
    lockConfig: lockConfigMock,
    removeTeamContext: removeTeamContextMock,
  }),
}));

vi.mock('~/stores/runTreeStore', () => ({
  useRunTreeStore: () => ({
    markTeamAsActive: markTeamAsActiveMock,
    markTeamAsInactive: markTeamAsInactiveMock,
    refreshTreeQuietly: refreshTreeQuietlyMock,
  }),
}));

vi.mock('~/stores/agentTeamDefinitionStore', () => ({
  useAgentTeamDefinitionStore: () => ({
    getAgentTeamDefinitionById: getAgentTeamDefinitionByIdMock,
  }),
}));

const buildFocusedMember = (agentId: string) => ({
  state: {
    agentId,
    conversation: {
      id: `${agentId}-conversation`,
      messages: [] as any[],
      updatedAt: new Date(0).toISOString(),
    },
  },
});

describe('agentTeamRunStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    activeTeamRef.value = null;
    focusedMemberRef.value = null;
    teamStreamConnections.length = 0;

    mutateMock.mockResolvedValue({
      data: {
        sendMessageToTeam: {
          success: true,
          message: 'ok',
          teamRunId: 'team-1',
        },
      },
      errors: [],
    });
  });

  it('connects team stream using bound node team WS endpoint', () => {
    const teamContext = {
      teamId: 'team-1',
      isSubscribed: false,
      unsubscribe: undefined as undefined | (() => void),
    };
    activeTeamRef.value = teamContext;

    const store = useAgentTeamRunStore();
    store.connectToTeamStream('team-1');

    expect(TeamStreamingService).toHaveBeenCalledWith('ws://node-a.example/ws/agent-team');
    expect(connectMock).toHaveBeenCalledWith('team-1', teamContext);
    expect(teamContext.isSubscribed).toBe(true);
    expect(typeof teamContext.unsubscribe).toBe('function');
    expect(teamStreamConnections[0]?.connectionState).toBe(ConnectionState.CONNECTED);

    teamContext.unsubscribe?.();
    expect(disconnectMock).toHaveBeenCalledTimes(1);
  });

  it('reconnects when stored stream is stale/disconnected', () => {
    const teamContext = {
      teamId: 'team-1',
      isSubscribed: true,
      unsubscribe: undefined as undefined | (() => void),
    };
    activeTeamRef.value = teamContext;

    const store = useAgentTeamRunStore();
    store.connectToTeamStream('team-1');
    expect(TeamStreamingService).toHaveBeenCalledTimes(1);
    expect(teamStreamConnections[0]?.connectionState).toBe(ConnectionState.CONNECTED);

    teamStreamConnections[0]!.connectionState = ConnectionState.DISCONNECTED;

    store.ensureTeamStreamSubscribed('team-1');
    expect(disconnectMock).toHaveBeenCalledTimes(1);
    expect(TeamStreamingService).toHaveBeenCalledTimes(2);
    expect(connectMock).toHaveBeenCalledTimes(2);
  });

  it('re-subscribes team stream before sending message for existing offline team runs', async () => {
    const focusedMember = buildFocusedMember('member-professor');
    const teamContext = {
      teamId: 'team-1',
      focusedMemberName: 'professor',
      isSubscribed: false,
      unsubscribe: undefined as undefined | (() => void),
      config: {
        teamDefinitionId: 'team-def-1',
        workspaceId: 'ws-1',
        llmModelIdentifier: 'gpt-4o-mini',
        autoExecuteTools: false,
        memberOverrides: {},
      },
      members: new Map([['professor', focusedMember]]),
    };
    activeTeamRef.value = teamContext;
    focusedMemberRef.value = focusedMember;

    const store = useAgentTeamRunStore();
    await store.sendMessageToFocusedMember('hello', []);

    expect(TeamStreamingService).toHaveBeenCalledTimes(1);
    expect(connectMock).toHaveBeenCalledWith('team-1', teamContext);
    expect(teamContext.isSubscribed).toBe(true);
    const mutateCallOrder = mutateMock.mock.invocationCallOrder[0];
    const connectCallOrder = connectMock.mock.invocationCallOrder[0];
    expect(mutateCallOrder).toBeDefined();
    expect(connectCallOrder).toBeDefined();
    expect((mutateCallOrder ?? 0) < (connectCallOrder ?? 0)).toBe(true);
    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          input: expect.objectContaining({
            teamRunId: 'team-1',
            targetMemberName: 'professor',
          }),
        }),
      }),
    );
    expect(markTeamAsActiveMock).toHaveBeenCalledWith('team-1');
    expect(refreshTreeQuietlyMock).toHaveBeenCalled();
  });

  it('promotes temporary team IDs and subscribes using permanent team ID after first send', async () => {
    const focusedMember = buildFocusedMember('member-professor');
    const teamContext = {
      teamId: 'temp-team-1',
      focusedMemberName: 'professor',
      isSubscribed: false,
      unsubscribe: undefined as undefined | (() => void),
      config: {
        teamDefinitionId: 'team-def-1',
        workspaceId: 'ws-1',
        llmModelIdentifier: 'gpt-4o-mini',
        autoExecuteTools: false,
        memberOverrides: {},
      },
      members: new Map([['professor', focusedMember]]),
    };
    activeTeamRef.value = teamContext;
    focusedMemberRef.value = focusedMember;
    getAgentTeamDefinitionByIdMock.mockReturnValue({
      id: 'team-def-1',
      nodes: [
        {
          memberName: 'professor',
          referenceType: 'AGENT',
          referenceId: 'agent-def-1',
        },
      ],
    });
    mutateMock.mockResolvedValue({
      data: {
        sendMessageToTeam: {
          success: true,
          message: 'ok',
          teamRunId: 'team-perm-1',
        },
      },
      errors: [],
    });

    const store = useAgentTeamRunStore();
    await store.sendMessageToFocusedMember('hello', []);

    expect(promoteTemporaryTeamIdMock).toHaveBeenCalledWith('temp-team-1', 'team-perm-1');
    expect(lockConfigMock).toHaveBeenCalledWith('team-perm-1');
    expect(connectMock).toHaveBeenCalledWith('team-perm-1', expect.objectContaining({ teamId: 'team-perm-1' }));
    expect(markTeamAsActiveMock).toHaveBeenCalledWith('team-perm-1');
  });

  it('does not propagate host workspace to remote members during temporary team bootstrap', async () => {
    const focusedMember = buildFocusedMember('member-professor');
    const teamContext = {
      teamId: 'temp-team-2',
      focusedMemberName: 'professor',
      isSubscribed: false,
      unsubscribe: undefined as undefined | (() => void),
      config: {
        teamDefinitionId: 'team-def-2',
        workspaceId: 'ws-host',
        llmModelIdentifier: 'gpt-4o-mini',
        autoExecuteTools: false,
        memberOverrides: {
          student: {
            agentDefinitionId: 'agent-def-remote',
            workspaceRootPath: '/home/autobyteus/data/temp_workspace',
          },
        },
      },
      members: new Map([['professor', focusedMember]]),
    };
    activeTeamRef.value = teamContext;
    focusedMemberRef.value = focusedMember;
    getAgentTeamDefinitionByIdMock.mockReturnValue({
      id: 'team-def-2',
      nodes: [
        {
          memberName: 'professor',
          referenceType: 'AGENT',
          referenceId: 'agent-def-local',
          homeNodeId: 'embedded-local',
        },
        {
          memberName: 'student',
          referenceType: 'AGENT',
          referenceId: 'agent-def-remote',
          homeNodeId: 'node-docker-8001',
        },
      ],
    });
    mutateMock.mockResolvedValue({
      data: {
        sendMessageToTeam: {
          success: true,
          message: 'ok',
          teamRunId: 'team-perm-2',
        },
      },
      errors: [],
    });

    const store = useAgentTeamRunStore();
    await store.sendMessageToFocusedMember('hello', []);

    const payload = mutateMock.mock.calls[0]?.[0]?.variables?.input;
    const memberConfigs = payload?.memberConfigs;
    expect(memberConfigs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          memberName: 'professor',
          workspaceId: 'ws-host',
          workspaceRootPath: null,
        }),
        expect.objectContaining({
          memberName: 'student',
          workspaceId: null,
          workspaceRootPath: '/home/autobyteus/data/temp_workspace',
        }),
      ]),
    );
  });

  it('throws when remote member workspace path is missing', async () => {
    const focusedMember = buildFocusedMember('member-professor');
    const teamContext = {
      teamId: 'temp-team-3',
      focusedMemberName: 'professor',
      isSubscribed: false,
      unsubscribe: undefined as undefined | (() => void),
      config: {
        teamDefinitionId: 'team-def-3',
        workspaceId: 'ws-host',
        llmModelIdentifier: 'gpt-4o-mini',
        autoExecuteTools: false,
        memberOverrides: {},
      },
      members: new Map([['professor', focusedMember]]),
    };
    activeTeamRef.value = teamContext;
    focusedMemberRef.value = focusedMember;
    getAgentTeamDefinitionByIdMock.mockReturnValue({
      id: 'team-def-3',
      nodes: [
        {
          memberName: 'professor',
          referenceType: 'AGENT',
          referenceId: 'agent-def-local',
          homeNodeId: 'embedded-local',
        },
        {
          memberName: 'student',
          referenceType: 'AGENT',
          referenceId: 'agent-def-remote',
          homeNodeId: 'node-docker-8001',
        },
      ],
    });

    const store = useAgentTeamRunStore();
    await expect(store.sendMessageToFocusedMember('hello', [])).rejects.toThrow(
      'Remote workspace path is required for: student',
    );
    expect(mutateMock).not.toHaveBeenCalled();
  });
});
