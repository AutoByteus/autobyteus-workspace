import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import {
  buildTestTeamContext,
  testAgentNode,
  testSubTeamNode,
  testTaskRecord,
} from '~/test-support/currentTeamTestFixtures';
import { buildRunHistoryTeamExecutionRows } from '../runHistoryTeamExecutionRows';

const ROOT = 'team-run-1';
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

const historyTeam = (children: any[]) => ({
  teamRunId: ROOT,
  teamDefinitionId: 'team-def',
  teamDefinitionName: 'Root Team',
  workspaceRootPath: '/workspace',
  summary: 'Team summary',
  lastActivityAt: '2026-06-30T00:00:00.000Z',
  isActive: true,
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
    const softwareTeam = testSubTeamNode('/SoftwareEngineeringTeam', [reviewLead], {
      teamDefinitionId: 'software-team', teamRunId: 'software-team-run', coordinatorAddress: reviewLead.address,
    });
    const context = buildTestTeamContext({
      teamRunId: ROOT,
      coordinatorAddress: solution.address,
      rootChildren: [solution, worker, softwareTeam],
      tasks: [
        testTaskRecord({
          taskId: 'task-agent-1', delegatorAgentRunId: solution.agentRunId,
          recipientAddress: worker.address, target: { agentRunId: 'task-agent-run-1' },
          description: 'This detail stays outside Workspace rows.',
        }),
        testTaskRecord({
          taskId: 'task-team-1', delegatorAgentRunId: solution.agentRunId,
          recipientAddress: softwareTeam.address, target: { teamRunId: 'task-team-run-1' },
          description: 'Review the implementation as a Team.',
        }),
      ],
    });
    context.view.getAgentContext('task-agent-run-1')!.state.currentStatus = AgentStatus.Running;
    const stableChildren = [
      stableRow(solution.address, [], { agentRunId: solution.agentRunId }),
      stableRow(worker.address, [], { agentRunId: worker.agentRunId }),
      stableRow(softwareTeam.address, [stableRow(reviewLead.address, [], { agentRunId: reviewLead.agentRunId })], {
        kind: 'agent_team', teamDefinitionId: 'software-team', teamRunIdForNode: 'software-team-run',
        coordinatorAddress: reviewLead.address,
      }),
    ];

    const rows = buildRunHistoryTeamExecutionRows(historyTeam(stableChildren) as any, context);

    expect(rows.filter((row) => row.kind === 'stable_member').map((row) => row.rowKey)).toEqual([
      'agent:solution-designer-run', 'agent:worker-run', 'team:software-team-run', 'agent:review-lead-run',
    ]);
    expect(rows.find((row) => row.agentRunId === 'task-agent-run-1')).toMatchObject({
      kind: 'transient_execution', transientKind: 'task_agent', currentStatus: AgentStatus.Running,
    });
    expect(rows.find((row) => row.teamRunIdForNode === 'task-team-run-1')).toMatchObject({
      kind: 'transient_execution', transientKind: 'task_team', hasChildren: true,
    });
    expect(rows.find((row) => row.agentRunId === 'task-team-run-1:review-lead-run')).toMatchObject({
      kind: 'transient_execution', transientKind: 'task_team_child', memberAddress: reviewLead.address,
    });
    expect(rows.every((row) => !('taskDescription' in row) && !('taskReferenceFiles' in row))).toBe(true);
  });

  it('falls back to configured rows only when no live context exists', () => {
    const worker = stableRow('/worker', [stableRow('/worker/reviewer')], {
      kind: 'agent_team', teamDefinitionId: 'worker-team', teamRunIdForNode: 'worker-team-run',
      coordinatorAddress: '/worker/reviewer',
    });
    const rows = buildRunHistoryTeamExecutionRows(historyTeam([worker]) as any);
    expect(rows.map((row) => `${row.kind}:${row.memberAddress}:${row.depth}`)).toEqual([
      'stable_member:/worker:0', 'stable_member:/worker/reviewer:1',
    ]);
  });
});
