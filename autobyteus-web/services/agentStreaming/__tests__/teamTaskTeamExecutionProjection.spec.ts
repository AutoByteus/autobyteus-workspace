import { describe, expect, it } from 'vitest';
import { createTeamExecutionAddress, toTeamExecutionAddressDto } from '~/types/agent/TeamExecutionAddress';
import type { TeamTaskProjection } from '~/services/teamExecution/teamExecutionModels';
import { reconcileTestTaskSnapshot } from '~/test-support/currentTeamTestFixtures';
import {
  buildCurrentTaskExecutionTeam,
  currentTaskExecutionRootTeamRunId,
  taskTeamCoordinatorAddress,
  taskTeamExecutionAddress,
  taskTeamProjection,
} from './currentTaskExecutionFixture';

const accepted = (task: TeamTaskProjection): TeamTaskProjection => Object.freeze({
  ...task,
  status: 'accepted',
  updatedAt: '2026-08-10T12:02:00.000Z',
  updates: Object.freeze([
    Object.freeze({
      kind: 'submission' as const,
      submissionId: `${task.taskId}-submission`,
      senderAddress: task.executionAddress,
      receiverAddress: task.senderAddress,
      content: 'Completed result',
      createdAt: '2026-08-10T12:01:00.000Z',
      referenceFiles: Object.freeze([]),
    }),
    Object.freeze({
      kind: 'review' as const,
      reviewId: `${task.taskId}-review`,
      reviewedSubmissionId: `${task.taskId}-submission`,
      decision: 'accept' as const,
      senderAddress: task.senderAddress,
      receiverAddress: task.executionAddress,
      content: 'Accepted',
      createdAt: '2026-08-10T12:02:00.000Z',
      referenceFiles: Object.freeze([]),
    }),
  ]),
});

const status = (address: ReturnType<typeof createTeamExecutionAddress>, agentRunId: string) => ({
  type: 'AGENT_STATUS' as const,
  payload: {
    agent_execution: {
      kind: 'task_team_agent' as const,
      execution_address: toTeamExecutionAddressDto(address),
      agent_run_id: agentRunId,
    },
    status: 'running' as const,
    trigger: null,
    tool_name: null,
    error_message: null,
    error_details: null,
  },
});

describe('TeamExecutionState nested task AgentTeam projection', () => {
  it('materializes distinct outer and nested task Team roots from one complete snapshot', () => {
    const team = buildCurrentTaskExecutionTeam();
    const outer = taskTeamProjection();
    const nested = taskTeamProjection({ nested: true });
    const topologyBefore = JSON.stringify(team.topology.listNodes());

    expect(reconcileTestTaskSnapshot(team, [outer, nested]).disposition).toBe('applied');

    expect(team.executions.getExecutionSummary(taskTeamExecutionAddress())).toMatchObject({
      kind: 'task_team', taskId: outer.taskId, focusable: false,
    });
    expect(team.executions.getExecutionSummary(taskTeamExecutionAddress({ nested: true }))).toMatchObject({
      kind: 'task_team', taskId: nested.taskId, focusable: false,
    });
    const taskTeamRows = team.executions.listNavigationRows().filter((row) => row.kind === 'task_team');
    expect(taskTeamRows.find((row) => row.executionAddress.taskTeamRunIds.length === 1)).toMatchObject({
      executionAddress: taskTeamExecutionAddress(),
      parentExecutionAddress: createTeamExecutionAddress({
        rootTeamRunId: currentTaskExecutionRootTeamRunId,
        memberAddress: '/StudentStudyGroup',
      }),
    });
    expect(taskTeamRows.find((row) => row.executionAddress.taskTeamRunIds.length === 2)).toMatchObject({
      executionAddress: taskTeamExecutionAddress({ nested: true }),
      parentExecutionAddress: taskTeamExecutionAddress(),
    });
    expect(JSON.stringify(team.topology.listNodes())).toBe(topologyBefore);
  });

  it('materializes exact task-Team Agent bindings as focusable children', () => {
    const team = buildCurrentTaskExecutionTeam();
    const outer = taskTeamProjection();
    const nested = taskTeamProjection({ nested: true });
    expect(reconcileTestTaskSnapshot(team, [outer, nested]).disposition).toBe('applied');

    expect(team.executions.applyExecutionMessage(status(taskTeamCoordinatorAddress(), 'outer-coordinator-run') as any).disposition)
      .toBe('applied');
    expect(team.executions.applyExecutionMessage(status(taskTeamCoordinatorAddress({ nested: true }), 'inner-coordinator-run') as any).disposition)
      .toBe('applied');

    expect(team.executions.getAgentContext(taskTeamCoordinatorAddress())?.state.runId).toBe('outer-coordinator-run');
    expect(team.executions.getAgentContext(taskTeamCoordinatorAddress({ nested: true }))?.state.runId).toBe('inner-coordinator-run');
    expect(team.executions.focus(taskTeamCoordinatorAddress({ nested: true })).disposition).toBe('applied');
    expect(team.executions.getFocusedAddress()).toEqual(taskTeamCoordinatorAddress({ nested: true }));
  });

  it('removes only an accepted nested subtree and retains its immutable task history', () => {
    const team = buildCurrentTaskExecutionTeam();
    const outer = taskTeamProjection();
    const nested = taskTeamProjection({ nested: true });
    expect(reconcileTestTaskSnapshot(team, [outer, nested]).disposition).toBe('applied');
    expect(team.executions.applyExecutionMessage(status(taskTeamCoordinatorAddress({ nested: true }), 'inner-coordinator-run') as any).disposition)
      .toBe('applied');
    expect(team.executions.focus(taskTeamCoordinatorAddress({ nested: true })).disposition).toBe('applied');

    expect(reconcileTestTaskSnapshot(team, [outer, accepted(nested)]).disposition).toBe('applied');

    expect(team.executions.hasExecution(taskTeamExecutionAddress())).toBe(true);
    expect(team.executions.hasExecution(taskTeamExecutionAddress({ nested: true }))).toBe(false);
    expect(team.executions.hasExecution(taskTeamCoordinatorAddress({ nested: true }))).toBe(false);
    expect(team.executions.getFocusedAddress()).toEqual(createTeamExecutionAddress({
      rootTeamRunId: currentTaskExecutionRootTeamRunId,
      memberAddress: '/StudentStudyGroup/LabGroup/lab_one',
    }));
    expect(team.executions.listTaskHistoryRows()).toEqual(expect.arrayContaining([
      expect.objectContaining({ taskId: nested.taskId, status: 'accepted' }),
    ]));
  });

  it('rejects terminal outer cleanup while a nested task Team remains nonterminal', () => {
    const team = buildCurrentTaskExecutionTeam();
    const outer = taskTeamProjection();
    const nested = taskTeamProjection({ nested: true });
    expect(reconcileTestTaskSnapshot(team, [outer, nested]).disposition).toBe('applied');
    const before = team.executions.listNavigationRows();

    expect(reconcileTestTaskSnapshot(team, [accepted(outer), nested])).toMatchObject({ disposition: 'rejected' });
    expect(team.executions.listNavigationRows()).toEqual(before);
    expect(team.executions.hasExecution(taskTeamExecutionAddress())).toBe(true);
    expect(team.executions.hasExecution(taskTeamExecutionAddress({ nested: true }))).toBe(true);
  });

  it('rejects a reordered or truncated task-Team Agent chain before mutation', () => {
    const team = buildCurrentTaskExecutionTeam();
    const outer = taskTeamProjection();
    const nested = taskTeamProjection({ nested: true });
    expect(reconcileTestTaskSnapshot(team, [outer, nested]).disposition).toBe('applied');
    const before = team.executions.listNavigationRows();
    const invalid = createTeamExecutionAddress({
      rootTeamRunId: currentTaskExecutionRootTeamRunId,
      taskTeamRunIds: ['task-team-inner', 'task-team-outer'],
      memberAddress: '/StudentStudyGroup/LabGroup/lab_one',
    });

    expect(team.executions.applyExecutionMessage(status(invalid, 'wrong-chain-run') as any))
      .toMatchObject({ disposition: 'rejected', code: 'TEAM_EXECUTION_NOT_FOUND' });
    expect(team.executions.listNavigationRows()).toEqual(before);
  });
});
