import { describe, it, expect } from 'vitest';
import { TurnToolInputPort } from '../../../../src/agent/loop/turn-tool-input-port.js';
import { AgentInterruptionError } from '../../../../src/agent/interruption/agent-interruption.js';
import type { ToolApprovalInputMessage } from '../../../../src/agent/tool-approval-command.js';

const timeout = <T>(promise: Promise<T>, ms = 1000): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timed out')), ms))
  ]);

const approval = (
  invocationId: string,
  approved: boolean,
  turnId?: string
): ToolApprovalInputMessage => ({
  kind: 'tool_approval',
  invocationId,
  approved,
  ...(turnId ? { turnId } : {})
});

describe('TurnToolInputPort', () => {
  it('delivers approvals by invocation id and stamps the active turn id', async () => {
    const port = new TurnToolInputPort('turn-1');
    const approvalPromise = port.waitForApproval('inv-1', { signal: new AbortController().signal });

    const result = port.postApproval(approval('inv-1', true));
    const deliveredApproval = await timeout(approvalPromise);

    expect(result.accepted).toBe(true);
    expect(deliveredApproval.turnId).toBe('turn-1');
    expect(deliveredApproval.approved).toBe(true);
  });

  it('delivers external tool results by invocation id', async () => {
    const port = new TurnToolInputPort('turn-1');
    const resultPromise = port.waitForToolResult('inv-1', { signal: new AbortController().signal });

    const result = port.postToolResult({ kind: 'tool_result', invocationId: 'inv-1', result: { ok: true } });
    const deliveredResult = await timeout(resultPromise);

    expect(result.accepted).toBe(true);
    expect(deliveredResult).toMatchObject({
      kind: 'tool_result',
      invocationId: 'inv-1',
      turnId: 'turn-1',
      result: { ok: true }
    });
  });

  it('rejects unknown invocation messages and duplicate late messages', async () => {
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
