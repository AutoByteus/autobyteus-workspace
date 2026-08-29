import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type {
  RunHistoryStableExecutionRow,
  RunHistoryTeamExecutionRow,
  RunHistoryTransientExecutionRow,
  TeamMemberTreeRow,
} from '~/stores/runHistoryTypes';
import { aggregateNestedTeamAgentStatus } from '../workspaceHistoryNestedTeamStatus';

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
): RunHistoryTransientExecutionRow => ({
  kind: 'transient_execution',
  transientKind: 'task_agent',
  rowKey: `task-agent:${key}`,
  teamRunId: 'root-team-run',
  memberAddress: `/${key}`,
  agentRunId: `${key}-run`,
  teamRunIdForNode: null,
  memberKind: 'agent',
  displayName: key,
  currentStatus: status,
  depth,
  hasChildren: false,
});

describe('aggregateNestedTeamAgentStatus', () => {
  it.each([
    [[AgentStatus.Running, AgentStatus.Idle], AgentStatus.Running],
    [[AgentStatus.Initializing, AgentStatus.Error, AgentStatus.Idle], AgentStatus.Initializing],
    [[AgentStatus.Error, AgentStatus.Idle, AgentStatus.Offline], AgentStatus.Error],
    [[AgentStatus.Idle, AgentStatus.Offline], AgentStatus.Idle],
    [[AgentStatus.Offline, null, 'unexpected'], AgentStatus.Offline],
  ] as const)('applies precedence to descendant Agent statuses %j', (statuses, expected) => {
    const team = stableTeamRow('team-a', 0);
    const rows: RunHistoryTeamExecutionRow[] = [
      team,
      ...statuses.map((status, index) => taskAgentRow(`agent-${index}`, 1, status)),
    ];

    expect(aggregateNestedTeamAgentStatus(rows, team)).toBe(expected);
  });

  it('falls back to offline for empty descendants and non-Team targets', () => {
    const team = stableTeamRow('empty-team', 0);
    const agent = stableAgentRow('agent', 1, AgentStatus.Running);

    expect(aggregateNestedTeamAgentStatus([team], team)).toBe(AgentStatus.Offline);
    expect(aggregateNestedTeamAgentStatus([agent], agent)).toBe(AgentStatus.Offline);
  });

  it('includes recursive task-scoped Agents while isolating ancestors and sibling Teams', () => {
    const teamA = stableTeamRow('team-a', 0);
    const nestedTeam = stableTeamRow('nested-team', 1);
    const teamB = stableTeamRow('team-b', 0);
    const rows: RunHistoryTeamExecutionRow[] = [
      teamA,
      stableAgentRow('team-a-agent', 1, AgentStatus.Idle),
      nestedTeam,
      stableAgentRow('nested-offline-agent', 2, AgentStatus.Offline),
      taskAgentRow('nested-task-agent', 2, AgentStatus.Initializing),
      teamB,
      taskAgentRow('sibling-running-agent', 1, AgentStatus.Running),
    ];

    expect(aggregateNestedTeamAgentStatus(rows, nestedTeam)).toBe(AgentStatus.Initializing);
    expect(aggregateNestedTeamAgentStatus(rows, teamA)).toBe(AgentStatus.Initializing);
    expect(aggregateNestedTeamAgentStatus(rows, teamB)).toBe(AgentStatus.Running);
  });
});
