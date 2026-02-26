import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { Conversation } from '~/types/conversation';

const {
  mutateMock,
  connectMock,
  disconnectMock,
  markTeamAsActiveMock,
  refreshTreeQuietlyMock,
} = vi.hoisted(() => ({
  mutateMock: vi.fn(),
  connectMock: vi.fn(),
  disconnectMock: vi.fn(),
  markTeamAsActiveMock: vi.fn(),
  refreshTreeQuietlyMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({
    mutate: mutateMock,
  }),
}));

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({
    getBoundEndpoints: () => ({
      teamWs: 'ws://localhost:8000/ws/agent-team',
    }),
  }),
}));

vi.mock('~/stores/runTreeStore', () => ({
  useRunTreeStore: () => ({
    markTeamAsActive: markTeamAsActiveMock,
    markTeamAsInactive: vi.fn(),
    refreshTreeQuietly: refreshTreeQuietlyMock,
  }),
}));

vi.mock('~/services/agentStreaming', () => ({
  ConnectionState: {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    RECONNECTING: 'reconnecting',
  },
  TeamStreamingService: vi.fn().mockImplementation(() => ({
    connectionState: 'disconnected',
    connect: connectMock,
    disconnect: disconnectMock,
    approveTool: vi.fn(),
    denyTool: vi.fn(),
  })),
}));

const buildMemberContext = (memberName: string): AgentContext => {
  const conversation: Conversation = {
    id: `team-1::${memberName}`,
    messages: [],
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    agentDefinitionId: `agent-def-${memberName}`,
    agentName: memberName,
    llmModelIdentifier: 'gpt-4o-mini',
  };
  const state = new AgentRunState(`member-${memberName}`, conversation);
  state.currentStatus = AgentStatus.ShutdownComplete;
  return new AgentContext(
    {
      agentDefinitionId: `agent-def-${memberName}`,
      agentDefinitionName: memberName,
      llmModelIdentifier: 'gpt-4o-mini',
      workspaceId: 'ws-1',
      autoExecuteTools: false,
      skillAccessMode: 'PRELOADED_ONLY',
      isLocked: false,
    },
    state,
  );
};

describe('team member offline send integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
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

  it('re-subscribes stream when sending from offline historical team member', async () => {
    const teamContextsStore = useAgentTeamContextsStore();
    const selectionStore = useAgentSelectionStore();
    const runStore = useAgentTeamRunStore();

    const professorContext = buildMemberContext('professor');
    const studentContext = buildMemberContext('student');

    teamContextsStore.addTeamContext({
      teamId: 'team-1',
      config: {
        teamDefinitionId: 'team-def-1',
        teamDefinitionName: 'Class Room Simulation',
        workspaceId: 'ws-1',
        llmModelIdentifier: 'gpt-4o-mini',
        autoExecuteTools: false,
        memberOverrides: {},
        isLocked: false,
      },
      members: new Map([
        ['professor', professorContext],
        ['student', studentContext],
      ]),
      focusedMemberName: 'professor',
      currentStatus: AgentTeamStatus.Idle,
      isSubscribed: false,
      taskPlan: null,
      taskStatuses: null,
    });
    selectionStore.selectRun('team-1', 'team');

    await runStore.sendMessageToFocusedMember('hello', []);

    expect(connectMock).toHaveBeenCalledWith(
      'team-1',
      expect.objectContaining({ teamId: 'team-1' }),
    );
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
});
