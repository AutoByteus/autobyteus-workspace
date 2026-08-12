import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { createTeamExecutionAddress, toTeamExecutionAddressDto } from '~/types/agent/TeamExecutionAddress';
import type { TeamTaskProjection } from '../teamExecutionModels';
import { reconcileTestTaskSnapshot } from '~/test-support/currentTeamTestFixtures';
import {
  buildCurrentTaskExecutionTeam,
  currentTaskExecutionRootTeamRunId,
  taskAgentAddress,
  taskAgentEvent,
  taskAgentProjection,
  taskTeamCoordinatorAddress,
  taskTeamExecutionAddress,
  taskTeamProjection,
} from '~/services/agentStreaming/__tests__/currentTaskExecutionFixture';

const submission = (task: TeamTaskProjection): TeamTaskProjection => Object.freeze({
  ...task,
  status: 'awaiting_review',
  updatedAt: '2026-08-10T12:01:00.000Z',
  updates: Object.freeze([Object.freeze({
    kind: 'submission' as const,
    submissionId: `${task.taskId}-submission`,
    senderAddress: task.executionAddress,
    receiverAddress: task.senderAddress,
    content: 'Completed result',
    createdAt: '2026-08-10T12:01:00.000Z',
    referenceFiles: Object.freeze([]),
  })]),
});

const accepted = (task: TeamTaskProjection): TeamTaskProjection => {
  const awaiting = submission(task);
  return Object.freeze({
    ...awaiting,
    status: 'accepted',
    updatedAt: '2026-08-10T12:02:00.000Z',
    updates: Object.freeze([...awaiting.updates, Object.freeze({
      kind: 'review' as const,
      reviewId: `${task.taskId}-review`,
      reviewedSubmissionId: `${task.taskId}-submission`,
      decision: 'accept' as const,
      senderAddress: task.senderAddress,
      receiverAddress: task.executionAddress,
      content: 'Accepted',
      createdAt: '2026-08-10T12:02:00.000Z',
      referenceFiles: Object.freeze([]),
    })]),
  });
};

const taskTeamAgentStatus = (executionAddress = taskTeamCoordinatorAddress(), runId = 'task-team-student-one-run') => ({
  type: 'AGENT_STATUS' as const,
  payload: {
    agent_execution: {
      kind: 'task_team_agent' as const,
      execution_address: toTeamExecutionAddressDto(executionAddress),
      agent_run_id: runId,
    },
    status: 'running' as const,
    trigger: null,
    tool_name: null,
    error_message: null,
    error_details: null,
  },
});

describe('TeamExecutionState task lifecycle', () => {
  it('materializes a direct task Agent from a durable-confirmed activation', () => {
    const team = buildCurrentTaskExecutionTeam();
    const address = taskAgentAddress();
    const result = team.executions.applyExecutionMessage(taskAgentEvent({ address }) as any);

    expect(result).toMatchObject({ disposition: 'applied', effects: [] });
    expect(team.executions.getExecutionSummary(address)).toMatchObject({
      kind: 'task_agent', taskId: 'task-agent-0001', focusable: true,
    });
    expect(team.executions.getAgentContext(address)?.state.runId).toBe('task-agent-run-1');
    expect(team.executions.listTaskHistoryRows()).toEqual([
      expect.objectContaining({
        taskId: 'task-agent-0001',
        content: 'Solve the delegated classroom exercise.',
        status: 'active',
      }),
    ]);
  });

  it('requests complete-record refresh for result events without fabricating task state', () => {
    const team = buildCurrentTaskExecutionTeam();
    const address = taskAgentAddress();
    expect(team.executions.applyExecutionMessage(taskAgentEvent({ address }) as any).disposition).toBe('applied');

    expect(team.executions.applyExecutionMessage(taskAgentEvent({ address, status: 'awaiting_review' }) as any))
      .toEqual({ disposition: 'unchanged', effects: [{ kind: 'refresh_task_records' }] });
    expect(team.executions.listTaskHistoryRows()[0]?.status).toBe('active');

    const base = taskAgentProjection({ address });
    expect(reconcileTestTaskSnapshot(team, [submission(base)]).disposition).toBe('applied');
    expect(team.executions.listTaskHistoryRows()[0]?.status).toBe('awaiting_review');
    expect(team.executions.applyExecutionMessage(taskAgentEvent({ address, status: 'accepted' }) as any))
      .toEqual({ disposition: 'unchanged', effects: [{ kind: 'refresh_task_records' }] });
    expect(team.executions.listTaskHistoryRows()[0]?.status).toBe('awaiting_review');
  });

  it('retains terminal history while cleaning only the confirmed task subtree and repairing focus', () => {
    const team = buildCurrentTaskExecutionTeam();
    const base = taskAgentProjection();
    expect(reconcileTestTaskSnapshot(team, [base]).disposition).toBe('applied');
    expect(team.executions.focus(base.executionAddress).disposition).toBe('applied');
    expect(reconcileTestTaskSnapshot(team, [accepted(base)]).disposition).toBe('applied');

    expect(team.executions.hasExecution(base.executionAddress)).toBe(false);
    expect(team.executions.getFocusedAddress()).toEqual(createTeamExecutionAddress({
      rootTeamRunId: currentTaskExecutionRootTeamRunId,
      memberAddress: '/Teacher',
    }));
    expect(team.executions.listTaskHistoryRows()).toEqual([
      expect.objectContaining({ taskId: base.taskId, status: 'accepted', updates: expect.any(Array) }),
    ]);
  });

  it('retains a valid child projection until the exact task-Team Agent binding arrives', () => {
    const team = buildCurrentTaskExecutionTeam();
    const outer = taskTeamProjection();
    const child = taskAgentProjection({
      taskId: 'task-team-child-0002',
      address: taskAgentAddress({
        memberAddress: '/StudentStudyGroup/student_one',
        taskTeamRunIds: ['task-team-outer'],
        taskAgentRunId: 'task-team-child-run',
      }),
      senderAddress: taskTeamCoordinatorAddress(),
    });

    expect(reconcileTestTaskSnapshot(team, [outer, child]).disposition).toBe('applied');
    expect(team.executions.hasExecution(outer.executionAddress)).toBe(true);
    expect(team.executions.hasExecution(child.executionAddress)).toBe(false);
    expect(team.executions.listTaskHistoryRows().map((row) => row.taskId)).toEqual(expect.arrayContaining([
      outer.taskId, child.taskId,
    ]));

    const result = team.executions.applyExecutionMessage(taskTeamAgentStatus() as any);
    expect(result.disposition).toBe('applied');
    expect(team.executions.hasExecution(taskTeamCoordinatorAddress())).toBe(true);
    expect(team.executions.hasExecution(child.executionAddress)).toBe(true);
    expect(team.executions.listNavigationRows().find((row) => row.executionAddress.taskAgentRunId === 'task-team-child-run'))
      .toMatchObject({ kind: 'task_agent', parentExecutionAddress: taskTeamCoordinatorAddress() });
  });

  it('rejects a foreign delayed binding atomically', () => {
    const team = buildCurrentTaskExecutionTeam();
    const outer = taskTeamProjection();
    const child = taskAgentProjection({
      taskId: 'task-team-child-0002',
      address: taskAgentAddress({
        memberAddress: '/StudentStudyGroup/student_one',
        taskTeamRunIds: ['task-team-outer'],
        taskAgentRunId: 'task-team-child-run',
      }),
      senderAddress: taskTeamCoordinatorAddress(),
    });
    expect(reconcileTestTaskSnapshot(team, [outer, child]).disposition).toBe('applied');
    const before = team.executions.listNavigationRows();

    const result = team.executions.applyExecutionMessage(taskTeamAgentStatus(createTeamExecutionAddress({
      rootTeamRunId: currentTaskExecutionRootTeamRunId,
      taskTeamRunIds: ['task-team-outer'],
      memberAddress: '/Teacher',
    }), 'foreign-run') as any);

    expect(result).toMatchObject({ disposition: 'rejected', code: 'TEAM_EXECUTION_NOT_FOUND', effects: [] });
    expect(team.executions.listNavigationRows()).toEqual(before);
    expect(team.executions.hasExecution(child.executionAddress)).toBe(false);
  });

  it('rejects terminal task-Team cleanup while a materialized descendant is nonterminal', () => {
    const team = buildCurrentTaskExecutionTeam();
    const outer = taskTeamProjection();
    const child = taskAgentProjection({
      taskId: 'task-team-child-0002',
      address: taskAgentAddress({
        memberAddress: '/StudentStudyGroup/student_one',
        taskTeamRunIds: ['task-team-outer'],
        taskAgentRunId: 'task-team-child-run',
      }),
      senderAddress: taskTeamCoordinatorAddress(),
    });
    expect(reconcileTestTaskSnapshot(team, [outer, child]).disposition).toBe('applied');
    expect(team.executions.applyExecutionMessage(taskTeamAgentStatus() as any).disposition).toBe('applied');
    const before = team.executions.listNavigationRows();

    const result = reconcileTestTaskSnapshot(team, [accepted(outer), child]);
    expect(result).toMatchObject({ disposition: 'rejected' });
    expect(team.executions.listNavigationRows()).toEqual(before);
    expect(team.executions.hasExecution(taskTeamExecutionAddress())).toBe(true);
    expect(team.executions.hasExecution(child.executionAddress)).toBe(true);
  });

  it('emits an exact dispatch effect for a materialized task Agent without mutating projection state itself', () => {
    const team = buildCurrentTaskExecutionTeam();
    const address = taskAgentAddress();
    expect(team.executions.applyExecutionMessage(taskAgentEvent({ address }) as any).disposition).toBe('applied');
    const result = team.executions.applyExecutionMessage({
      type: 'AGENT_STATUS',
      payload: {
        agent_execution: { kind: 'task_agent', execution_address: toTeamExecutionAddressDto(address) },
        status: 'running', trigger: null, tool_name: null, error_message: null, error_details: null,
      },
    } as any);
    expect(result).toMatchObject({ disposition: 'unchanged', effects: [{ kind: 'dispatch_agent', executionAddress: address }] });
    expect(team.executions.getAgentContext(address)?.state.currentStatus).toBe(AgentStatus.Offline);
  });
});
