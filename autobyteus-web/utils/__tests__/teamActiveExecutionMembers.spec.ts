import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import {
  flattenActiveExecutionMemberNodesForDisplay,
  resolveActiveExecutionFocusedMemberRouteKey,
} from '../teamActiveExecutionMembers';

const buildMemberNode = (memberRouteKey: string, displayName = memberRouteKey, overrides: Record<string, any> = {}) => ({
  memberKind: 'agent',
  memberName: memberRouteKey.split('/').at(-1) || memberRouteKey,
  displayName,
  memberPath: memberRouteKey.split('/'),
  memberRouteKey,
  agentDefinitionId: `${memberRouteKey}-def`,
  ...overrides,
});

const buildContext = (runId: string, status: AgentStatus, messages: any[] = []) => ({
  state: {
    runId,
    currentStatus: status,
    conversation: {
      id: runId,
      createdAt: '2026-06-02T00:00:00.000Z',
      updatedAt: '2026-06-02T00:00:00.000Z',
      messages,
    },
  },
  conversation: {
    id: runId,
    createdAt: '2026-06-02T00:00:00.000Z',
    updatedAt: '2026-06-02T00:00:00.000Z',
    messages,
  },
});

const buildTeamContext = (workerContext = buildContext('worker-run', AgentStatus.Offline), extraNodes: any[] = [], extraContexts: Array<[string, any]> = []) => {
  const coordinatorNode = buildMemberNode('coordinator', 'Coordinator');
  const workerNode = buildMemberNode('worker', 'Worker');
  const memberTree = [coordinatorNode, workerNode, ...extraNodes];
  return {
    teamRunId: 'team-active-execution-1',
    coordinatorMemberRouteKey: 'coordinator',
    focusedMemberRouteKey: 'worker',
    memberTree,
    memberNodesByRouteKey: new Map(memberTree.map((node) => [node.memberRouteKey, node])),
    leafAgentContextsByRouteKey: new Map([
      ['coordinator', buildContext('coordinator-run', AgentStatus.Running)],
      ['worker', workerContext],
      ...extraContexts,
    ]),
  } as any;
};

const routeKeys = (teamContext: any) =>
  flattenActiveExecutionMemberNodesForDisplay(teamContext).map((entry) => entry.node.memberRouteKey);

describe('teamActiveExecutionMembers', () => {
  it('falls back from a settled task-agent-only logical member to the coordinator for active execution', () => {
    const worker = buildContext('worker-run', AgentStatus.Offline, [
      {
        type: 'user',
        text: 'You have been activated as task agent for task_0001.',
        timestamp: new Date('2026-06-02T00:00:00.000Z'),
      },
    ]);
    const teamContext = buildTeamContext(worker);

    expect(routeKeys(teamContext)).toEqual(['coordinator']);
    expect(resolveActiveExecutionFocusedMemberRouteKey(teamContext, 'worker')).toBe('coordinator');
  });

  it('keeps a logical parent visible while its concrete task-agent child is active', () => {
    const taskAgentNode = buildMemberNode('team-1__worker__task_0001', 'Worker · task_0001', {
      memberPath: ['worker', 'team-1__worker__task_0001'],
      memberRunId: 'team-1__worker__task_0001',
      isTaskAgentInstance: true,
      taskAgentRunId: 'team-1__worker__task_0001',
      taskId: 'task_0001',
      logicalMemberRouteKey: 'worker',
    });
    const teamContext = buildTeamContext(
      buildContext('worker-run', AgentStatus.Offline),
      [taskAgentNode],
      [['team-1__worker__task_0001', buildContext('team-1__worker__task_0001', AgentStatus.Running)]],
    );

    expect(routeKeys(teamContext)).toEqual(['coordinator', 'worker', 'team-1__worker__task_0001']);
    expect(resolveActiveExecutionFocusedMemberRouteKey(teamContext, 'team-1__worker__task_0001')).toBe('team-1__worker__task_0001');
  });

  it('does not treat a task-agent-only logical member conversation as active execution', () => {
    const taskOnlyWorker = buildContext('worker-run', AgentStatus.Initializing, [
      {
        type: 'user',
        text: 'Task-agent run: opaque-run-id',
        timestamp: new Date('2026-06-02T00:00:00.000Z'),
      },
    ]);
    const teamContext = buildTeamContext(taskOnlyWorker);

    expect(routeKeys(teamContext)).toEqual(['coordinator']);
    expect(resolveActiveExecutionFocusedMemberRouteKey(teamContext, 'worker')).toBe('coordinator');
  });

  it('keeps a direct logical member conversation visible after the member is offline', () => {
    const worker = buildContext('worker-run', AgentStatus.Offline, [
      {
        type: 'user',
        text: 'direct member follow-up',
        timestamp: new Date('2026-06-02T00:00:00.000Z'),
      },
    ]);
    const teamContext = buildTeamContext(worker);

    expect(routeKeys(teamContext)).toEqual(['coordinator', 'worker']);
  });

  it('includes task-team roots, scoped child projections, and nested task agents together', () => {
    const scopedChild = buildMemberNode('task-team-run-1/worker', 'Worker', {
      memberPath: ['task-team-run-1', 'worker'],
      isTaskTeamChildProjection: true,
      parentTaskTeamRunId: 'task-team-run-1',
      taskTeamRelativeMemberRouteKey: 'worker',
    });
    const nestedTaskAgent = buildMemberNode('task-agent-run-inside-team', 'Worker · nested task', {
      memberPath: ['task-team-run-1', 'worker', 'task-agent-run-inside-team'],
      memberRunId: 'task-agent-run-inside-team',
      isTaskAgentInstance: true,
      taskAgentRunId: 'task-agent-run-inside-team',
      taskId: 'task_nested',
      logicalMemberRouteKey: 'task-team-run-1/worker',
      parentTaskTeamRunId: 'task-team-run-1',
    });
    const taskTeamRoot = {
      memberKind: 'agent_team',
      memberName: 'SoftwareTeam task',
      displayName: 'SoftwareTeam task',
      memberPath: ['task-team-run-1'],
      memberRouteKey: 'task-team-run-1',
      memberRunId: 'task-team-run-1',
      teamDefinitionId: 'software-team',
      teamRunId: 'task-team-run-1',
      children: [scopedChild, nestedTaskAgent],
      isTaskTeamInstance: true,
      taskTeamRunId: 'task-team-run-1',
      taskExecutionStatus: 'active',
      currentStatus: AgentStatus.Running,
    };
    const teamContext = buildTeamContext(
      buildContext('worker-run', AgentStatus.Offline),
      [taskTeamRoot],
      [
        ['task-team-run-1/worker', buildContext('task-team-run-1/worker', AgentStatus.Offline)],
        ['task-agent-run-inside-team', buildContext('task-agent-run-inside-team', AgentStatus.Running)],
      ],
    );

    expect(routeKeys(teamContext)).toEqual([
      'coordinator',
      'task-team-run-1',
      'task-team-run-1/worker',
      'task-agent-run-inside-team',
    ]);
  });
});
