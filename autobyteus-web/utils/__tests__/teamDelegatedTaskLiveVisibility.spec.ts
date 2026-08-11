import { describe, expect, it } from 'vitest';
import { handleTaskExecutionProjectionMessage } from '~/services/agentStreaming/teamTaskExecutionEventRouter';
import {
  buildCurrentTaskExecutionTeam,
  taskAgentAddress,
  taskAgentEvent,
  taskTeamCoordinatorAddress,
  taskTeamEvent,
} from '~/services/agentStreaming/__tests__/currentTaskExecutionFixture';
import { findTeamExecutionNode } from '~/services/agentStreaming/teamTaskExecutionTree';
import { createTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import { deriveDelegatedTaskEntries } from '~/utils/teamDelegatedTaskEntries';
import type { TaskDelegationRecord } from '~/stores/taskDelegationTypes';

describe('deriveDelegatedTaskEntries live task visibility', () => {
  it('relates a task Agent to its stable logical placement without relaxing concrete identity', () => {
    const team = buildCurrentTaskExecutionTeam();
    const executionAddress = taskAgentAddress();
    expect(handleTaskExecutionProjectionMessage(team, taskAgentEvent() as any)).toMatchObject({ outcome: 'handled' });

    expect(deriveDelegatedTaskEntries(team, [], team.focusedExecutionAddress).map((entry) => entry.taskId))
      .toEqual(['task-agent-0001']);
    expect(deriveDelegatedTaskEntries(team, [], createTeamExecutionAddress({
      rootTeamRunId: team.teamRunId,
      memberAddress: '/StudentStudyGroup/student_two',
    }))).toEqual([]);
    expect(deriveDelegatedTaskEntries(team, [], createTeamExecutionAddress({
      rootTeamRunId: team.teamRunId,
      taskTeamRunIds: ['task-team-outer'],
      memberAddress: executionAddress.memberAddress,
    }))).toEqual([]);
    expect(deriveDelegatedTaskEntries(team, [], createTeamExecutionAddress({
      rootTeamRunId: 'foreign-root',
      memberAddress: executionAddress.memberAddress,
    }))).toEqual([]);

    const taskNode = findTeamExecutionNode(team, executionAddress);
    expect(taskNode?.kind).toBe('agent');
    if (taskNode?.kind === 'agent') taskNode.agentRunId = 'mismatched-task-agent-run';
    expect(deriveDelegatedTaskEntries(team, [], team.focusedExecutionAddress)).toEqual([]);
  });

  it('relates a task Team only to the same logical Team in its exact parent scope', () => {
    const team = buildCurrentTaskExecutionTeam();
    expect(handleTaskExecutionProjectionMessage(team, taskTeamEvent() as any)).toMatchObject({ outcome: 'handled' });
    const focus = createTeamExecutionAddress({
      rootTeamRunId: team.teamRunId,
      memberAddress: '/StudentStudyGroup',
    });

    expect(deriveDelegatedTaskEntries(team, [], focus).map((entry) => entry.taskId))
      .toEqual(['task-team-outer-0001']);
    expect(deriveDelegatedTaskEntries(team, [], createTeamExecutionAddress({
      rootTeamRunId: team.teamRunId,
      memberAddress: '/StudentStudyGroup/LabGroup',
    }))).toEqual([]);
    expect(deriveDelegatedTaskEntries(team, [], createTeamExecutionAddress({
      rootTeamRunId: team.teamRunId,
      taskTeamRunIds: ['task-team-outer'],
      memberAddress: '/StudentStudyGroup',
    }))).toEqual([]);
  });

  it('preserves a distinct focused sender before refresh and pairs the exact ingress record without duplication', () => {
    const team = buildCurrentTaskExecutionTeam();
    const senderAddress = createTeamExecutionAddress({
      rootTeamRunId: team.teamRunId,
      memberAddress: '/Teacher',
    });
    expect(handleTaskExecutionProjectionMessage(team, taskTeamEvent({ senderAddress }) as any))
      .toMatchObject({ outcome: 'handled' });

    const taskAddress = createTeamExecutionAddress({
      rootTeamRunId: team.teamRunId,
      taskTeamRunIds: ['task-team-outer'],
      memberAddress: '/StudentStudyGroup',
    });
    const taskNode = findTeamExecutionNode(team, taskAddress);
    expect(taskNode?.taskSenderAddress).toEqual(senderAddress);

    const beforeRefresh = deriveDelegatedTaskEntries(team, [], senderAddress);
    expect(beforeRefresh).toHaveLength(1);
    expect(beforeRefresh[0]).toMatchObject({
      entryKey: 'task:task-team-outer-0001',
      taskId: 'task-team-outer-0001',
      persistedRecord: null,
    });

    const record: TaskDelegationRecord = {
      taskId: 'task-team-outer-0001',
      status: 'active',
      senderAddress,
      receiverAddress: taskTeamCoordinatorAddress(),
      receiverTargetKind: 'agent_team',
      content: 'Coordinate the study-group exercise.',
      referenceFiles: [],
      taskRun: { address: taskAddress, startedAt: '2026-08-10T12:00:00.000Z' },
      updates: [],
      createdAt: '2026-08-10T12:00:00.000Z',
    };
    const afterRefresh = deriveDelegatedTaskEntries(team, [record], senderAddress);
    expect(afterRefresh).toHaveLength(1);
    expect(afterRefresh[0]).toMatchObject({
      entryKey: 'task:task-team-outer-0001',
      taskId: 'task-team-outer-0001',
      node: expect.objectContaining({ teamRunId: 'task-team-outer' }),
      persistedRecord: record,
    });
  });

  it('relates a chained task only to the exact active task-Agent sender identity', () => {
    const team = buildCurrentTaskExecutionTeam();
    const senderAddress = taskAgentAddress();
    expect(handleTaskExecutionProjectionMessage(team, taskAgentEvent({ address: senderAddress }) as any))
      .toMatchObject({ outcome: 'handled' });
    expect(handleTaskExecutionProjectionMessage(team, taskTeamEvent({ senderAddress }) as any))
      .toMatchObject({ outcome: 'handled' });

    expect(deriveDelegatedTaskEntries(team, [], senderAddress).map((entry) => entry.taskId))
      .toEqual(['task-team-outer-0001']);
    expect(deriveDelegatedTaskEntries(team, [], createTeamExecutionAddress({
      ...senderAddress,
      taskAgentRunId: 'foreign-task-agent-run',
    }))).toEqual([]);
  });

  it('drops a task event whose sender address contains a removed identity field', () => {
    const team = buildCurrentTaskExecutionTeam();
    const event = taskTeamEvent() as any;
    event.payload.senderAddress = {
      ...event.payload.senderAddress,
      memberPath: ['Teacher'],
    };

    expect(handleTaskExecutionProjectionMessage(team, event)).toMatchObject({
      outcome: 'drop',
      reason: 'Task delegation event details are invalid.',
    });
    expect(deriveDelegatedTaskEntries(team, [], team.focusedExecutionAddress)).toEqual([]);
  });

  it('rejects sender visibility when root, ordered parent scope, placement, or typed task identity mismatches', () => {
    const team = buildCurrentTaskExecutionTeam();
    const senderAddress = createTeamExecutionAddress({
      rootTeamRunId: team.teamRunId,
      memberAddress: '/Teacher',
    });
    expect(handleTaskExecutionProjectionMessage(team, taskTeamEvent() as any))
      .toMatchObject({ outcome: 'handled' });
    expect(handleTaskExecutionProjectionMessage(team, taskTeamEvent({ nested: true }) as any))
      .toMatchObject({ outcome: 'handled' });
    const outerTaskNode = findTeamExecutionNode(team, createTeamExecutionAddress({
      rootTeamRunId: team.teamRunId,
      taskTeamRunIds: ['task-team-outer'],
      memberAddress: '/StudentStudyGroup',
    }));
    if (outerTaskNode) outerTaskNode.taskId = null;
    const nestedAddress = createTeamExecutionAddress({
      rootTeamRunId: team.teamRunId,
      taskTeamRunIds: ['task-team-outer', 'task-team-inner'],
      memberAddress: '/StudentStudyGroup/LabGroup',
    });
    const nestedTaskNode = findTeamExecutionNode(team, nestedAddress);
    expect(nestedTaskNode?.taskSenderAddress?.taskTeamRunIds).toEqual(['task-team-outer']);
    expect(deriveDelegatedTaskEntries(team, [], senderAddress)).toEqual([]);

    const foreignSender = createTeamExecutionAddress({
      rootTeamRunId: 'foreign-root',
      taskTeamRunIds: ['task-team-outer'],
      memberAddress: '/StudentStudyGroup/student_one',
    });
    if (nestedTaskNode) nestedTaskNode.taskSenderAddress = foreignSender;
    expect(deriveDelegatedTaskEntries(team, [], foreignSender)).toEqual([]);

    if (nestedTaskNode) nestedTaskNode.taskSenderAddress = createTeamExecutionAddress({
      rootTeamRunId: team.teamRunId,
      taskTeamRunIds: ['task-team-outer'],
      memberAddress: '/Teacher',
    });
    const taskScopedTeacher = createTeamExecutionAddress({
      rootTeamRunId: team.teamRunId,
      taskTeamRunIds: ['task-team-outer'],
      memberAddress: '/Teacher',
    });
    expect(deriveDelegatedTaskEntries(team, [], taskScopedTeacher)).toEqual([]);

    if (nestedTaskNode?.kind === 'agent_team') nestedTaskNode.teamRunId = 'wrong-inner-run';
    expect(deriveDelegatedTaskEntries(team, [], createTeamExecutionAddress({
      rootTeamRunId: team.teamRunId,
      taskTeamRunIds: ['task-team-outer'],
      memberAddress: '/StudentStudyGroup/student_one',
    }))).toEqual([]);
  });

  it('requires the exact ordered parent chain for a nested task Team', () => {
    const team = buildCurrentTaskExecutionTeam();
    expect(handleTaskExecutionProjectionMessage(team, taskTeamEvent() as any)).toMatchObject({ outcome: 'handled' });
    expect(handleTaskExecutionProjectionMessage(team, taskTeamEvent({ nested: true }) as any))
      .toMatchObject({ outcome: 'handled' });
    const focus = createTeamExecutionAddress({
      rootTeamRunId: team.teamRunId,
      taskTeamRunIds: ['task-team-outer'],
      memberAddress: '/StudentStudyGroup/LabGroup',
    });

    expect(deriveDelegatedTaskEntries(team, [], focus).map((entry) => entry.taskId))
      .toEqual(['task-team-inner-0002']);
    expect(deriveDelegatedTaskEntries(team, [], createTeamExecutionAddress({
      ...focus,
      taskTeamRunIds: ['foreign-task-team'],
    }))).toEqual([]);
    expect(deriveDelegatedTaskEntries(team, [], createTeamExecutionAddress({
      ...focus,
      rootTeamRunId: 'foreign-root',
    }))).toEqual([]);

    const nestedAddress = createTeamExecutionAddress({
      rootTeamRunId: team.teamRunId,
      taskTeamRunIds: ['task-team-outer', 'task-team-inner'],
      memberAddress: '/StudentStudyGroup/LabGroup',
    });
    const nestedTaskNode = findTeamExecutionNode(team, nestedAddress);
    expect(nestedTaskNode?.kind).toBe('agent_team');
    if (nestedTaskNode?.kind === 'agent_team') nestedTaskNode.teamRunId = 'mismatched-task-team-run';
    expect(deriveDelegatedTaskEntries(team, [], focus)).toEqual([]);
  });
});
