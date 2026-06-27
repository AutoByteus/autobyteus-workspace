import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import { buildTeamRowsFromContext } from '../runHistoryTeamRows';

describe('runHistoryTeamRows', () => {
  it('builds stable live context rows while filtering transient task-run projections', () => {
    const routeKeys = [
      'solution_designer',
      'architecture_reviewer',
      'implementation_engineer',
      'code_reviewer',
      'api_e2e_engineer',
      'delivery_engineer',
    ];
    const taskAgentNode = {
      memberKind: 'agent',
      memberName: 'implementation_engineer · task_0001',
      displayName: 'implementation_engineer · task_0001',
      memberPath: ['implementation_engineer', 'task-agent-run-1'],
      memberRouteKey: 'task-agent-run-1',
      memberRunId: 'task-agent-run-1',
      agentDefinitionId: 'implementation_engineer-def',
      isTaskAgentInstance: true,
      taskAgentRunId: 'task-agent-run-1',
      taskId: 'task_0001',
      logicalMemberRouteKey: 'implementation_engineer',
    };
    const taskTeamChildNode = {
      memberKind: 'agent',
      memberName: 'implementation_engineer',
      displayName: 'implementation_engineer',
      memberPath: ['task-team-run-1', 'implementation_engineer'],
      memberRouteKey: 'task-team-run-1/implementation_engineer',
      memberRunId: null,
      agentDefinitionId: 'implementation_engineer-def',
      isTaskTeamChildProjection: true,
      parentTaskTeamRunId: 'task-team-run-1',
    };
    const taskTeamNode = {
      memberKind: 'agent_team',
      memberName: 'software_engineering_team · task_0002',
      displayName: 'software_engineering_team · task_0002',
      memberPath: ['task-team-run-1'],
      memberRouteKey: 'task-team-run-1',
      memberRunId: 'task-team-run-1',
      teamDefinitionId: 'software-team-def',
      children: [taskTeamChildNode],
      isTaskTeamInstance: true,
      taskTeamRunId: 'task-team-run-1',
      taskId: 'task_0002',
    };
    const teamContext = {
      teamRunId: 'team-software-engineering-1',
      currentStatus: AgentTeamStatus.Running,
      coordinatorMemberRouteKey: 'solution_designer',
      focusedMemberRouteKey: 'solution_designer',
      memberTree: [
        ...routeKeys.map((memberRouteKey) => ({
        memberKind: 'agent',
        memberName: memberRouteKey,
        displayName: memberRouteKey,
        memberPath: [memberRouteKey],
        memberRouteKey,
        memberRunId: `${memberRouteKey}-run`,
        agentDefinitionId: `${memberRouteKey}-def`,
        })),
        taskAgentNode,
        taskTeamNode,
      ],
      leafAgentContextsByRouteKey: new Map([
        [
          'solution_designer',
          {
            config: {
              agentDefinitionName: 'solution_designer',
              workspaceId: 'ws-1',
            },
            state: {
              runId: 'solution_designer-run',
              currentStatus: AgentStatus.Running,
              conversation: { createdAt: '2026-06-02T00:00:00.000Z', updatedAt: '2026-06-02T00:01:00.000Z' },
            },
          },
        ],
      ]),
    } as any;

    const rows = buildTeamRowsFromContext(
      teamContext,
      'summary',
      '2026-06-02T00:00:00.000Z',
      () => '/workspace',
    );

    expect(rows.map((row) => row.memberRouteKey)).toEqual(routeKeys);
    expect(rows.map((row) => row.displayName)).toEqual(routeKeys);
    expect(rows.flatMap((row) => [row.memberRouteKey, ...row.children.map((child) => child.memberRouteKey)])).not.toContain('task-agent-run-1');
    expect(rows.flatMap((row) => [row.memberRouteKey, ...row.children.map((child) => child.memberRouteKey)])).not.toContain('task-team-run-1');
    expect(rows[0]?.currentStatus).toBe(AgentStatus.Running);
    expect(rows.slice(1).every((row) => row.currentStatus === AgentStatus.Offline)).toBe(true);
  });

  it('uses membership labels instead of agent definition names for active team rows', () => {
    const teamContext = {
      teamRunId: 'team-1',
      currentStatus: AgentTeamStatus.Idle,
      focusedMemberRouteKey: 'program_manager',
      memberTree: [
        {
          memberKind: 'agent',
          memberName: 'program_manager',
          displayName: 'program_manager',
          memberPath: ['program_manager'],
          memberRouteKey: 'program_manager',
          memberRunId: 'program-manager-run',
          agentDefinitionId: 'nested-program-manager',
        },
        {
          memberKind: 'agent_team',
          memberName: 'BuildSquad',
          displayName: 'BuildSquad',
          memberPath: ['BuildSquad'],
          memberRouteKey: 'BuildSquad',
          memberRunId: 'build-squad-run',
          teamDefinitionId: 'build-squad',
          children: [
            {
              memberKind: 'agent',
              memberName: 'review_lead',
              displayName: 'review_lead',
              memberPath: ['BuildSquad', 'review_lead'],
              memberRouteKey: 'BuildSquad/review_lead',
              memberRunId: 'review-lead-run',
              agentDefinitionId: 'nested-review-lead',
            },
          ],
        },
      ],
      leafAgentContextsByRouteKey: new Map([
        [
          'program_manager',
          {
            config: {
              agentDefinitionName: 'Nested Program Manager Agent',
              workspaceId: 'ws-1',
            },
            state: {
              runId: 'program-manager-run',
              currentStatus: AgentStatus.Idle,
              conversation: { createdAt: '2026-05-13T00:00:00.000Z', updatedAt: '' },
            },
          },
        ],
        [
          'BuildSquad/review_lead',
          {
            config: {
              agentDefinitionName: 'Nested Review Lead Agent',
              workspaceId: 'ws-1',
            },
            state: {
              runId: 'review-lead-run',
              currentStatus: AgentStatus.Idle,
              conversation: { createdAt: '2026-05-13T00:00:00.000Z', updatedAt: '' },
            },
          },
        ],
      ]),
    } as any;

    const rows = buildTeamRowsFromContext(
      teamContext,
      'summary',
      '2026-05-13T00:00:00.000Z',
      () => '/workspace',
    );

    expect(rows[0]?.displayName).toBe('program_manager');
    expect(rows[1]?.displayName).toBe('BuildSquad');
    expect(rows[1]?.children[0]?.displayName).toBe('review_lead');
  });
});
