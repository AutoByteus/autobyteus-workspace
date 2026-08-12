import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import {
  createTeamExecutionAddress,
  serializeTeamExecutionAddress,
  toTeamExecutionAddressDto,
} from '~/types/agent/TeamExecutionAddress';
import {
  buildTestTeamContext,
  testAgentNode,
  testSubTeamNode,
  testTaskProjection,
} from '~/test-support/currentTeamTestFixtures';
import { buildRunHistoryTeamExecutionRows } from '../runHistoryTeamExecutionRows';

const ROOT = 'team-run-1';
const stableRow = (memberAddress: string, children: any[] = [], overrides: Record<string, any> = {}) => ({
  teamRunId: ROOT,
  kind: children.length ? 'agent_team' : 'agent',
  memberAddress,
  displayName: memberAddress.split('/').filter(Boolean).at(-1) ?? memberAddress,
  agentRunId: children.length ? null : `${memberAddress}-run`,
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
  focusedExecutionAddress: createTeamExecutionAddress({ rootTeamRunId: ROOT, memberAddress: '/worker' }),
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

describe('runHistoryTeamExecutionRows exact addresses', () => {
  it('preserves live placement while separating stable and transient execution rows', () => {
    const solution = testAgentNode('/solution_designer', { agentRunId: 'solution-designer-run' });
    const worker = testAgentNode('/worker', { agentRunId: 'worker-run' });
    const reviewLead = testAgentNode('/SoftwareEngineeringTeam/review_lead', {
      displayName: 'review_lead',
      agentRunId: 'review-lead-run',
    });
    const softwareTeam = testSubTeamNode('/SoftwareEngineeringTeam', [reviewLead], {
      displayName: 'Software Engineering Team',
      teamDefinitionId: 'software-team',
      teamRunId: 'software-team-run',
      coordinatorAddress: reviewLead.address,
    });
    const taskAgentAddress = createTeamExecutionAddress({
      rootTeamRunId: ROOT,
      memberAddress: worker.address,
      taskAgentRunId: 'task-agent-run-1',
    });
    const taskTeamAddress = createTeamExecutionAddress({
      rootTeamRunId: ROOT,
      taskTeamRunIds: ['task-team-run-1'],
      memberAddress: softwareTeam.address,
    });
    const taskTeamChildAddress = createTeamExecutionAddress({
      rootTeamRunId: ROOT,
      taskTeamRunIds: ['task-team-run-1'],
      memberAddress: reviewLead.address,
    });
    const teamContext = buildTestTeamContext({
      teamRunId: ROOT,
      coordinatorAddress: solution.address,
      rootChildren: [solution, worker, softwareTeam],
      tasks: [
        testTaskProjection({
          taskId: 'task_0001',
          executionAddress: taskAgentAddress,
          senderAddress: createTeamExecutionAddress({ rootTeamRunId: ROOT, memberAddress: solution.address }),
          content: 'This detail must stay out of Workspaces rows.',
          referenceFiles: [{
            referenceId: 'ref-1',
            path: '/tmp/ref.md',
            type: 'file',
            createdAt: '2026-06-30T00:00:00.000Z',
            updatedAt: '2026-06-30T00:00:00.000Z',
          }],
        }),
        testTaskProjection({
          taskId: 'task_0002',
          executionAddress: taskTeamAddress,
          senderAddress: createTeamExecutionAddress({ rootTeamRunId: ROOT, memberAddress: solution.address }),
          content: 'Team task details stay on the right.',
        }),
      ],
      executionMessages: [{
        type: 'AGENT_STATUS',
        payload: {
          agent_execution: {
            kind: 'task_team_agent',
            execution_address: toTeamExecutionAddressDto(taskTeamChildAddress),
            agent_run_id: 'task-team-review-lead-run',
          },
          status: 'running',
          trigger: null,
          tool_name: null,
          error_message: null,
          error_details: null,
        },
      }],
    });
    teamContext.executions.getAgentContext(taskAgentAddress)!.state.currentStatus = AgentStatus.Running;
    const stableChildren = [
      stableRow(solution.address),
      stableRow(worker.address),
      stableRow(softwareTeam.address, [stableRow(reviewLead.address)], {
        kind: 'agent_team',
        displayName: 'Software Engineering Team',
        teamDefinitionId: 'software-team',
        teamRunIdForNode: 'software-team-run',
        coordinatorAddress: reviewLead.address,
      }),
    ];

    const rows = buildRunHistoryTeamExecutionRows(historyTeam(stableChildren) as any, teamContext);
    const rowKeys = rows.map((row) => `${row.kind}:${serializeTeamExecutionAddress(row.executionAddress)}`);

    expect(rowKeys).toEqual([
      `stable_member:${serializeTeamExecutionAddress(createTeamExecutionAddress({ rootTeamRunId: ROOT, memberAddress: solution.address }))}`,
      `stable_member:${serializeTeamExecutionAddress(createTeamExecutionAddress({ rootTeamRunId: ROOT, memberAddress: worker.address }))}`,
      `stable_member:${serializeTeamExecutionAddress(createTeamExecutionAddress({ rootTeamRunId: ROOT, memberAddress: softwareTeam.address }))}`,
      `stable_member:${serializeTeamExecutionAddress(createTeamExecutionAddress({ rootTeamRunId: ROOT, memberAddress: reviewLead.address }))}`,
      `transient_execution:${serializeTeamExecutionAddress(taskTeamAddress)}`,
      `transient_execution:${serializeTeamExecutionAddress(taskTeamChildAddress)}`,
      `transient_execution:${serializeTeamExecutionAddress(taskAgentAddress)}`,
    ]);
    expect(rows.find((row) => row.executionAddress.taskAgentRunId === 'task-agent-run-1')).toMatchObject({
      kind: 'transient_execution',
      transientKind: 'task_agent',
      depth: 1,
      currentStatus: AgentStatus.Running,
    });
    expect(rows.find((row) => serializeTeamExecutionAddress(row.executionAddress) === serializeTeamExecutionAddress(taskTeamAddress)))
      .toMatchObject({ kind: 'transient_execution', transientKind: 'task_team', depth: 1, hasChildren: true });
    expect(rows.find((row) => serializeTeamExecutionAddress(row.executionAddress) === serializeTeamExecutionAddress(taskTeamChildAddress)))
      .toMatchObject({ kind: 'transient_execution', transientKind: 'task_team_child', depth: 2 });
    const transientRow = rows.find((row) => row.executionAddress.taskAgentRunId === 'task-agent-run-1') as any;
    expect(transientRow.taskDescription).toBeUndefined();
    expect(transientRow.taskReferenceFiles).toBeUndefined();
  });

  it('falls back to stable rooted rows only when no live context exists', () => {
    const worker = stableRow('/worker', [stableRow('/worker/reviewer')], {
      kind: 'agent_team',
      teamDefinitionId: 'worker-team',
      teamRunIdForNode: 'worker-team-run',
      coordinatorAddress: '/worker/reviewer',
    });
    const rows = buildRunHistoryTeamExecutionRows(historyTeam([worker]) as any);

    expect(rows.map((row) => `${row.kind}:${row.memberAddress}:${row.depth}`)).toEqual([
      'stable_member:/worker:0',
      'stable_member:/worker/reviewer:1',
    ]);
  });
});
