import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type {
  TeamRunHistoryDefinitionGroup,
  TeamTreeNode,
} from '~/stores/runHistoryTypes';
import { buildWorkspaceTeamDefinitionDisplayGroups } from '../workspaceHistoryTeamDefinitionGroups';

const teamNode = (overrides: Partial<TeamTreeNode>): TeamTreeNode => ({
  teamRunId: 'team-run-1',
  teamDefinitionId: 'team-def-1',
  teamDefinitionName: 'Team One',
  workspaceRootPath: '/workspace',
  summary: 'Task',
  lastActivityAt: '2026-08-03T00:00:00.000Z',
  isActive: false,
  deleteLifecycle: 'READY',
  focusedMemberRouteKey: 'worker',
  members: [{
    teamRunId: 'team-run-1',
    memberKind: 'agent',
    memberRouteKey: 'worker',
    memberPath: ['worker'],
    memberName: 'worker',
    displayName: 'Worker',
    memberRunId: 'worker-run',
    workspaceRootPath: '/workspace',
    summary: 'Task',
    lastActivityAt: '2026-08-03T00:00:00.000Z',
    currentStatus: AgentStatus.Running,
    isActive: true,
    deleteLifecycle: 'READY',
    children: [],
  }],
  memberTree: [],
  ...overrides,
  executionRows: overrides.executionRows ?? [],
});

const historyGroup = (
  teamDefinitionId: string,
  teamDefinitionName: string,
  teamRunIds: string[],
): TeamRunHistoryDefinitionGroup => ({
  teamDefinitionId,
  teamDefinitionName,
  runs: teamRunIds.map((teamRunId) => ({ teamRunId })) as any,
});

describe('buildWorkspaceTeamDefinitionDisplayGroups', () => {
  it('uses every displayed current node instead of representative or member status', () => {
    const activeOlderRun = teamNode({
      teamRunId: 'active-older',
      isActive: true,
      lastActivityAt: '2026-08-01T00:00:00.000Z',
    });
    const inactiveRepresentative = teamNode({
      teamRunId: 'inactive-newer',
      isActive: false,
      lastActivityAt: '2026-08-03T00:00:00.000Z',
      members: [{
        ...teamNode({}).members[0]!,
        currentStatus: AgentStatus.Error,
      }],
    });

    const [group] = buildWorkspaceTeamDefinitionDisplayGroups(
      [],
      [activeOlderRun, inactiveRepresentative],
    );

    expect(group?.runs.map((run) => run.teamRunId)).toEqual([
      'active-older',
      'inactive-newer',
    ]);
    expect(group?.representativeRun.teamRunId).toBe('inactive-newer');
    expect(group?.hasActiveRuns).toBe(true);

    const [inactiveGroup] = buildWorkspaceTeamDefinitionDisplayGroups(
      [],
      [
        { ...activeOlderRun, isActive: false },
        inactiveRepresentative,
      ],
    );
    expect(inactiveGroup?.hasActiveRuns).toBe(false);
  });

  it('derives history and leftover/current-node groups from their own final run collections', () => {
    const historyInactive = teamNode({
      teamRunId: 'history-inactive',
      teamDefinitionId: 'history-def',
      teamDefinitionName: 'History Team',
      isActive: false,
    });
    const historyActive = teamNode({
      teamRunId: 'history-active',
      teamDefinitionId: 'history-def',
      teamDefinitionName: 'History Team',
      isActive: true,
    });
    const leftoverInactive = teamNode({
      teamRunId: 'current-inactive',
      teamDefinitionId: 'current-def',
      teamDefinitionName: 'Current Team',
      isActive: false,
    });
    const leftoverActive = teamNode({
      teamRunId: 'current-active',
      teamDefinitionId: 'current-def',
      teamDefinitionName: 'Current Team',
      isActive: true,
    });

    const groups = buildWorkspaceTeamDefinitionDisplayGroups(
      [historyGroup('history-def', 'History Team', ['history-inactive', 'history-active'])],
      [historyInactive, historyActive, leftoverInactive, leftoverActive],
    );

    expect(groups).toHaveLength(2);
    expect(groups[0]?.runs.map((run) => run.teamRunId)).toEqual([
      'history-inactive',
      'history-active',
    ]);
    expect(groups[0]?.hasActiveRuns).toBe(true);
    expect(groups[1]?.runs.map((run) => run.teamRunId)).toEqual([
      'current-inactive',
      'current-active',
    ]);
    expect(groups[1]?.hasActiveRuns).toBe(true);

    const inactiveGroups = buildWorkspaceTeamDefinitionDisplayGroups(
      [historyGroup('history-def', 'History Team', ['history-inactive', 'history-active'])],
      [
        historyInactive,
        { ...historyActive, isActive: false },
        leftoverInactive,
        { ...leftoverActive, isActive: false },
      ],
    );
    expect(inactiveGroups.map((group) => group.hasActiveRuns)).toEqual([false, false]);
  });
});
