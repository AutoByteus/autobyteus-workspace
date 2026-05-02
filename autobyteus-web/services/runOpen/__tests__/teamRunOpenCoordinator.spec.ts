import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openTeamRun } from '~/services/runOpen/teamRunOpenCoordinator';

const {
  loadTeamRunContextHydrationPayloadMock,
  hydrateTeamMemberActivitiesFromProjectionMock,
  getTeamContextByIdMock,
  addTeamContextMock,
  connectToTeamStreamMock,
  selectRunMock,
  clearTeamRunConfigMock,
  clearAgentRunConfigMock,
  reconstructTeamRunConfigFromMetadataMock,
} = vi.hoisted(() => ({
  loadTeamRunContextHydrationPayloadMock: vi.fn(),
  hydrateTeamMemberActivitiesFromProjectionMock: vi.fn(),
  getTeamContextByIdMock: vi.fn(),
  addTeamContextMock: vi.fn(),
  connectToTeamStreamMock: vi.fn(),
  selectRunMock: vi.fn(),
  clearTeamRunConfigMock: vi.fn(),
  clearAgentRunConfigMock: vi.fn(),
  reconstructTeamRunConfigFromMetadataMock: vi.fn(),
}));

vi.mock('~/services/runHydration/teamRunContextHydrationService', () => ({
  loadTeamRunContextHydrationPayload: loadTeamRunContextHydrationPayloadMock,
  hydrateTeamMemberActivitiesFromProjection: hydrateTeamMemberActivitiesFromProjectionMock,
}));

vi.mock('~/stores/agentTeamContextsStore', () => ({
  useAgentTeamContextsStore: () => ({
    getTeamContextById: getTeamContextByIdMock,
    addTeamContext: addTeamContextMock,
  }),
}));

vi.mock('~/stores/agentTeamRunStore', () => ({
  useAgentTeamRunStore: () => ({
    connectToTeamStream: connectToTeamStreamMock,
  }),
}));

vi.mock('~/stores/agentSelectionStore', () => ({
  useAgentSelectionStore: () => ({
    selectRun: selectRunMock,
  }),
}));

vi.mock('~/stores/agentRunConfigStore', () => ({
  useAgentRunConfigStore: () => ({
    clearConfig: clearAgentRunConfigMock,
  }),
}));

vi.mock('~/stores/teamRunConfigStore', () => ({
  useTeamRunConfigStore: () => ({
    clearConfig: clearTeamRunConfigMock,
  }),
}));

vi.mock('~/utils/teamRunConfigUtils', () => ({
  reconstructTeamRunConfigFromMetadata: reconstructTeamRunConfigFromMetadataMock,
}));

const metadata = {
  teamRunId: 'team-1',
  teamDefinitionId: 'team-def-1',
  teamDefinitionName: 'Team',
  coordinatorMemberRouteKey: 'member-a',
  runVersion: 1,
  createdAt: '2026-05-02T00:00:00.000Z',
  updatedAt: '2026-05-02T00:00:00.000Z',
  memberMetadata: [
    {
      memberRouteKey: 'member-a',
      memberName: 'Member A',
      memberRunId: 'run-a',
      agentDefinitionId: 'agent-a',
      llmModelIdentifier: 'gpt-test',
      runtimeKind: 'CODEX_APP_SERVER',
      workspaceRootPath: null,
      autoExecuteTools: true,
      skillAccessMode: null,
      llmConfig: null,
    },
    {
      memberRouteKey: 'member-b',
      memberName: 'Member B',
      memberRunId: 'run-b',
      agentDefinitionId: 'agent-b',
      llmModelIdentifier: 'gpt-test',
      runtimeKind: 'CODEX_APP_SERVER',
      workspaceRootPath: null,
      autoExecuteTools: true,
      skillAccessMode: null,
      llmConfig: null,
    },
  ],
};

const createMemberContext = (runId: string, conversationId: string) => ({
  config: { isLocked: true },
  state: {
    runId,
    conversation: {
      id: conversationId,
      messages: [],
    },
    currentStatus: 'Uninitialized',
  },
});

const createPayload = (members: Map<string, any>, projectionByMemberRouteKey: Map<string, any>) => ({
  teamRunId: 'team-1',
  focusedMemberRouteKey: 'member-a',
  resumeConfig: {
    teamRunId: 'team-1',
    isActive: true,
    metadata,
  },
  metadata,
  members,
  firstWorkspaceId: null,
  historicalHydration: null,
  projectionByMemberRouteKey,
});

describe('openTeamRun', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reconstructTeamRunConfigFromMetadataMock.mockImplementation(({ metadata: inputMetadata, isLocked }) => ({
      teamDefinitionId: inputMetadata.teamDefinitionId,
      teamDefinitionName: inputMetadata.teamDefinitionName,
      isLocked,
    }));
  });

  it('preserves live activities when keeping subscribed live member context', async () => {
    const liveConversation = { id: 'live-conversation', messages: [{ type: 'assistant' }] };
    const existingContext = {
      teamRunId: 'team-1',
      config: {},
      members: new Map([
        ['member-a', {
          config: { isLocked: true },
          state: {
            runId: 'run-a',
            conversation: liveConversation,
            currentStatus: 'Processing',
          },
        }],
      ]),
      coordinatorMemberRouteKey: 'member-a',
      historicalHydration: null,
      focusedMemberName: 'member-a',
      currentStatus: 'Processing',
      isSubscribed: true,
      taskPlan: null,
      taskStatuses: null,
    };
    const projectedMembers = new Map([
      ['member-a', createMemberContext('run-a', 'projected-conversation')],
    ]);
    const projectionByMemberRouteKey = new Map([
      ['member-a', { activities: [{ invocationId: 'tool-a' }] }],
    ]);
    getTeamContextByIdMock.mockReturnValue(existingContext);
    loadTeamRunContextHydrationPayloadMock.mockResolvedValue(
      createPayload(projectedMembers, projectionByMemberRouteKey),
    );

    await openTeamRun({
      teamRunId: 'team-1',
      ensureWorkspaceByRootPath: vi.fn(),
    });

    expect(existingContext.members.get('member-a')?.state.conversation).toBe(liveConversation);
    expect(hydrateTeamMemberActivitiesFromProjectionMock).not.toHaveBeenCalled();
    expect(connectToTeamStreamMock).toHaveBeenCalledWith('team-1');
  });

  it('hydrates projected activities when applying a fresh active team projection', async () => {
    const projectedMembers = new Map([
      ['member-a', createMemberContext('run-a', 'projected-conversation')],
    ]);
    const projectionByMemberRouteKey = new Map([
      ['member-a', { activities: [{ invocationId: 'tool-a' }] }],
    ]);
    getTeamContextByIdMock.mockReturnValue(null);
    loadTeamRunContextHydrationPayloadMock.mockResolvedValue(
      createPayload(projectedMembers, projectionByMemberRouteKey),
    );

    await openTeamRun({
      teamRunId: 'team-1',
      ensureWorkspaceByRootPath: vi.fn(),
    });

    expect(addTeamContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: 'team-1',
        members: projectedMembers,
      }),
    );
    expect(hydrateTeamMemberActivitiesFromProjectionMock).toHaveBeenCalledWith({
      members: projectedMembers,
      projectionByMemberRouteKey,
      memberRouteKeys: ['member-a'],
    });
  });

  it('hydrates only newly applied member projections when preserving existing live members', async () => {
    const existingContext = {
      teamRunId: 'team-1',
      config: {},
      members: new Map([
        ['member-a', createMemberContext('run-a', 'live-conversation')],
      ]),
      coordinatorMemberRouteKey: 'member-a',
      historicalHydration: null,
      focusedMemberName: 'member-a',
      currentStatus: 'Processing',
      isSubscribed: true,
      taskPlan: null,
      taskStatuses: null,
    };
    const projectedMembers = new Map([
      ['member-a', createMemberContext('run-a', 'projected-a')],
      ['member-b', createMemberContext('run-b', 'projected-b')],
    ]);
    const projectionByMemberRouteKey = new Map([
      ['member-a', { activities: [{ invocationId: 'tool-a' }] }],
      ['member-b', { activities: [{ invocationId: 'tool-b' }] }],
    ]);
    getTeamContextByIdMock.mockReturnValue(existingContext);
    loadTeamRunContextHydrationPayloadMock.mockResolvedValue(
      createPayload(projectedMembers, projectionByMemberRouteKey),
    );

    await openTeamRun({
      teamRunId: 'team-1',
      ensureWorkspaceByRootPath: vi.fn(),
    });

    expect(hydrateTeamMemberActivitiesFromProjectionMock).toHaveBeenCalledWith({
      members: existingContext.members,
      projectionByMemberRouteKey,
      memberRouteKeys: ['member-b'],
    });
  });
});
