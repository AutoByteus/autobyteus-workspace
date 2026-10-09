import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentInputUserMessage } from 'autobyteus-ts/agent/message/agent-input-user-message.js';
import { RootTaskExecutionLifecycle } from '../../../src/agent-collaboration/execution/task/root-task-execution-lifecycle.js';
import { nestedReleaseScenario } from '../../fixtures/task-release-generation-fixtures.js';

afterEach(() => vi.restoreAllMocks());

// Actual root adapters, directory / TeamRun registries, factory and handles for each root kind;
// provider runs and the Task side are controlled. Task A is an assigned Team (with delegated and
// brought-in helpers), Task B an assigned Agent; both are hosted where each root kind hosts them.
async function fixture(kind: 'agent' | 'agent_team' | 'agent_org') {
  const f = await nestedReleaseScenario(kind);
  await f.resources.markStarted({ teamRunId: 'A-team' });
  await f.resources.markStarted({ agentRunId: 'B-worker' });
  const lifecycle = new RootTaskExecutionLifecycle(f.adapter, { taskExecutionResources: f.resources, gracePeriodMs: () => 600_000 });
  const done = async (taskId: 'A' | 'B') => {
    const closed = f.resources.close(taskId);
    expect((await lifecycle.releaseTaskExecutions(closed)).every(result => result.stopped)).toBe(true);
  };
  /** `send_message_to(run ID)` from the assigner, bound as the root facades bind it. */
  const message = (target: string) => lifecycle.deliverToExactTarget(f.managerId, target, () => lifecycle.withLiveLease(target, async () => {
    const run = target === 'A-lead' ? f.getManaged('A-team')! : null;
    return run ? run.postMessage(new AgentInputUserMessage('Next round'), 'A-lead') : { accepted: true, message: `Delivered message to ${target}.` };
  }));
  const acquisitions = (runId: string) => f.acquired.filter(run => run.runId === runId).length;
  return { ...f, lifecycle, done, message, acquisitions };
}

describe.each(['agent', 'agent_team', 'agent_org'] as const)('%s root: reactivation over the actual released runtime authority', kind => {
  it('an Agent copy stopped by DONE is discarded and restored as a fresh run, and the cycle repeats (AC-001/010/011)', async () => {
    const f = await fixture(kind);
    const original = f.active.get('B-worker');
    expect(original?.alive).toBe(true);
    await f.done('B');
    expect(original.alive).toBe(false);
    // The released authority stays registered: restoring it in place fails (the reason for the discard).
    await expect(f.adapter.restoreChain('B-worker', () => undefined)).rejects.toThrow();
    f.resources.setTaskOpen('B');
    expect(await f.message('B-worker')).toMatchObject({ accepted: true, message: 'Delivered message to B-worker. B-worker was reactivated.' });
    const restored = f.active.get('B-worker');
    expect(restored).not.toBe(original);
    expect(restored.alive).toBe(true);
    expect(f.acquisitions('B-worker')).toBe(2);
    // A later DONE stops the restored run; reopening and messaging again restores another fresh one.
    await f.done('B');
    expect(restored.alive).toBe(false);
    f.resources.setTaskOpen('B');
    expect(await f.message('B-worker')).toMatchObject({ accepted: true });
    expect(f.active.get('B-worker')?.alive).toBe(true);
    expect(f.acquisitions('B-worker')).toBe(3);
    // Other executions were never touched.
    expect(f.active.get('borrowed')?.alive).toBe(true);
    f.lifecycle.closeExternalAdmission();
  });

  it('a Team copy stopped while live is restored as a new TeamRun through its coordinator; its helpers stay closed (AC-002/005)', async () => {
    const f = await fixture(kind);
    // Wake the quiet Team so DONE stops a live copy.
    await f.adapter.restoreChain('A-lead', () => undefined);
    const live = f.getManaged('A-team')!;
    expect(live.isActive()).toBe(true);
    await f.done('A');
    expect(live.isTerminated()).toBe(true);
    await expect(f.adapter.restoreChain('A-lead', () => undefined)).rejects.toThrow();
    const helperAcquisitions = ['A-child', 'A-grand', 'A-helper'].map(f.acquisitions);
    f.resources.setTaskOpen('A');
    // A member that is not the ingress cannot reactivate the Team.
    expect(await f.lifecycle.deliverToExactTarget(f.managerId, 'A-child', async () => ({ accepted: true })))
      .toMatchObject({ accepted: false, code: 'TASK_AGENT_RESOURCE_CLOSED' });
    expect(await f.message('A-lead')).toMatchObject({ accepted: true, message: expect.stringContaining('A-lead was reactivated.') });
    const restored = f.getManaged('A-team')!;
    expect(restored).not.toBe(live);
    expect(restored.isActive()).toBe(true);
    expect(f.resources.isOpen({ teamRunId: 'A-team' })).toBe(true);
    for (const helper of [{ agentRunId: 'A-child' }, { teamRunId: 'A-nested' }, { agentRunId: 'A-grand' }, { agentRunId: 'A-helper' }]) {
      expect(f.resources.isOpen(helper)).toBe(false);
    }
    expect(['A-child', 'A-grand', 'A-helper'].map(f.acquisitions)).toEqual(helperAcquisitions);
    // A later DONE stops the restored TeamRun exactly; the still-closed helpers stay stopped.
    await f.done('A');
    expect(restored.isTerminated()).toBe(true);
    f.lifecycle.closeExternalAdmission();
  });
});
