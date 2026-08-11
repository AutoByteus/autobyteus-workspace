import { describe, it, expect } from 'vitest';
import { AgentTurn } from '../../../src/agent/agent-turn.js';
import { ToolExecutionApprovalEvent } from '../../../src/agent/events/agent-events.js';
import { ToolInvocationBatch } from '../../../src/agent/tool-invocation-batch.js';
import { ToolInvocation } from '../../../src/agent/tool-invocation.js';

describe('ToolInvocation', () => {
  it('validates required fields', () => {
    expect(() => new ToolInvocation('', {}, 'id')).toThrow();
    expect(() => new ToolInvocation('tool', null as any, 'id')).toThrow();
    expect(() => new ToolInvocation('tool', {}, '')).toThrow();
  });

  it('reports valid invocations', () => {
    const invocation = new ToolInvocation('tool', { a: 1 }, 'id', 'turn_0001');
    expect(invocation.isValid()).toBe(true);
    expect(invocation.turnId).toBe('turn_0001');
  });
});

describe('ToolInvocationBatch', () => {
  it('retains provider invocation order and returns a defensive identity copy', () => {
    const batch = new ToolInvocationBatch('turn_0001', [
      new ToolInvocation('tool_a', {}, 'id-a', 'turn_0001'),
      new ToolInvocation('tool_b', {}, 'id-b', 'turn_0001'),
    ]);

    const ids = batch.getExpectedInvocationIds();
    ids.reverse();

    expect(batch.getExpectedInvocationIds()).toEqual(['id-a', 'id-b']);
    expect(batch.expectsInvocation('id-a')).toBe(true);
    expect(batch.expectsInvocation('missing')).toBe(false);
  });

  it('admits only expected invocation identities from the active turn', () => {
    const invocation = new ToolInvocation('tool', {}, 'id', 'turn_0001');
    const batch = new ToolInvocationBatch('turn_0001', [invocation]);

    expect(batch.accepts('id')).toBe(true);
    expect(batch.accepts('id', 'turn_0001')).toBe(true);
    expect(batch.accepts('id', 'turn_0002')).toBe(false);
    expect(batch.accepts('unknown', 'turn_0001')).toBe(false);
  });
});

describe('AgentTurn', () => {
  it('assigns its agent turn id to started tool batches', () => {
    const turn = new AgentTurn('turn_0007');
    const invocation = new ToolInvocation('tool', {}, 'id');

    const batch = turn.startToolInvocationBatch([invocation]);

    expect(invocation.turnId).toBe('turn_0007');
    expect(batch.accepts('id', 'turn_0007')).toBe(true);
    expect(turn.activeToolInvocationBatch).toBe(batch);
    expect(turn.toolInvocationBatches).toEqual([batch]);
  });

  it('owns execution start and idempotent settlement', async () => {
    const turn = new AgentTurn('turn_0008');

    turn.startExecution({
      trigger: 'trigger',
      runnerFactory: () => ({
        run: async () => ({ kind: 'completed', turnId: 'turn_0008' })
      })
    });

    await expect(turn.waitForSettlement()).resolves.toEqual({ kind: 'completed', turnId: 'turn_0008' });
    expect(turn.isSettled).toBe(true);
    expect(() =>
      turn.startExecution({
        trigger: 'again',
        runnerFactory: () => ({ run: async () => ({ kind: 'completed', turnId: 'turn_0008' }) })
      })
    ).toThrow(/already started/);
  });

  it('validates pending approval through the turn aggregate before posting to the port', async () => {
    const turn = new AgentTurn('turn_0009');
    const invocation = new ToolInvocation('tool', {}, 'inv-1', 'turn_0009');
    turn.storePendingToolInvocation(invocation);
    const approvalPromise = turn.toolInputPort.waitForApproval('inv-1', {
      signal: turn.executionScope.signal
    });

    const result = turn.postToolApproval(new ToolExecutionApprovalEvent('inv-1', true));

    expect(result).toEqual({
      accepted: true,
      code: 'posted',
      turnId: 'turn_0009',
      invocationId: 'inv-1'
    });
    await expect(approvalPromise).resolves.toMatchObject({
      toolInvocationId: 'inv-1',
      isApproved: true,
      turnId: 'turn_0009'
    });
  });
});
