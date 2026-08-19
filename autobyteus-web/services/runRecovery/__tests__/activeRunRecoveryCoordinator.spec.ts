import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recoverActiveRunsFromHistory } from '~/services/runRecovery/activeRunRecoveryCoordinator';
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures';

const {
  agentContextsStoreMock,
  agentRunStoreMock,
  teamContextsStoreMock,
  agentTeamRunStoreMock,
  openAgentRunMock,
  openTeamRunMock,
} = vi.hoisted(() => {
  const agentRuns = new Map<string, any>();
  const teams = new Map<string, any>();
  return {
    agentContextsStoreMock: {
      runs: agentRuns,
      getRun: vi.fn((runId: string) => agentRuns.get(runId)),
    },
    agentRunStoreMock: {
      connectToAgentStream: vi.fn(),
      isAgentStreamReady: vi.fn(),
    },
    teamContextsStoreMock: {
      teams,
      getTeamContextById: vi.fn((teamRunId: string) => teams.get(teamRunId)),
    },
    agentTeamRunStoreMock: {
      connectToTeamStream: vi.fn(),
      isTeamStreamReady: vi.fn(),
    },
    openAgentRunMock: vi.fn(),
    openTeamRunMock: vi.fn(),
  };
});

vi.mock('~/stores/agentContextsStore', () => ({
  useAgentContextsStore: () => agentContextsStoreMock,
}));

vi.mock('~/stores/agentRunStore', () => ({
  useAgentRunStore: () => agentRunStoreMock,
}));

vi.mock('~/stores/agentTeamContextsStore', () => ({
  useAgentTeamContextsStore: () => teamContextsStoreMock,
}));

vi.mock('~/stores/agentTeamRunStore', () => ({
  useAgentTeamRunStore: () => agentTeamRunStoreMock,
}));

vi.mock('~/services/runOpen/agentRunOpenCoordinator', () => ({
  openAgentRun: openAgentRunMock,
}));

vi.mock('~/services/runOpen/teamRunOpenCoordinator', () => ({
  openTeamRun: openTeamRunMock,
}));

const activeTeamWorkspaceGroups = [{
  workspaceRootPath: '/ws/a',
  workspaceName: 'Alpha',
  agentDefinitions: [],
  teamDefinitions: [{
    teamDefinitionId: 'team-def-1',
    teamDefinitionName: 'Team Alpha',
    runs: [{
      teamRunId: 'team-live-1',
      teamDefinitionId: 'team-def-1',
      teamDefinitionName: 'Team Alpha',
      coordinatorAddress: '/solution_designer',
      workspaceRootPath: '/ws/a',
      summary: 'Live team task',
      lastActivityAt: '2026-01-01T00:00:00.000Z',
      status: 'running',
      lastKnownStatus: 'ACTIVE',
      deleteLifecycle: 'READY',
      isActive: true,
      members: [
        {
          memberAddress: '/solution_designer',
          displayName: 'Solution Designer',
          agentRunId: 'member-run-solution',
          status: 'running',
        },
        {
          memberAddress: '/implementation_engineer',
          displayName: 'Implementation Engineer',
          agentRunId: 'member-run-implementation',
          status: 'offline',
        },
        {
          memberAddress: '/code_reviewer',
          displayName: 'Code Reviewer',
          agentRunId: 'member-run-review',
          status: 'offline',
        },
      ],
    }],
  }],
}];

describe('recoverActiveRunsFromHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    agentContextsStoreMock.runs.clear();
    teamContextsStoreMock.teams.clear();
    agentRunStoreMock.isAgentStreamReady.mockReturnValue(true);
    agentTeamRunStoreMock.isTeamStreamReady.mockReturnValue(true);
  });

  it('preserves subscribed live member statuses while recovering root team activity', async () => {
    teamContextsStoreMock.teams.set('team-live-1', buildTestTeamContext({
      teamRunId: 'team-live-1',
      teamDefinitionId: 'team-def-1',
      teamDefinitionName: 'Team Alpha',
      coordinatorAddress: '/solution_designer',
      rootChildren: [
        testAgentNode('/solution_designer', { agentRunId: 'member-run-solution', currentStatus: 'offline' as any }),
        testAgentNode('/implementation_engineer', { agentRunId: 'member-run-implementation', currentStatus: 'offline' as any }),
        testAgentNode('/code_reviewer', { agentRunId: 'member-run-review', currentStatus: 'offline' as any }),
      ],
      isActive: true,
    }));

    await recoverActiveRunsFromHistory({
      workspaceGroups: activeTeamWorkspaceGroups as any,
      resolveWorkspaceMetadataByRootPath: vi.fn(),
      ensureWorkspaceByRootPath: vi.fn(),
      findAgentNameByRunId: vi.fn(),
      setRunResumeConfig: vi.fn(),
      setTeamResumeConfig: vi.fn(),
    });

    const context = teamContextsStoreMock.teams.get('team-live-1');
    expect(context.view.isRootTeamActive()).toBe(true);
    expect(context.view.getAgentContext('member-run-solution')?.state.currentStatus).toBe('offline');
    expect(context.view.getAgentContext('member-run-implementation')?.state.currentStatus).toBe('offline');
    expect(context.view.getAgentContext('member-run-review')?.state.currentStatus).toBe('offline');
    expect(agentTeamRunStoreMock.connectToTeamStream).not.toHaveBeenCalledWith('team-live-1');
    expect(openTeamRunMock).not.toHaveBeenCalled();
  });

  it('preserves backend-granted single-agent interrupt permission during active recovery', async () => {
    agentContextsStoreMock.runs.set('run-live-1', {
      config: { isLocked: false },
      state: {
        runId: 'run-live-1',
        currentStatus: 'running',
      },
    });

    await recoverActiveRunsFromHistory({
      workspaceGroups: [{
        workspaceRootPath: '/ws/a',
        workspaceName: 'Alpha',
        agentDefinitions: [{
          agentDefinitionId: 'agent-def-1',
          agentName: 'SuperAgent',
          runs: [{
            runId: 'run-live-1',
            summary: 'Live task',
            lastActivityAt: '2026-01-01T00:00:00.000Z',
            status: 'running',
            lastKnownStatus: 'ACTIVE',
            isActive: true,
          }],
        }],
        teamDefinitions: [],
      }] as any,
      resolveWorkspaceMetadataByRootPath: vi.fn(),
      ensureWorkspaceByRootPath: vi.fn(),
      findAgentNameByRunId: vi.fn(),
      setRunResumeConfig: vi.fn(),
      setTeamResumeConfig: vi.fn(),
    });

    const context = agentContextsStoreMock.runs.get('run-live-1');
    expect(context.config.isLocked).toBe(true);
    expect(context.state.currentStatus).toBe('running');
    expect(agentRunStoreMock.connectToAgentStream).not.toHaveBeenCalledWith('run-live-1');
    expect(openAgentRunMock).not.toHaveBeenCalled();
  });
});
