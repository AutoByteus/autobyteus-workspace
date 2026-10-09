import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type {
  RunHistoryStableExecutionRow,
  RunHistoryTeamExecutionRow,
  RunHistoryTransientExecutionRow,
  TeamMemberTreeRow,
  TeamTreeNode,
} from '~/stores/runHistoryTypes';
import {
  teamBranchStatus,
  teamDefinitionGroupStatus,
  teamRunStatus,
} from '../workspaceHistoryTeamBranchStatus';

const memberTreeRow = (
  kind: TeamMemberTreeRow['kind'],
  key: string,
  status: AgentStatus | null,
): TeamMemberTreeRow => ({
  teamRunId: 'root-team-run',
  kind,
  memberAddress: `/${key}`,
  displayName: key,
  agentRunId: kind === 'agent' ? `${key}-run` : null,
  teamRunIdForNode: kind === 'agent_team' ? `${key}-team-run` : null,
  workspaceRootPath: '/workspace',
  summary: 'Summary',
  lastActivityAt: '2026-08-29T00:00:00.000Z',
  currentStatus: status,
  isActive: status !== AgentStatus.Offline,
  deleteLifecycle: 'READY',
  children: [],
});

const stableTeamRow = (key: string, depth: number): RunHistoryStableExecutionRow => ({
  kind: 'stable_member',
  rowKey: `team:${key}`,
  teamRunId: 'root-team-run',
  memberAddress: `/${key}`,
  agentRunId: null,
  teamRunIdForNode: `${key}-team-run`,
  memberKind: 'agent_team',
  displayName: key,
  depth,
  hasChildren: true,
  row: memberTreeRow('agent_team', key, null),
});

const stableAgentRow = (
  key: string,
  depth: number,
  status: AgentStatus | null,
): RunHistoryStableExecutionRow => ({
  kind: 'stable_member',
  rowKey: `agent:${key}`,
  teamRunId: 'root-team-run',
  memberAddress: `/${key}`,
  agentRunId: `${key}-run`,
  teamRunIdForNode: null,
  memberKind: 'agent',
  displayName: key,
  depth,
  hasChildren: false,
  row: memberTreeRow('agent', key, status),
});

const taskAgentRow = (
  key: string,
  depth: number,
  status: AgentStatus | string | null,
  transientKind: RunHistoryTransientExecutionRow['transientKind'] = 'task_agent',
): RunHistoryTransientExecutionRow => ({
  kind: 'transient_execution',
  transientKind,
  rowKey: `task-agent:${key}`,
  teamRunId: 'root-team-run',
  memberAddress: `/${key}`,
  agentRunId: `${key}-run`,
  teamRunIdForNode: null,
  memberKind: 'agent',
  displayName: key,
  currentStatus: status,
  delegatedBy: null,
  depth,
  hasChildren: false,
});

const taskTeamRow = (
  key: string,
  depth: number,
  status: AgentStatus | string | null,
): RunHistoryTransientExecutionRow => ({
  kind: 'transient_execution',
  transientKind: 'task_team',
  rowKey: `task-team:${key}`,
  teamRunId: 'root-team-run',
  memberAddress: `/${key}`,
  agentRunId: null,
  teamRunIdForNode: `${key}-team-run`,
  memberKind: 'agent_team',
  displayName: key,
  currentStatus: status,
  delegatedBy: null,
  depth,
  hasChildren: true,
});

const teamNode = (
  teamRunId: string,
  isActive: boolean,
  executionRows: RunHistoryTeamExecutionRow[],
): TeamTreeNode => ({
  teamRunId,
  teamDefinitionId: 'team-def',
  teamDefinitionName: 'Team',
  workspaceRootPath: '/workspace',
  summary: 'Summary',
  lastActivityAt: '2026-08-29T00:00:00.000Z',
  isActive,
  deleteLifecycle: 'READY',
  focusedAgentRunId: '',
  rootTeam: memberTreeRow('agent_team', 'root', null),
  members: [],
  executionRows,
});

/** delegated-team-aggregate-status REQ-001/002/003/005, AC-002..004/007/009. */
describe('teamBranchStatus', () => {
  it.each([
    [[AgentStatus.Running, AgentStatus.Idle], AgentStatus.Running],
    [[AgentStatus.Initializing, AgentStatus.Error, AgentStatus.Idle], AgentStatus.Running],
    [[AgentStatus.Error, AgentStatus.Idle, AgentStatus.Offline], AgentStatus.Error],
    [[AgentStatus.Idle, AgentStatus.Offline], AgentStatus.Idle],
    [[AgentStatus.Offline, null, 'unexpected'], AgentStatus.Offline],
  ] as const)('applies the universal rule to descendant Agent statuses %j', (statuses, expected) => {
    const team = stableTeamRow('team-a', 0);
    const rows: RunHistoryTeamExecutionRow[] = [
      team,
      ...statuses.map((status, index) => taskAgentRow(`agent-${index}`, 1, status)),
    ];

    expect(teamBranchStatus(rows, team, true)).toBe(expected);
  });

  it.each(
    [
      [AgentStatus.Offline, AgentStatus.Offline],
      [AgentStatus.Idle, AgentStatus.Idle],
      [AgentStatus.Error, AgentStatus.Error],
      [AgentStatus.Initializing, AgentStatus.Running],
      [AgentStatus.Running, AgentStatus.Running],
    ].flatMap(([left, leftTeam], leftRank, statuses) => statuses.map(([right, rightTeam], rightRank) => ({
      left,
      right,
      expected: leftRank >= rightRank ? leftTeam : rightTeam,
    }))),
  )('selects $expected over the pair $left + $right', ({ left, right, expected }) => {
    const team = stableTeamRow('pair-team', 0);
    const rows: RunHistoryTeamExecutionRow[] = [
      team,
      stableAgentRow('left-agent', 1, left),
      taskAgentRow('right-agent', 1, right),
    ];

    expect(teamBranchStatus(rows, team, true)).toBe(expected);
  });

  it('is offline for empty descendants, non-Team targets and a stopped run', () => {
    const team = stableTeamRow('empty-team', 0);
    const agent = stableAgentRow('agent', 1, AgentStatus.Running);
    const absentTeam = stableTeamRow('absent-team', 0);

    expect(teamBranchStatus([team], team, true)).toBe(AgentStatus.Offline);
    expect(teamBranchStatus([agent], agent, true)).toBe(AgentStatus.Offline);
    expect(teamBranchStatus([team], absentTeam, true)).toBe(AgentStatus.Offline);
    expect(teamBranchStatus([team, agent], team, false)).toBe(AgentStatus.Offline);
  });

  it('gives delegated (transient) Team rows the same status from their own subtree', () => {
    const delegated = taskTeamRow('delegated-team', 0, null);
    const nestedDelegated = taskTeamRow('nested-delegated-team', 1, null);
    const rows: RunHistoryTeamExecutionRow[] = [
      delegated,
      taskAgentRow('coordinator', 1, AgentStatus.Idle, 'task_team_child'),
      nestedDelegated,
      taskAgentRow('nested-member', 2, AgentStatus.Running, 'task_team_child'),
      taskAgentRow('outside', 0, AgentStatus.Error),
    ];

    expect(teamBranchStatus(rows, delegated, true)).toBe(AgentStatus.Running);
    expect(teamBranchStatus(rows, nestedDelegated, true)).toBe(AgentStatus.Running);
    expect(teamBranchStatus(rows, delegated, false)).toBe(AgentStatus.Offline);
  });

  it('includes recursive task-scoped Agent kinds while isolating ancestors, containers, and sibling Teams', () => {
    const outsideAncestor = stableAgentRow('outside-ancestor', 0, AgentStatus.Running);
    const teamA = stableTeamRow('team-a', 0);
    const nestedTeam = stableTeamRow('nested-team', 1);
    const teamB = stableTeamRow('team-b', 0);
    const rows: RunHistoryTeamExecutionRow[] = [
      outsideAncestor,
      teamA,
      stableAgentRow('team-a-agent', 1, AgentStatus.Idle),
      nestedTeam,
      stableAgentRow('nested-offline-agent', 2, AgentStatus.Offline),
      taskTeamRow('nested-task-team-container', 2, AgentStatus.Running),
      taskAgentRow('nested-task-team-child', 3, AgentStatus.Error, 'task_team_child'),
      teamB,
      taskAgentRow('sibling-running-agent', 1, AgentStatus.Running),
    ];

    expect(teamBranchStatus(rows, nestedTeam, true)).toBe(AgentStatus.Error);
    expect(teamBranchStatus(rows, teamA, true)).toBe(AgentStatus.Error);
    expect(teamBranchStatus(rows, teamB, true)).toBe(AgentStatus.Running);
  });
});

/** delegated-team-aggregate-status REQ-001..004, AC-002/007/008 (TEAMS run and group rows). */
describe('teamRunStatus and teamDefinitionGroupStatus', () => {
  const idleRun = () => teamNode('idle-run', true, [
    stableAgentRow('solution-designer', 0, AgentStatus.Idle),
    stableAgentRow('reviewer', 0, AgentStatus.Offline),
  ]);
  const busyRun = (isActive = true) => teamNode('busy-run', isActive, [
    stableAgentRow('lead', 0, AgentStatus.Offline),
    stableTeamRow('sub-team', 0),
    taskAgentRow('sub-member', 1, AgentStatus.Running),
  ]);
  const stoppedRun = () => teamNode('stopped-run', false, [stableAgentRow('lead', 0, AgentStatus.Running)]);

  it('reads a run from all of its Agent rows (nested and delegated too), gray when stopped', () => {
    expect(teamRunStatus(idleRun())).toBe(AgentStatus.Idle);
    expect(teamRunStatus(busyRun())).toBe(AgentStatus.Running);
    expect(teamRunStatus(stoppedRun())).toBe(AgentStatus.Offline);
    expect(teamRunStatus(teamNode('restored-run', true, [stableAgentRow('lead', 0, AgentStatus.Offline)])))
      .toBe(AgentStatus.Offline);
  });

  it('reads a group as the highest status among its runs', () => {
    expect(teamDefinitionGroupStatus([stoppedRun(), idleRun(), busyRun()])).toBe(AgentStatus.Running);
    expect(teamDefinitionGroupStatus([stoppedRun(), idleRun(), busyRun(false)])).toBe(AgentStatus.Idle);
    expect(teamDefinitionGroupStatus([stoppedRun(), busyRun(false)])).toBe(AgentStatus.Offline);
    expect(teamDefinitionGroupStatus([])).toBe(AgentStatus.Offline);
  });
});
