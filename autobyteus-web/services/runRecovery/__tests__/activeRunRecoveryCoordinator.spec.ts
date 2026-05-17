import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recoverActiveRunsFromHistory } from '~/services/runRecovery/activeRunRecoveryCoordinator';

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
    },
    teamContextsStoreMock: {
      teams,
      getTeamContextById: vi.fn((teamRunId: string) => teams.get(teamRunId)),
    },
    agentTeamRunStoreMock: {
      connectToTeamStream: vi.fn(),
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
      coordinatorMemberRouteKey: 'solution_designer',
      workspaceRootPath: '/ws/a',
      summary: 'Live team task',
      lastActivityAt: '2026-01-01T00:00:00.000Z',
      status: 'running',
      lastKnownStatus: 'ACTIVE',
      deleteLifecycle: 'READY',
      isActive: true,
      members: [
        {
          memberRouteKey: 'solution_designer',
          memberName: 'Solution Designer',
          memberRunId: 'member-run-solution',
          status: 'running',
        },
        {
          memberRouteKey: 'implementation_engineer',
          memberName: 'Implementation Engineer',
          memberRunId: 'member-run-implementation',
          status: 'offline',
        },
        {
          memberRouteKey: 'code_reviewer',
          memberName: 'Code Reviewer',
          memberRunId: 'member-run-review',
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
  });

  it('preserves member-scoped statuses instead of fanning a running team aggregate to every member', async () => {
    teamContextsStoreMock.teams.set('team-live-1', {
      teamRunId: 'team-live-1',
      config: { isLocked: false },
      leafAgentContextsByRouteKey: new Map([
        ['solution_designer', {
          config: { isLocked: false },
          state: { runId: 'member-run-solution', currentStatus: 'offline', canInterrupt: true },
        }],
        ['implementation_engineer', {
          config: { isLocked: false },
          state: { runId: 'member-run-implementation', currentStatus: 'offline', canInterrupt: false },
        }],
        ['code_reviewer', {
          config: { isLocked: false },
          state: { runId: 'member-run-review', currentStatus: 'offline', canInterrupt: false },
        }],
      ]),
      coordinatorMemberRouteKey: 'solution_designer',
      historicalHydration: null,
      focusedMemberRouteKey: 'solution_designer',
      currentStatus: 'offline',
      isSubscribed: true,
      taskPlan: null,
      taskStatuses: null,
    });

    await recoverActiveRunsFromHistory({
      workspaceGroups: activeTeamWorkspaceGroups as any,
      ensureWorkspaceByRootPath: vi.fn(),
      findAgentNameByRunId: vi.fn(),
      setRunResumeConfig: vi.fn(),
      setTeamResumeConfig: vi.fn(),
    });

    const context = teamContextsStoreMock.teams.get('team-live-1');
    expect(context.currentStatus).toBe('running');
    expect(context.leafAgentContextsByRouteKey.get('solution_designer')?.state.currentStatus).toBe('running');
    expect(context.leafAgentContextsByRouteKey.get('implementation_engineer')?.state.currentStatus).toBe('offline');
    expect(context.leafAgentContextsByRouteKey.get('code_reviewer')?.state.currentStatus).toBe('offline');
    expect(context.leafAgentContextsByRouteKey.get('solution_designer')?.state.canInterrupt).toBe(true);
    expect(context.leafAgentContextsByRouteKey.get('implementation_engineer')?.state.canInterrupt).toBe(false);
    expect(context.leafAgentContextsByRouteKey.get('code_reviewer')?.state.canInterrupt).toBe(false);
    expect(agentTeamRunStoreMock.connectToTeamStream).not.toHaveBeenCalledWith('team-live-1');
    expect(openTeamRunMock).not.toHaveBeenCalled();
  });

  it('preserves backend-granted single-agent interrupt permission during active recovery', async () => {
    agentContextsStoreMock.runs.set('run-live-1', {
      config: { isLocked: false },
      state: {
        runId: 'run-live-1',
        currentStatus: 'running',
        canInterrupt: true,
      },
      isSubscribed: true,
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
      ensureWorkspaceByRootPath: vi.fn(),
      findAgentNameByRunId: vi.fn(),
      setRunResumeConfig: vi.fn(),
      setTeamResumeConfig: vi.fn(),
    });

    const context = agentContextsStoreMock.runs.get('run-live-1');
    expect(context.config.isLocked).toBe(true);
    expect(context.state.currentStatus).toBe('running');
    expect(context.state.canInterrupt).toBe(true);
    expect(agentRunStoreMock.connectToAgentStream).not.toHaveBeenCalledWith('run-live-1');
    expect(openAgentRunMock).not.toHaveBeenCalled();
  });
});
