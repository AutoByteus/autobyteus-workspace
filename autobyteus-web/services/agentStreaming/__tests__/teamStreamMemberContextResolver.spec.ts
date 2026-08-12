import { describe, expect, it } from 'vitest';
import { createTeamExecutionAddress, toTeamExecutionAddressDto } from '~/types/agent/TeamExecutionAddress';
import {
  buildCurrentTaskExecutionTeam,
  currentTaskExecutionRootTeamRunId,
  taskAgentAddress,
  taskAgentEvent,
  taskTeamCoordinatorAddress,
  taskTeamEvent,
} from './currentTaskExecutionFixture';

const status = (input: {
  kind: 'persistent_agent' | 'task_agent' | 'task_team_agent';
  address: ReturnType<typeof createTeamExecutionAddress>;
  agentRunId?: string;
}) => ({
  type: 'AGENT_STATUS' as const,
  payload: {
    agent_execution: input.kind === 'task_team_agent'
      ? {
          kind: input.kind,
          execution_address: toTeamExecutionAddressDto(input.address),
          agent_run_id: input.agentRunId!,
        }
      : { kind: input.kind, execution_address: toTeamExecutionAddressDto(input.address) },
    status: 'running' as const,
    trigger: null,
    tool_name: null,
    error_message: null,
    error_details: null,
  },
});

describe('TeamExecutionState exact Agent binding resolution', () => {
  it('dispatches a persistent Agent message to exactly one associated context', () => {
    const team = buildCurrentTaskExecutionTeam();
    const address = createTeamExecutionAddress({
      rootTeamRunId: currentTaskExecutionRootTeamRunId,
      memberAddress: '/Teacher',
    });

    expect(team.executions.applyExecutionMessage(status({ kind: 'persistent_agent', address }) as any))
      .toEqual({
        disposition: 'unchanged',
        effects: [{ kind: 'dispatch_agent', executionAddress: address, message: status({ kind: 'persistent_agent', address }) }],
      });
  });

  it('rejects a missing task Agent instead of substituting its persistent Agent', () => {
    const team = buildCurrentTaskExecutionTeam();
    const address = taskAgentAddress({ taskAgentRunId: 'missing-task-agent-run' });
    expect(team.executions.applyExecutionMessage(status({ kind: 'task_agent', address }) as any))
      .toMatchObject({ disposition: 'rejected', code: 'TEAM_EXECUTION_NOT_FOUND', effects: [] });
  });

  it('resolves a task Agent only after exact activation materializes it', () => {
    const team = buildCurrentTaskExecutionTeam();
    const address = taskAgentAddress({ taskAgentRunId: 'existing-task-agent-run' });
    expect(team.executions.applyExecutionMessage(taskAgentEvent({ address }) as any).disposition).toBe('applied');
    expect(team.executions.applyExecutionMessage(status({ kind: 'task_agent', address }) as any))
      .toMatchObject({
        disposition: 'unchanged',
        effects: [{ kind: 'dispatch_agent', executionAddress: address }],
      });
    expect(team.executions.getAgentContext(address)?.state.runId).toBe('existing-task-agent-run');
  });

  it('materializes a real Agent inside an active task Team only from its correlated binding', () => {
    const team = buildCurrentTaskExecutionTeam();
    expect(team.executions.applyExecutionMessage(taskTeamEvent() as any).disposition).toBe('applied');
    const address = taskTeamCoordinatorAddress();
    expect(team.executions.hasExecution(address)).toBe(false);

    const message = status({ kind: 'task_team_agent', address, agentRunId: 'task-team-agent-run' });
    expect(team.executions.applyExecutionMessage(message as any)).toMatchObject({
      disposition: 'applied',
      effects: [{ kind: 'dispatch_agent', executionAddress: address }],
    });
    expect(team.executions.getAgentContext(address)?.state.runId).toBe('task-team-agent-run');
  });

  it('rejects an Agent binding from another collaboration root', () => {
    const team = buildCurrentTaskExecutionTeam();
    const address = createTeamExecutionAddress({ rootTeamRunId: 'foreign-root', memberAddress: '/Teacher' });
    expect(team.executions.applyExecutionMessage(status({ kind: 'persistent_agent', address }) as any))
      .toMatchObject({ disposition: 'rejected', code: 'TEAM_EXECUTION_IDENTITY_MISMATCH', effects: [] });
  });
});
