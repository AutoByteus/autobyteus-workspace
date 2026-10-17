import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import {
  buildTestTeamContext,
  testAgentNode,
  testDelegation,
  testTaskTeamLayout,
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
const teamSource = (address: string, coordinator: string) => ({
  kind: 'agent_team' as const, team_definition_id: `${address}-definition`, coordinator_address: coordinator,
  members: [{ address: coordinator, agent_definition_id: `${coordinator}-definition` }], handoffs: [],
  default_launch_configuration: {
    runtime_kind: 'autobyteus', llm_model_identifier: 'test-model', llm_config: null,
    auto_execute_tools: true, workspace_root_path: null,
  },
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
  it('keeps configured rows stable and renders task Agent/Team executions as distinct run-ID rows', () => {
    const solution = testAgentNode('/solution_designer', { agentRunId: 'solution-designer-run' });
    const worker = testAgentNode('/worker', { agentRunId: 'worker-run' });
    const reviewLead = testAgentNode('/SoftwareEngineeringTeam/review_lead', { agentRunId: 'review-lead-run' });
    const softwareTeam = testTaskTeamLayout('/SoftwareEngineeringTeam', [reviewLead], {
      teamDefinitionId: 'software-team', coordinatorAddress: reviewLead.address,
    });
    const context = buildTestTeamContext({
      teamRunId: ROOT,
      coordinatorAddress: solution.address,
      rootChildren: [solution, worker],
      delegations: [
        testDelegation({ delegatorAgentRunId: solution.agentRunId, recipientAddress: worker.address, target: { agentRunId: 'task-agent-run-1' } }),
        testDelegation({ delegatorAgentRunId: solution.agentRunId, recipientAddress: softwareTeam.address, target: { teamRunId: 'task-team-run-1', team: softwareTeam } }),
      ],
    });
    context.view.getAgentContext('task-agent-run-1')!.state.currentStatus = AgentStatus.Running;
    const stableChildren = [
      stableRow(solution.address, [], { agentRunId: solution.agentRunId }),
      stableRow(worker.address, [], { agentRunId: worker.agentRunId }),
    ];

    const rows = buildRunHistoryTeamExecutionRows(historyTeam(stableChildren) as any, context);

    expect(rows.filter((row) => row.kind === 'stable_member').map((row) => row.rowKey)).toEqual([
      'agent:solution-designer-run', 'agent:worker-run',
    ]);
    expect(rows.find((row) => row.agentRunId === 'task-agent-run-1')).toMatchObject({
      kind: 'transient_execution', transientKind: 'task_agent', depth: 0, hasChildren: false, currentStatus: AgentStatus.Running,
      delegatedBy: expect.any(String),
    });
    expect(rows.find((row) => row.teamRunIdForNode === 'task-team-run-1')).toMatchObject({
      kind: 'transient_execution', transientKind: 'task_team', hasChildren: true,
    });
    expect(rows.find((row) => row.agentRunId === 'task-team-run-1:review-lead-run')).toMatchObject({
      kind: 'transient_execution', transientKind: 'task_team_child', memberAddress: reviewLead.address,
    });
    expect(rows.every((row) => !('taskDescription' in row) && !('taskReferenceFiles' in row))).toBe(true);
  });

  it('places multiple same-address tasks immediately after their leaf Agent without mutating source navigation', () => {
    const worker = testAgentNode('/worker', { agentRunId: 'worker-run' });
    const reviewer = testAgentNode('/reviewer', { agentRunId: 'reviewer-run' });
    const context = buildTestTeamContext({
      teamRunId: ROOT, coordinatorAddress: worker.address, rootChildren: [worker, reviewer],
      delegations: ['first', 'second'].map((id) => testDelegation({ delegatorAgentRunId: reviewer.agentRunId, recipientAddress: worker.address, target: { agentRunId: `${id}-run` } })),
    });
    const source = context.view.listNavigationRows();
    const before = structuredClone(source);
    const team = historyTeam([worker, reviewer].map((agent) =>
      stableRow(agent.address, [], { agentRunId: agent.agentRunId })));
    const rows = buildRunHistoryTeamExecutionRows(team as any, context);
    expect(rows.map((row) => [row.rowKey, row.depth, row.hasChildren])).toEqual([
      ['agent:worker-run', 0, false], ['agent:first-run', 0, false],
      ['agent:second-run', 0, false], ['agent:reviewer-run', 0, false],
    ]);
    expect(source).toEqual(before);
    expect(context.view.listNavigationRows()).toEqual(before);
    expect(source.find((row) => row.agentRunId === 'first-run')).toMatchObject({
      parentKey: 'agent:worker-run', depth: 2,
    });
  });

  it.each([true, false])('keeps shut-down delegated executions visible after their source (active=%s)', (isActive) => {
    const worker = testAgentNode('/worker', { agentRunId: 'worker-run' });
    const context = buildTestTeamContext({
      teamRunId: ROOT, coordinatorAddress: worker.address, rootChildren: [worker], isActive,
      taskExecutions: [{
        kind: 'task_agent', address: worker.address, agent_run_id: 'settled-run',
        platform_agent_run_id: null, delegator_agent_run_id: worker.agentRunId, started_at: createdAt,
      }],
    });
    const rows = buildRunHistoryTeamExecutionRows(historyTeam([
      stableRow(worker.address, [], { agentRunId: worker.agentRunId }),
    ], isActive) as any, context);
    expect(rows.map((row) => [row.agentRunId, row.depth, row.hasChildren])).toEqual(
      [['worker-run', 0, false], ['settled-run', 0, false]]);
  });

  it('falls back to configured rows only when no live context exists', () => {
    const rows = buildRunHistoryTeamExecutionRows(historyTeam([stableRow('/worker'), stableRow('/reviewer')]) as any);
    expect(rows.map((row) => `${row.kind}:${row.memberAddress}:${row.depth}`)).toEqual([
      'stable_member:/worker:0', 'stable_member:/reviewer:0',
    ]);
  });

  it('retains settled task-Team descendants and the delegations inside them for inactive history rows', () => {
    const solution = testAgentNode('/solution_designer', { agentRunId: 'solution-designer-run' });
    const reviewLead = '/SoftwareEngineeringTeam/review_lead';
    // A settled task Team whose lead delegated an Agent and a further task Team (Teams are flat).
    const context = buildTestTeamContext({
      teamRunId: ROOT,
      coordinatorAddress: solution.address,
      rootChildren: [solution],
      isActive: false,
      taskExecutions: [{
        kind: 'task_team', address: '/SoftwareEngineeringTeam', team_run_id: 'settled-task-team-run',
        delegator_agent_run_id: solution.agentRunId, started_at: createdAt,
        source: teamSource('/SoftwareEngineeringTeam', reviewLead),
        members: [{
          kind: 'task_team_agent', address: reviewLead,
          agent_run_id: 'settled-review-lead-run', platform_agent_run_id: null,
        }],
        task_executions: [
          {
            kind: 'task_agent', address: reviewLead, agent_run_id: 'settled-nested-agent-run',
            platform_agent_run_id: null, delegator_agent_run_id: 'settled-review-lead-run', started_at: createdAt,
          },
          {
            kind: 'task_team', address: '/SoftwareEngineeringTeam/research', team_run_id: 'settled-research-team-run',
            delegator_agent_run_id: 'settled-review-lead-run', started_at: createdAt,
            source: teamSource('/SoftwareEngineeringTeam/research', '/SoftwareEngineeringTeam/research/analyst'),
            members: [{
              kind: 'task_team_agent', address: '/SoftwareEngineeringTeam/research/analyst',
              agent_run_id: 'settled-analyst-run', platform_agent_run_id: null,
            }],
            task_executions: [],
          },
        ],
      }],
    });
    const stableChildren = [stableRow(solution.address, [], { agentRunId: solution.agentRunId })];

    const rows = buildRunHistoryTeamExecutionRows(historyTeam(stableChildren, false) as any, context);

    expect(rows.map((row) => [row.agentRunId ?? row.teamRunIdForNode, 'transientKind' in row ? row.transientKind : row.kind, row.depth, row.hasChildren])).toEqual([
      ['solution-designer-run', 'stable_member', 0, false],
      ['settled-task-team-run', 'task_team', 0, true],
      ['settled-review-lead-run', 'task_team_child', 1, false],
      ['settled-nested-agent-run', 'task_agent', 1, false],
      ['settled-research-team-run', 'task_team', 1, true],
      ['settled-analyst-run', 'task_team_child', 2, false],
    ]);

    const projection = buildRunHistoryNavigationProjection({
      workspaceGroups: [], agentAvatarByDefinitionId: {}, allWorkspaces: [],
      workspacesById: {}, agentContexts: new Map(), teamContexts: [context], agentOrgHistory: [],
    });
    expect(projection.memberAncestorExecutionKeysByIdentity[
      runHistoryMemberIndexKey(ROOT, 'settled-analyst-run')
    ]).toEqual(['team:settled-task-team-run', 'team:settled-research-team-run']);
  });
});
