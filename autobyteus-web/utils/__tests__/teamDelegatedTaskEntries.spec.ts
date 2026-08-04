import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { ConversationTargetAddress } from '~/types/agent/ConversationTargetAddress';
import type { TaskDelegationRecord } from '~/stores/taskDelegationTypes';
import { deriveDelegatedTaskEntries } from '~/utils/teamDelegatedTaskEntries';

const memberAddress = (memberRouteKey: string): ConversationTargetAddress => ({
  segments: [{ kind: 'member', memberRouteKey }],
});

const taskTeamIngressAddress = (
  logicalTeamRouteKey: string,
  taskTeamRunId: string,
  ingressRouteKey: string,
): ConversationTargetAddress => ({
  segments: [
    { kind: 'member', memberRouteKey: logicalTeamRouteKey },
    { kind: 'task_team', taskTeamRunId },
    { kind: 'member', memberRouteKey: ingressRouteKey },
  ],
});

const taskRecord = (
  taskId: string,
  overrides: Partial<TaskDelegationRecord> = {},
): TaskDelegationRecord => ({
  taskId,
  status: 'active',
  senderAddress: memberAddress('coordinator'),
  receiverAddress: memberAddress('worker'),
  receiverTargetKind: 'member',
  content: `Task ${taskId}`,
  referenceFiles: [],
  taskRun: {
    address: {
      segments: [
        { kind: 'member', memberRouteKey: 'worker' },
        { kind: 'task_agent', taskAgentRunId: `${taskId}-run` },
      ],
    },
    startedAt: '2026-07-02T00:01:00.000Z',
  },
  updates: [],
  createdAt: '2026-07-02T00:00:00.000Z',
  ...overrides,
});

const teamContext = () => {
  const worker = {
    memberKind: 'agent',
    memberName: 'worker',
    displayName: 'worker',
    memberPath: ['worker'],
    memberRouteKey: 'worker',
    memberRunId: 'worker-run',
    agentDefinitionId: 'worker-agent',
    currentStatus: AgentStatus.Idle,
  };
  const taskAgent = {
    memberKind: 'agent',
    memberName: 'worker · task_0001',
    displayName: 'worker · task_0001',
    memberPath: ['worker', 'task_0001-run'],
    memberRouteKey: 'task_0001-run',
    memberRunId: 'task_0001-run',
    agentDefinitionId: 'worker-agent',
    isTaskAgentInstance: true,
    taskAgentRunId: 'task_0001-run',
    taskId: 'task_0001',
    taskDescription: 'Live worker task',
    logicalMemberRouteKey: 'worker',
  };
  const taskTeam = {
    memberKind: 'agent_team',
    memberName: 'design_team · task_0002',
    displayName: 'design_team · task_0002',
    memberPath: ['task-team-run'],
    memberRouteKey: 'task-team-run',
    memberRunId: 'task-team-run',
    teamDefinitionId: 'design-team-def',
    teamRunId: 'task-team-run',
    children: [],
    isTaskTeamInstance: true,
    taskTeamRunId: 'task-team-run',
    taskId: 'task_0002',
    taskDescription: 'Live team task',
    logicalTeamRouteKey: 'design_team',
    logicalTeamPath: ['design_team'],
  };

  return {
    teamRunId: 'root-team-run',
    memberTree: [worker, taskAgent, taskTeam],
    memberNodesByRouteKey: new Map<string, any>([
      ['worker', worker],
      ['task_0001-run', taskAgent],
      ['task-team-run', taskTeam],
    ]),
    leafAgentContextsByRouteKey: new Map<string, any>([
      ['task_0001-run', { state: { currentStatus: AgentStatus.Running } }],
    ]),
    focusedMemberRouteKey: 'worker',
  } as any;
};

describe('deriveDelegatedTaskEntries', () => {
  it('filters persisted task records by focused sender or receiver address', () => {
    const context = teamContext();
    const records = [
      taskRecord('task_0001'),
      taskRecord('task_0009', {
        senderAddress: memberAddress('other-sender'),
        receiverAddress: memberAddress('other-receiver'),
      }),
    ];

    expect(deriveDelegatedTaskEntries(context, records, memberAddress('coordinator')).map((entry) => entry.taskId))
      .toEqual(['task_0001']);
    expect(deriveDelegatedTaskEntries(context, records, memberAddress('worker')).map((entry) => entry.taskId))
      .toEqual(['task_0001']);
  });

  it('matches team-target records by the exact task-team ingress receiver address and only enriches from live nodes', () => {
    const context = teamContext();
    const ingressAddress = taskTeamIngressAddress('design_team', 'task-team-run', 'team_lead');
    const records = [
      taskRecord('task_0002', {
        receiverAddress: ingressAddress,
        receiverTargetKind: 'team',
        taskRun: {
          address: {
            segments: [
              { kind: 'member', memberRouteKey: 'design_team' },
              { kind: 'task_team', taskTeamRunId: 'task-team-run' },
            ],
          },
          startedAt: '2026-07-02T00:01:00.000Z',
        },
      }),
    ];

    const byIngress = deriveDelegatedTaskEntries(context, records, ingressAddress);
    expect(byIngress).toHaveLength(1);
    expect(byIngress[0]).toMatchObject({
      taskId: 'task_0002',
      kind: 'task_team',
      node: expect.objectContaining({ taskTeamRunId: 'task-team-run' }),
      persistedRecord: expect.objectContaining({ receiverTargetKind: 'team' }),
    });
    expect(deriveDelegatedTaskEntries(context, records, memberAddress('design_team'))).toEqual([]);
  });

  it('classifies child-context member task records by their final task-agent execution segment', () => {
    const context = teamContext();
    const childWorkerAddress: ConversationTargetAddress = {
      segments: [
        { kind: 'member', memberRouteKey: 'design_team' },
        { kind: 'task_team', taskTeamRunId: 'task-team-run' },
        { kind: 'member', memberRouteKey: 'worker' },
      ],
    };
    const records = [
      taskRecord('task_0010', {
        senderAddress: {
          segments: [
            { kind: 'member', memberRouteKey: 'design_team' },
            { kind: 'task_team', taskTeamRunId: 'task-team-run' },
            { kind: 'member', memberRouteKey: 'team_lead' },
          ],
        },
        receiverAddress: childWorkerAddress,
        receiverTargetKind: 'member',
        taskRun: {
          address: {
            segments: [
              { kind: 'member', memberRouteKey: 'design_team' },
              { kind: 'task_team', taskTeamRunId: 'task-team-run' },
              { kind: 'member', memberRouteKey: 'worker' },
              { kind: 'task_agent', taskAgentRunId: 'child-task-agent-run' },
            ],
          },
          startedAt: '2026-07-02T00:01:00.000Z',
        },
      }),
    ];

    expect(deriveDelegatedTaskEntries(context, records, childWorkerAddress)).toEqual([
      expect.objectContaining({
        taskId: 'task_0010',
        kind: 'task_agent',
        runId: 'child-task-agent-run',
        taskTargetKind: 'member',
      }),
    ]);
  });
});
