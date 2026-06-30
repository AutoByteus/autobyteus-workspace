import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { buildWorkspaceTeamExecutionDisplayRows } from '../workspaceTeamExecutionDisplayRows';

const stableRow = (memberRouteKey: string, overrides: Record<string, any> = {}) => ({
  teamRunId: 'team-run-1',
  memberKind: 'agent',
  memberRouteKey,
  memberPath: memberRouteKey.split('/'),
  memberName: memberRouteKey.split('/').at(-1) || memberRouteKey,
  displayName: memberRouteKey.split('/').at(-1) || memberRouteKey,
  memberRunId: `${memberRouteKey}-run`,
  workspaceRootPath: '/workspace',
  summary: 'Team summary',
  lastActivityAt: '2026-06-30T00:00:00.000Z',
  currentStatus: AgentStatus.Idle,
  lastKnownStatus: 'ACTIVE',
  isActive: true,
  deleteLifecycle: 'READY',
  children: [],
  ...overrides,
});

describe('workspaceTeamExecutionDisplayRows', () => {
  it('preserves live placement while separating stable and transient execution rows', () => {
    const structuralTeamStable = stableRow('SoftwareEngineeringTeam', {
      memberKind: 'agent_team',
      memberName: 'Software Engineering Team',
      displayName: 'Software Engineering Team',
      teamDefinitionId: 'software-team',
      children: [stableRow('SoftwareEngineeringTeam/review_lead')],
    });
    const team = {
      teamRunId: 'team-run-1',
      teamDefinitionId: 'team-def',
      teamDefinitionName: 'Root Team',
      workspaceRootPath: '/workspace',
      summary: 'Team summary',
      lastActivityAt: '2026-06-30T00:00:00.000Z',
      lastKnownStatus: 'ACTIVE',
      isActive: true,
      currentStatus: 'running',
      deleteLifecycle: 'READY',
      focusedMemberRouteKey: 'worker',
      members: [],
      memberTree: [
        stableRow('solution_designer'),
        stableRow('worker'),
        structuralTeamStable,
      ],
    } as any;
    const taskAgentNode = {
      memberKind: 'agent',
      memberName: 'worker · task_0001',
      displayName: 'worker · task_0001',
      memberPath: ['worker', 'task-agent-run-1'],
      memberRouteKey: 'task-agent-run-1',
      memberRunId: 'task-agent-run-1',
      agentDefinitionId: 'worker-agent',
      isTaskAgentInstance: true,
      taskAgentRunId: 'task-agent-run-1',
      taskId: 'task_0001',
      taskDescription: 'This detail must stay out of Workspaces rows.',
      taskReferenceFiles: [{ referenceId: 'ref-1', path: '/tmp/ref.md', type: 'file' }],
      logicalMemberRouteKey: 'worker',
    };
    const taskTeamChildNode = {
      memberKind: 'agent',
      memberName: 'review_lead',
      displayName: 'review_lead',
      memberPath: ['task-team-run-1', 'review_lead'],
      memberRouteKey: 'task-team-run-1/review_lead',
      memberRunId: 'task-team-run-1::review_lead',
      agentDefinitionId: 'review-lead-agent',
      isTaskTeamChildProjection: true,
      parentTaskTeamRunId: 'task-team-run-1',
      currentStatus: AgentStatus.Idle,
    };
    const taskTeamNode = {
      memberKind: 'agent_team',
      memberName: 'Software Engineering Team · task_0002',
      displayName: 'Software Engineering Team · task_0002',
      memberPath: ['task-team-run-1'],
      memberRouteKey: 'task-team-run-1',
      memberRunId: 'task-team-run-1',
      teamDefinitionId: 'software-team',
      children: [taskTeamChildNode],
      isTaskTeamInstance: true,
      taskTeamRunId: 'task-team-run-1',
      taskId: 'task_0002',
      taskDescription: 'Team task details stay on the right.',
      currentStatus: AgentStatus.Running,
    };
    const teamContext = {
      teamRunId: 'team-run-1',
      memberTree: [
        { memberKind: 'agent', memberName: 'solution_designer', displayName: 'solution_designer', memberPath: ['solution_designer'], memberRouteKey: 'solution_designer', memberRunId: 'solution_designer-run', agentDefinitionId: 'solution' },
        { memberKind: 'agent', memberName: 'worker', displayName: 'worker', memberPath: ['worker'], memberRouteKey: 'worker', memberRunId: 'worker-run', agentDefinitionId: 'worker' },
        taskAgentNode,
        {
          memberKind: 'agent_team',
          memberName: 'Software Engineering Team',
          displayName: 'Software Engineering Team',
          memberPath: ['SoftwareEngineeringTeam'],
          memberRouteKey: 'SoftwareEngineeringTeam',
          memberRunId: 'software-team-run',
          teamDefinitionId: 'software-team',
          children: [
            { memberKind: 'agent', memberName: 'review_lead', displayName: 'review_lead', memberPath: ['SoftwareEngineeringTeam', 'review_lead'], memberRouteKey: 'SoftwareEngineeringTeam/review_lead', memberRunId: 'review-lead-run', agentDefinitionId: 'review-lead' },
          ],
        },
        taskTeamNode,
      ],
      leafAgentContextsByRouteKey: new Map([
        ['task-agent-run-1', { state: { currentStatus: AgentStatus.Running } }],
      ]),
    } as any;

    const rows = buildWorkspaceTeamExecutionDisplayRows({ team, teamContext });

    expect(rows.map((row) => `${row.kind}:${row.memberRouteKey}`)).toEqual([
      'stable_member:solution_designer',
      'stable_member:worker',
      'transient_execution:task-agent-run-1',
      'stable_member:SoftwareEngineeringTeam',
      'stable_member:SoftwareEngineeringTeam/review_lead',
      'transient_execution:task-team-run-1',
      'transient_execution:task-team-run-1/review_lead',
    ]);
    expect(rows.find((row) => row.memberRouteKey === 'task-agent-run-1')).toMatchObject({
      kind: 'transient_execution',
      transientKind: 'task_agent',
      depth: 1,
      currentStatus: AgentStatus.Running,
    });
    expect(rows.find((row) => row.memberRouteKey === 'task-team-run-1')).toMatchObject({
      kind: 'transient_execution',
      transientKind: 'task_team',
      depth: 0,
    });
    expect(rows.find((row) => row.memberRouteKey === 'task-team-run-1/review_lead')).toMatchObject({
      kind: 'transient_execution',
      transientKind: 'task_team_child',
      depth: 1,
    });
    const transientRow = rows.find((row) =>
      row.memberRouteKey === 'task-agent-run-1') as unknown as Record<string, unknown>;
    expect(transientRow.taskDescription).toBeUndefined();
    expect(transientRow.taskReferenceFiles).toBeUndefined();
  });

  it('falls back to stable rows only when no live context exists', () => {
    const team = {
      teamRunId: 'team-run-1',
      members: [],
      memberTree: [stableRow('worker', { children: [stableRow('worker/reviewer')] })],
    } as any;

    const rows = buildWorkspaceTeamExecutionDisplayRows({ team });

    expect(rows.map((row) => `${row.kind}:${row.memberRouteKey}:${row.depth}`)).toEqual([
      'stable_member:worker:0',
      'stable_member:worker/reviewer:1',
    ]);
  });
});
