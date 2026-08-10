import { describe, expect, it } from 'vitest';
import { handleTaskExecutionProjectionMessage } from '../teamTaskExecutionEventRouter';
import { restoreTaskExecutionProjections } from '../teamTaskExecutionRestore';
import {
  findTeamExecutionNode,
  removeTaskExecutionProjection,
} from '../teamTaskExecutionTree';
import { extractTaskTeamIdentity } from '../teamTaskTeamExecutionProjection';
import { deriveDelegatedTaskEntries } from '~/utils/teamDelegatedTaskEntries';
import { buildWorkspaceTeamExecutionDisplayRows } from '~/utils/workspaceTeamExecutionDisplayRows';
import type { TaskDelegationRecord } from '~/stores/taskDelegationTypes';
import { createTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import {
  buildCurrentTaskExecutionTeam,
  currentTaskExecutionRootTeamRunId,
  taskAgentAddress,
  taskAgentEvent,
  taskTeamEvent,
} from './currentTaskExecutionFixture';

const outerRootAddress = () => createTeamExecutionAddress({
  rootTeamRunId: currentTaskExecutionRootTeamRunId,
  taskTeamRunIds: ['task-team-outer'],
  memberAddress: '/StudentStudyGroup',
  taskAgentRunId: null,
});

const innerRootAddress = () => createTeamExecutionAddress({
  rootTeamRunId: currentTaskExecutionRootTeamRunId,
  taskTeamRunIds: ['task-team-outer', 'task-team-inner'],
  memberAddress: '/StudentStudyGroup/LabGroup',
  taskAgentRunId: null,
});

const record = (input: {
  taskId: string;
  status: 'active' | 'awaiting_review' | 'accepted';
  receiverAddress: string;
  receiverTargetKind: 'agent' | 'agent_team';
  taskRunAddress: ReturnType<typeof createTeamExecutionAddress>;
  createdAt: string;
}): TaskDelegationRecord => ({
  taskId: input.taskId,
  status: input.status,
  senderAddress: createTeamExecutionAddress({
    rootTeamRunId: currentTaskExecutionRootTeamRunId,
    memberAddress: '/Teacher',
  }),
  receiverAddress: createTeamExecutionAddress({
    rootTeamRunId: currentTaskExecutionRootTeamRunId,
    memberAddress: input.receiverAddress,
  }),
  receiverTargetKind: input.receiverTargetKind,
  content: `Persisted ${input.taskId}`,
  referenceFiles: [],
  taskRun: { address: input.taskRunAddress, startedAt: input.createdAt },
  updates: [],
  createdAt: input.createdAt,
});

describe('teamTaskTeamExecutionProjection current exact execution tree', () => {
  it('materializes a distinct task Team root and children with visible task details', () => {
    const team = buildCurrentTaskExecutionTeam();
    const event = taskTeamEvent();
    const address = outerRootAddress();
    const persistentGroup = team.memberNodesByAddress.get('/StudentStudyGroup');

    expect(extractTaskTeamIdentity(event as any)).toEqual({ executionAddress: address });
    expect(handleTaskExecutionProjectionMessage(team, event as any)).toMatchObject({
      outcome: 'handled',
      cleanupExecutionAddress: null,
    });

    const root = findTeamExecutionNode(team, address);
    const child = findTeamExecutionNode(team, createTeamExecutionAddress({
      rootTeamRunId: team.teamRunId,
      taskTeamRunIds: ['task-team-outer'],
      memberAddress: '/StudentStudyGroup/student_one',
      taskAgentRunId: null,
    }));
    expect(root).toMatchObject({
      kind: 'agent_team',
      address: '/StudentStudyGroup',
      teamRunId: 'task-team-outer',
      isTaskExecution: true,
      taskId: 'task-team-outer-0001',
      taskDescription: 'Coordinate the study-group exercise.',
      taskTargetKind: 'agent_team',
      taskExecutionStatus: 'active',
    });
    expect(root).not.toBe(persistentGroup);
    expect(child).toMatchObject({
      kind: 'agent',
      address: '/StudentStudyGroup/student_one',
      isTaskExecution: true,
      executionAddress: {
        taskTeamRunIds: ['task-team-outer'],
        memberAddress: '/StudentStudyGroup/student_one',
      },
    });
    expect(child).not.toHaveProperty('taskId');
    expect(deriveDelegatedTaskEntries(team)).toEqual([
      expect.objectContaining({
        kind: 'task_team',
        taskId: 'task-team-outer-0001',
        taskDescription: 'Coordinate the study-group exercise.',
        runId: 'task-team-outer',
        statusLabel: 'Active',
      }),
    ]);
  });

  it('keeps exact ordered outer and nested task-Team identities and cleans up only the selected subtree', () => {
    const team = buildCurrentTaskExecutionTeam();
    handleTaskExecutionProjectionMessage(team, taskTeamEvent() as any);
    const nested = handleTaskExecutionProjectionMessage(team, taskTeamEvent({ nested: true }) as any);

    expect(nested).toMatchObject({ outcome: 'handled', cleanupExecutionAddress: null });
    expect(findTeamExecutionNode(team, innerRootAddress())).toMatchObject({
      kind: 'agent_team',
      teamRunId: 'task-team-inner',
      taskId: 'task-team-inner-0002',
      executionAddress: {
        taskTeamRunIds: ['task-team-outer', 'task-team-inner'],
        memberAddress: '/StudentStudyGroup/LabGroup',
      },
    });
    expect(findTeamExecutionNode(team, createTeamExecutionAddress({
      rootTeamRunId: team.teamRunId,
      taskTeamRunIds: ['task-team-inner', 'task-team-outer'],
      memberAddress: '/StudentStudyGroup/LabGroup',
      taskAgentRunId: null,
    }))).toBeNull();

    const accepted = handleTaskExecutionProjectionMessage(team, taskTeamEvent({ nested: true, status: 'accepted' }) as any);
    expect(accepted).toMatchObject({ outcome: 'handled', cleanupExecutionAddress: innerRootAddress() });
    removeTaskExecutionProjection(team, innerRootAddress());
    expect(findTeamExecutionNode(team, innerRootAddress())).toBeNull();
    expect(findTeamExecutionNode(team, outerRootAddress())).not.toBeNull();
    expect(team.memberNodesByAddress.get('/StudentStudyGroup/LabGroup')).toMatchObject({
      kind: 'agent_team',
      teamRunId: 'lab-group-persistent-run',
    });
  });

  it('restores active and awaiting-review task executions in depth order and excludes accepted records', () => {
    const team = buildCurrentTaskExecutionTeam();
    const outer = record({
      taskId: 'task-team-outer-0001',
      status: 'active',
      receiverAddress: '/StudentStudyGroup',
      receiverTargetKind: 'agent_team',
      taskRunAddress: outerRootAddress(),
      createdAt: '2026-08-10T12:00:00.000Z',
    });
    const nested = record({
      taskId: 'task-team-inner-0002',
      status: 'awaiting_review',
      receiverAddress: '/StudentStudyGroup/LabGroup',
      receiverTargetKind: 'agent_team',
      taskRunAddress: innerRootAddress(),
      createdAt: '2026-08-10T12:01:00.000Z',
    });
    const acceptedAddress = taskAgentAddress({ taskAgentRunId: 'accepted-task-agent' });
    const accepted = record({
      taskId: 'accepted-task-agent-0003',
      status: 'accepted',
      receiverAddress: '/Teacher',
      receiverTargetKind: 'agent',
      taskRunAddress: acceptedAddress,
      createdAt: '2026-08-10T12:02:00.000Z',
    });

    restoreTaskExecutionProjections(team, [nested, accepted, outer]);
    restoreTaskExecutionProjections(team, [nested, accepted, outer]);

    expect(findTeamExecutionNode(team, outerRootAddress())).toMatchObject({
      taskId: 'task-team-outer-0001',
      taskExecutionStatus: 'active',
      taskTimeline: [expect.objectContaining({ eventType: 'TASK_DELEGATION_RESTORED' })],
    });
    expect(findTeamExecutionNode(team, innerRootAddress())).toMatchObject({
      taskId: 'task-team-inner-0002',
      taskExecutionStatus: 'awaiting_review',
      taskTimeline: [expect.objectContaining({ eventType: 'TASK_DELEGATION_RESTORED' })],
    });
    expect(findTeamExecutionNode(team, acceptedAddress)).toBeNull();
    expect(deriveDelegatedTaskEntries(team).map((entry) => [entry.taskId, entry.statusLabel])).toEqual([
      ['task-team-outer-0001', 'Active'],
      ['task-team-inner-0002', 'Awaiting review'],
    ]);
  });

  it('builds separately selectable UI rows for outer/nested task Teams and a task Agent', () => {
    const team = buildCurrentTaskExecutionTeam();
    handleTaskExecutionProjectionMessage(team, taskTeamEvent() as any);
    handleTaskExecutionProjectionMessage(team, taskTeamEvent({ nested: true }) as any);
    const agentAddress = taskAgentAddress({
      memberAddress: '/StudentStudyGroup/student_two',
      taskTeamRunIds: ['task-team-outer'],
      taskAgentRunId: 'task-agent-inside-team-run-2',
    });
    handleTaskExecutionProjectionMessage(team, taskAgentEvent({ address: agentAddress }) as any);
    const toHistoryRow = (node: any): any => ({
      kind: node.kind,
      memberAddress: node.address,
      displayName: node.displayName,
      teamRunId: team.teamRunId,
      children: node.kind === 'agent_team' ? node.children.map(toHistoryRow) : [],
    });
    const rows = buildWorkspaceTeamExecutionDisplayRows({
      team: {
        rootTeam: {
          children: team.rootTeam.children.filter((node) => !node.isTaskExecution).map(toHistoryRow),
        },
        members: [],
      } as any,
      teamContext: team,
    });
    const transient = rows.filter((row) => row.rowKind === 'transient_execution');

    expect(transient).toEqual(expect.arrayContaining([
      expect.objectContaining({
        transientKind: 'task_team',
        executionAddress: outerRootAddress(),
      }),
      expect.objectContaining({
        transientKind: 'task_team',
        executionAddress: innerRootAddress(),
      }),
      expect.objectContaining({
        transientKind: 'task_agent',
        executionAddress: agentAddress,
      }),
    ]));
    for (const row of transient) {
      expect(findTeamExecutionNode(team, row.executionAddress)).not.toBeNull();
    }
    team.focusedExecutionAddress = innerRootAddress();
    expect(findTeamExecutionNode(team, team.focusedExecutionAddress)).toMatchObject({
      kind: 'agent_team',
      taskId: 'task-team-inner-0002',
    });
  });
});
