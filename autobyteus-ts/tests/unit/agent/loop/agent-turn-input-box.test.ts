import { describe, it, expect } from 'vitest';
import { AgentTurnInputBox } from '../../../../src/agent/loop/agent-turn-input-box.js';
import { ToolExecutionApprovalEvent } from '../../../../src/agent/events/agent-events.js';
import { AgentInterruptionError } from '../../../../src/agent/interruption/agent-interruption.js';

const timeout = <T>(promise: Promise<T>, ms = 1000): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timed out')), ms))
  ]);

describe('AgentTurnInputBox', () => {
  it('delivers approvals by invocation id and stamps the active turn id', async () => {
    const box = new AgentTurnInputBox('turn-1');
    const approvalPromise = box.waitForApproval('inv-1', { signal: new AbortController().signal });

    const result = box.postApproval(new ToolExecutionApprovalEvent('inv-1', true));
    const approval = await timeout(approvalPromise);

    expect(result.accepted).toBe(true);
    expect(approval.turnId).toBe('turn-1');
    expect(approval.isApproved).toBe(true);
  });

  it('rejects unknown invocation approvals and duplicate late approvals', async () => {
    const box = new AgentTurnInputBox('turn-1');

    const unknown = box.postApproval(new ToolExecutionApprovalEvent('unknown-invocation', true));
    expect(unknown.accepted).toBe(false);
    expect(unknown.code).toBe('unknown_invocation');

    const approvalPromise = box.waitForApproval('inv-1', { signal: new AbortController().signal });
    const accepted = box.postApproval(new ToolExecutionApprovalEvent('inv-1', true));
    await timeout(approvalPromise);

    const duplicate = box.postApproval(new ToolExecutionApprovalEvent('inv-1', false));
    expect(accepted.accepted).toBe(true);
    expect(duplicate.accepted).toBe(false);
    expect(duplicate.code).toBe('duplicate');
  });

  it('rejects waiters as interruption errors when the turn input box closes', async () => {
    const box = new AgentTurnInputBox('turn-1');
    const approvalPromise = box.waitForApproval('inv-1', { signal: new AbortController().signal });

    box.close('interrupted');

    await expect(approvalPromise).rejects.toBeInstanceOf(AgentInterruptionError);
    expect(box.postApproval(new ToolExecutionApprovalEvent('inv-1', true)).accepted).toBe(false);
  });

  it('rejects mismatched turn ids', () => {
    const box = new AgentTurnInputBox('turn-1');
    const event = new ToolExecutionApprovalEvent('inv-1', true);
    event.turnId = 'other-turn';

    const result = box.postApproval(event);

    expect(result.accepted).toBe(false);
    expect(result.code).toBe('turn_mismatch');
  });
});
