import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openTeamRun } from '~/services/runOpen/teamRunOpenCoordinator';
import { ensureTaskAgentContext } from '~/services/agentStreaming/teamTaskAgentContextProjection';

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
  createdAt: '2026-05-02T00:00:00.000Z',
  updatedAt: '2026-05-02T00:00:00.000Z',
  archivedAt: null,
  memberTree: [
    {
      memberKind: 'agent',
      memberRouteKey: 'member-a',
      memberPath: ['member-a'],
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
      memberKind: 'agent',
      memberRouteKey: 'member-b',
      memberPath: ['member-b'],
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

const createPayload = (
  members: Map<string, any>,
  projectionByMemberRouteKey: Map<string, any>,
  focusedMemberRouteKey = 'member-a',
) => ({
  teamRunId: 'team-1',
  focusedMemberRouteKey,
  resumeConfig: {
    teamRunId: 'team-1',
    isActive: true,
    metadata,
  },
  metadata,
  members,
  primaryWorkspaceMetadata: null,
  historicalHydration: null,
  projectionByMemberRouteKey,
});

const memberTree = [
  {
    memberKind: 'agent',
    memberName: 'Member A',
    displayName: 'Member A',
    memberPath: ['member-a'],
    memberRouteKey: 'member-a',
    agentDefinitionId: 'agent-a',
  },
  {
    memberKind: 'agent',
    memberName: 'Member B',
    displayName: 'Member B',
    memberPath: ['member-b'],
    memberRouteKey: 'member-b',
    agentDefinitionId: 'agent-b',
  },
];

const memberNodesByRouteKey = new Map(memberTree.map((node) => [node.memberRouteKey, node]));

const flattenMemberRouteKeys = (nodes: readonly any[]): string[] =>
  nodes.flatMap((node) => [
    node.memberRouteKey,
    ...(node.children ? flattenMemberRouteKeys(node.children) : []),
  ]);

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
      memberTree,
      memberNodesByRouteKey,
      leafAgentContextsByRouteKey: new Map([
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
      focusedMemberRouteKey: 'member-a',
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
      resolveWorkspaceMetadataByRootPath: vi.fn(),
      ensureWorkspaceByRootPath: vi.fn(),
    });

    expect(existingContext.leafAgentContextsByRouteKey.get('member-a')?.state.conversation).toBe(liveConversation);
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
      resolveWorkspaceMetadataByRootPath: vi.fn(),
      ensureWorkspaceByRootPath: vi.fn(),
    });

    expect(addTeamContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: 'team-1',
        leafAgentContextsByRouteKey: projectedMembers,
        memberTree: expect.any(Array),
        memberNodesByRouteKey: expect.any(Map),
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
      memberTree,
      memberNodesByRouteKey,
      leafAgentContextsByRouteKey: new Map([
        ['member-a', createMemberContext('run-a', 'live-conversation')],
      ]),
      coordinatorMemberRouteKey: 'member-a',
      historicalHydration: null,
      focusedMemberRouteKey: 'member-a',
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
      resolveWorkspaceMetadataByRootPath: vi.fn(),
      ensureWorkspaceByRootPath: vi.fn(),
    });

    expect(hydrateTeamMemberActivitiesFromProjectionMock).toHaveBeenCalledWith({
      members: existingContext.leafAgentContextsByRouteKey,
      projectionByMemberRouteKey,
      memberRouteKeys: ['member-b'],
    });
  });

  it('keeps parent logical member focus when reopening subscribed active execution', async () => {
    const existingContext = {
      teamRunId: 'team-1',
      config: {},
      memberTree,
      memberNodesByRouteKey,
      leafAgentContextsByRouteKey: new Map([
        ['member-a', {
          config: { isLocked: true },
          state: {
            runId: 'run-a',
            conversation: { id: 'live-a', messages: [{ type: 'user', text: 'delegate' }] },
            currentStatus: 'running',
          },
        }],
        ['member-b', {
          config: { isLocked: true },
          state: {
            runId: 'run-b',
            conversation: { id: 'live-b', messages: [] },
            currentStatus: 'initializing',
          },
        }],
      ]),
      coordinatorMemberRouteKey: 'member-a',
      historicalHydration: null,
      focusedMemberRouteKey: 'member-a',
      currentStatus: 'running',
      isSubscribed: true,
      taskPlan: null,
      taskStatuses: null,
    };
    const projectedMembers = new Map([
      ['member-a', createMemberContext('run-a', 'projected-a')],
      ['member-b', createMemberContext('run-b', 'projected-b')],
    ]);
    getTeamContextByIdMock.mockReturnValue(existingContext);
    loadTeamRunContextHydrationPayloadMock.mockResolvedValue(
      createPayload(projectedMembers, new Map(), 'member-b'),
    );

    await openTeamRun({
      teamRunId: 'team-1',
      memberRouteKey: 'member-b',
      resolveWorkspaceMetadataByRootPath: vi.fn(),
      ensureWorkspaceByRootPath: vi.fn(),
    });

    expect(loadTeamRunContextHydrationPayloadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: 'team-1',
        memberRouteKey: 'member-b',
      }),
    );
    expect(existingContext.focusedMemberRouteKey).toBe('member-b');
  });

  it('reconstructs a missing live task-agent child node when reopening a subscribed active team', async () => {
    const existingContext = {
      teamRunId: 'team-1',
      config: {},
      memberTree,
      memberNodesByRouteKey: new Map(memberNodesByRouteKey),
      leafAgentContextsByRouteKey: new Map([
        ['member-a', createMemberContext('run-a', 'live-a')],
        ['member-b', createMemberContext('run-b', 'live-b')],
      ]),
      coordinatorMemberRouteKey: 'member-a',
      historicalHydration: null,
      focusedMemberRouteKey: 'task-agent-run-1',
      currentStatus: 'running',
      isSubscribed: true,
      taskPlan: null,
      taskStatuses: null,
    } as any;
    const existingTaskAgentContext = ensureTaskAgentContext(existingContext, {
      taskAgentInstanceId: 'task-agent-instance-1',
      taskAgentRunId: 'task-agent-run-1',
      taskId: 'task_0001',
      logicalMemberRouteKey: 'member-b',
      logicalMemberPath: ['member-b'],
    });
    existingContext.memberNodesByRouteKey.delete('task-agent-run-1');
    existingContext.memberTree = existingContext.memberTree.filter((node: any) => node.memberRouteKey !== 'task-agent-run-1');

    const projectedMembers = new Map([
      ['member-a', createMemberContext('run-a', 'projected-a')],
      ['member-b', createMemberContext('run-b', 'projected-b')],
    ]);
    getTeamContextByIdMock.mockReturnValue(existingContext);
    loadTeamRunContextHydrationPayloadMock.mockResolvedValue(
      createPayload(projectedMembers, new Map()),
    );

    const result = await openTeamRun({
      teamRunId: 'team-1',
      memberRouteKey: 'task-agent-run-1',
      resolveWorkspaceMetadataByRootPath: vi.fn(),
      ensureWorkspaceByRootPath: vi.fn(),
    });

    expect(existingContext.leafAgentContextsByRouteKey.get('task-agent-run-1')).toBe(existingTaskAgentContext);
    expect(existingContext.memberNodesByRouteKey.get('task-agent-run-1')).toMatchObject({
      isTaskAgentInstance: true,
      logicalMemberRouteKey: 'member-b',
      taskAgentRunId: 'task-agent-run-1',
    });
    const routeKeys = flattenMemberRouteKeys(existingContext.memberTree);
    expect(routeKeys).toEqual(expect.arrayContaining(['member-b', 'task-agent-run-1']));
    expect(routeKeys.indexOf('task-agent-run-1')).toBeGreaterThan(routeKeys.indexOf('member-b'));
    expect(existingContext.focusedMemberRouteKey).toBe('task-agent-run-1');
    expect(result.focusedMemberRouteKey).toBe('task-agent-run-1');
  });

  it('preserves existing member-scoped statuses when reopening an active unsubscribed team', async () => {
    const existingContext = {
      teamRunId: 'team-1',
      config: {},
      memberTree,
      memberNodesByRouteKey,
      leafAgentContextsByRouteKey: new Map([
        ['member-a', {
          config: { isLocked: true },
          state: {
            runId: 'run-a',
            conversation: { id: 'existing-conversation', messages: [] },
            currentStatus: 'idle',
            canInterrupt: true,
          },
        }],
      ]),
      coordinatorMemberRouteKey: 'member-a',
      historicalHydration: null,
      focusedMemberRouteKey: 'member-a',
      currentStatus: 'offline',
      isSubscribed: false,
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
      resolveWorkspaceMetadataByRootPath: vi.fn(),
      ensureWorkspaceByRootPath: vi.fn(),
    });

    expect(existingContext.leafAgentContextsByRouteKey.get('member-a')?.state.conversation.id).toBe('projected-conversation');
    expect(existingContext.leafAgentContextsByRouteKey.get('member-a')?.state.currentStatus).toBe('idle');
    expect(existingContext.leafAgentContextsByRouteKey.get('member-a')?.state.canInterrupt).toBe(false);
    expect(connectToTeamStreamMock).toHaveBeenCalledWith('team-1');
  });

});
