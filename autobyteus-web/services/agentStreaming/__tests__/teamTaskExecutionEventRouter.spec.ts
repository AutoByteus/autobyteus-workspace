import { describe, expect, it } from 'vitest';
import { handleTaskExecutionProjectionMessage } from '../teamTaskExecutionEventRouter';
import {
  findTeamExecutionNode,
  removeTaskExecutionProjection,
} from '../teamTaskExecutionTree';
import { deriveDelegatedTaskEntries } from '~/utils/teamDelegatedTaskEntries';
import { serializeTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import {
  buildCurrentTaskExecutionTeam,
  taskAgentAddress,
  taskAgentEvent,
} from './currentTaskExecutionFixture';

describe('teamTaskExecutionEventRouter current task-Agent projections', () => {
  it('materializes a distinct exact task Agent with visible details and an execution context', () => {
    const team = buildCurrentTaskExecutionTeam();
    const address = taskAgentAddress();

    const result = handleTaskExecutionProjectionMessage(team, taskAgentEvent({ address }) as any);
    const node = findTeamExecutionNode(team, address);

    expect(result).toEqual({
      outcome: 'handled',
      taskAgentIdentity: { taskAgentRunId: 'task-agent-run-1', executionAddress: address },
      cleanupExecutionAddress: null,
    });
    expect(node).toMatchObject({
      kind: 'agent',
      address: '/Teacher',
      agentRunId: 'task-agent-run-1',
      isTaskExecution: true,
      taskId: 'task-agent-0001',
      taskDescription: 'Solve the delegated classroom exercise.',
      taskExecutionStatus: 'active',
    });
    expect(node).not.toBe(team.memberNodesByAddress.get('/Teacher'));
    expect(team.agentExecutionsByKey.get(serializeTeamExecutionAddress(address))?.state.runId)
      .toBe('task-agent-run-1');
    expect(deriveDelegatedTaskEntries(team)).toEqual([
      expect.objectContaining({
        kind: 'task_agent',
        taskId: 'task-agent-0001',
        taskDescription: 'Solve the delegated classroom exercise.',
        runId: 'task-agent-run-1',
        statusLabel: 'Active',
      }),
    ]);
  });

  it('tracks awaiting-review and accepted transitions, then cleans up only the transient subtree', () => {
    const team = buildCurrentTaskExecutionTeam();
    const address = taskAgentAddress();
    const persistentTeacher = team.memberNodesByAddress.get('/Teacher');

    handleTaskExecutionProjectionMessage(team, taskAgentEvent({ address }) as any);
    const awaiting = handleTaskExecutionProjectionMessage(team, taskAgentEvent({ address, status: 'awaiting_review' }) as any);
    expect(awaiting).toMatchObject({ outcome: 'handled', cleanupExecutionAddress: null });
    expect(findTeamExecutionNode(team, address)).toMatchObject({
      taskExecutionStatus: 'awaiting_review',
      taskTimeline: [
        expect.objectContaining({ status: 'active' }),
        expect.objectContaining({ status: 'awaiting_review' }),
      ],
    });

    team.focusedExecutionAddress = address;
    const accepted = handleTaskExecutionProjectionMessage(team, taskAgentEvent({ address, status: 'accepted' }) as any);
    expect(accepted).toMatchObject({ outcome: 'handled', cleanupExecutionAddress: address });
    expect(findTeamExecutionNode(team, address)).toMatchObject({
      taskExecutionStatus: 'accepted',
      taskTimeline: [
        expect.objectContaining({ status: 'active' }),
        expect.objectContaining({ status: 'awaiting_review' }),
        expect.objectContaining({ status: 'accepted' }),
      ],
    });

    removeTaskExecutionProjection(team, address);
    expect(findTeamExecutionNode(team, address)).toBeNull();
    expect(team.memberNodesByAddress.get('/Teacher')).toBe(persistentTeacher);
    expect(team.rootTeam.children[0]).toBe(persistentTeacher);
    expect(team.agentExecutionsByKey.has(serializeTeamExecutionAddress(address))).toBe(false);
    expect(team.focusedExecutionAddress).toEqual({
      rootTeamRunId: team.teamRunId,
      taskTeamRunIds: [],
      memberAddress: '/Teacher',
      taskAgentRunId: null,
    });
  });

  it('rejects surplus or inconsistent identity before a task execution is shown', () => {
    const team = buildCurrentTaskExecutionTeam();
    const address = taskAgentAddress();
    const malformed = taskAgentEvent({ address }) as any;
    malformed.payload.execution_address = { ...address, memberPath: ['Teacher'] };

    expect(handleTaskExecutionProjectionMessage(team, malformed)).toEqual({
      outcome: 'drop',
      reason: 'Team event contains an invalid execution_address.',
    });
    expect(deriveDelegatedTaskEntries(team)).toEqual([]);
  });
});
