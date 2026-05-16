import { describe, it, expect } from 'vitest';
import { ToolExecutionApprovalEvent, ToolResultEvent } from '../../../../src/agent/events/agent-events.js';
import { TurnToolInputPort } from '../../../../src/agent/loop/turn-tool-input-port.js';
import { AgentInterruptionError } from '../../../../src/agent/interruption/agent-interruption.js';

const timeout = <T>(promise: Promise<T>, ms = 1000): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timed out')), ms))
  ]);

const approval = (
  invocationId: string,
  approved: boolean,
  turnId?: string
): ToolExecutionApprovalEvent => new ToolExecutionApprovalEvent(invocationId, approved, undefined, turnId);

describe('TurnToolInputPort', () => {
  it('delivers approvals by invocation id and stamps the active turn id', async () => {
    const port = new TurnToolInputPort('turn-1');
    const approvalPromise = port.waitForApproval('inv-1', { signal: new AbortController().signal });

    const result = port.postApproval(approval('inv-1', true));
    const deliveredApproval = await timeout(approvalPromise);

    expect(result.accepted).toBe(true);
    expect(deliveredApproval.turnId).toBe('turn-1');
    expect(deliveredApproval.isApproved).toBe(true);
  });

  it('delivers external tool results by invocation id', async () => {
    const port = new TurnToolInputPort('turn-1');
    const resultPromise = port.waitForToolResult('inv-1', { signal: new AbortController().signal });

    const result = port.postToolResult(new ToolResultEvent('tool', { ok: true }, 'inv-1'));
    const deliveredResult = await timeout(resultPromise);

    expect(result.accepted).toBe(true);
    expect(deliveredResult).toMatchObject({
      toolInvocationId: 'inv-1',
      turnId: 'turn-1',
      result: { ok: true }
    });
  });

  it('rejects external tool results when no active result waiter exists', () => {
    const port = new TurnToolInputPort('turn-1');
    port.registerToolInvocation('inv-1');

    const result = port.postToolResult(new ToolResultEvent('tool', { ok: true }, 'inv-1'));

    expect(result.accepted).toBe(false);
    expect(result.code).toBe('no_waiter');
  });

  it('rejects unknown invocation events and duplicate late events', async () => {
    const port = new TurnToolInputPort('turn-1');

    const unknown = port.postApproval(approval('unknown-invocation', true));
    expect(unknown.accepted).toBe(false);
    expect(unknown.code).toBe('unknown_invocation');

    const approvalPromise = port.waitForApproval('inv-1', { signal: new AbortController().signal });
    const accepted = port.postApproval(approval('inv-1', true));
    await timeout(approvalPromise);

    const duplicate = port.postApproval(approval('inv-1', false));
    expect(accepted.accepted).toBe(true);
    expect(duplicate.accepted).toBe(false);
    expect(duplicate.code).toBe('duplicate');
  });

  it('rejects waiters as interruption errors when the port closes', async () => {
    const port = new TurnToolInputPort('turn-1');
    const approvalPromise = port.waitForApproval('inv-1', { signal: new AbortController().signal });
    const resultPromise = port.waitForToolResult('inv-2', { signal: new AbortController().signal });

    port.close('interrupted');

    await expect(approvalPromise).rejects.toBeInstanceOf(AgentInterruptionError);
    await expect(resultPromise).rejects.toBeInstanceOf(AgentInterruptionError);
    expect(port.postApproval(approval('inv-1', true)).accepted).toBe(false);
  });

  it('rejects mismatched turn ids', () => {
    const port = new TurnToolInputPort('turn-1');
    const result = port.postApproval(approval('inv-1', true, 'other-turn'));

    expect(result.accepted).toBe(false);
    expect(result.code).toBe('turn_mismatch');
  });
});
