import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import {
  buildTestTeamContext,
  testAgentNode,
} from '~/test-support/currentTeamTestFixtures';
import { buildRunHistoryTeamExecutionRows } from '../runHistoryTeamExecutionRows';
import { buildRunHistoryNavigationProjection, runHistoryMemberIndexKey } from '../runHistoryNavigationProjection';

const ROOT = 'team-run-1';
const createdAt = '2026-08-14T12:00:00.000Z';
const stableRow = (memberAddress: string, children: any[] = [], overrides: Record<string, any> = {}) => ({
  teamRunId: ROOT,
  kind: children.length ? 'agent_team' : 'agent',
  memberAddress,
  displayName: memberAddress.split('/').filter(Boolean).at(-1) ?? memberAddress,
  agentRunId: children.length ? null : `${memberAddress}-run`,
  teamRunIdForNode: null,
  workspaceRootPath: '/workspace',
  summary: 'Team summary',
  lastActivityAt: '2026-06-30T00:00:00.000Z',
  currentStatus: children.length ? null : AgentStatus.Idle,
  isActive: true,
  deleteLifecycle: 'READY',
  children,
  ...overrides,
});

/** The recorded catalog source of a task Team copy whose only member is its coordinator. */
const copyLaunch = {
  runtime_kind: 'autobyteus' as const, llm_model_identifier: 'test-model', llm_config: null,
  auto_execute_tools: true, workspace_root_path: null,
};
const teamSource = (address: string, coordinator: string) => ({
  kind: 'agent_team' as const, team_definition_id: `${address}-definition`, coordinator_address: coordinator,
  members: [{ address: coordinator, agent_definition_id: `${coordinator}-definition`, launch_configuration: copyLaunch }], handoffs: [],
  default_launch_configuration: copyLaunch,
});

const historyTeam = (children: any[], isActive = true) => ({
  teamRunId: ROOT,
  teamDefinitionId: 'team-def',
  teamDefinitionName: 'Root Team',
  workspaceRootPath: '/workspace',
  summary: 'Team summary',
  lastActivityAt: '2026-06-30T00:00:00.000Z',
  isActive,
  deleteLifecycle: 'READY',
  focusedAgentRunId: 'solution-designer-run',
  rootTeam: stableRow('/', children, {
    kind: 'agent_team',
    displayName: 'Root Team',
    teamDefinitionId: 'team-def',
    teamRunIdForNode: ROOT,
    coordinatorAddress: '/solution_designer',
  }),
  members: children,
  executionRows: [],
});

describe('runHistoryTeamExecutionRows current run identities', () => {
  // SR-084: a Team's delegated runs are the server's tree's rows (RunTreeView); this builds the Team's own members only.
  it('builds the Team\'s own configured rows only', () => {
    const rows = buildRunHistoryTeamExecutionRows(historyTeam([stableRow('/worker'), stableRow('/reviewer')]) as any);
    expect(rows.map((row) => `${row.kind}:${row.memberAddress}:${row.depth}`)).toEqual([
      'stable_member:/worker:0', 'stable_member:/reviewer:0',
    ]);
  });

});
