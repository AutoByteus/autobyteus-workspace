import { describe, expect, it, vi } from 'vitest';
import { RootTaskExecutionLifecycle } from '../../../src/agent-collaboration/execution/task/root-task-execution-lifecycle.js';
import { createRootExecutionIdentity, createCollaborationMemberExecutionIdentity } from '../../../src/agent-collaboration/execution/domain/root-execution-identity.js';
import type { RootTaskExecutionAdapter, TaskExecutionActivationPlan, TaskExecutionActivationOperation, RegisteredTaskActivation } from '../../../src/agent-collaboration/execution/task/root-task-execution-adapter.js';
import { InMemoryTaskAgentResources } from '../../fixtures/task-agent-resource-fixtures.js';

const latch = () => { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; };
type RootKind = 'agent' | 'agent_team' | 'agent_org';

/** One root over a neutral adapter double: identity plan → register → prepare → commit → seed. */
function fixture(kind: RootKind) {
  const root = createRootExecutionIdentity({ rootSubjectKind: kind, rootRunId: 'exact-root' });
  const member = (agentRunId: string, memberAddress = `/${agentRunId}`) => createCollaborationMemberExecutionIdentity({ root, memberAddress, agentRunId });
  const resources = new InMemoryTaskAgentResources();
  resources.addTask('task-A');
  const planned = latch(), preparation = latch(), seed = latch();
  const wait = { plan: false, prepare: false, seed: false };
  let ordinal = 0;
  const registrations = new Map<string, RegisteredTaskActivation>();
  const linkAtRegistration: Array<string | undefined> = [];
  const committed = new Map<string, { chainOf: string[] }>();
  const operations: Array<TaskExecutionActivationOperation & { cancel: ReturnType<typeof vi.fn>; release: ReturnType<typeof vi.fn>; prepare: ReturnType<typeof vi.fn> }> = [];
  const adapter: RootTaskExecutionAdapter<string> = {
    root, isOpen: () => true, authorize: () => undefined, assertCurrentSchemaReady: () => undefined,
    planActivation: vi.fn(async input => {
      if (wait.plan) await planned.promise;
      const id = `copy-${++ordinal}`;
      return { ...input, ownedAgentRunIds: [id], target: { root, execution: { agentRunId: id }, ingressAgentRunId: id } };
    }),
    beginActivation: vi.fn((plan: TaskExecutionActivationPlan<string>) => {
      let cancelled = false, settled = false;
      const id = plan.target.ingressAgentRunId;
      linkAtRegistration.push(resources.entry(plan.target.execution)?.start);
      const operation = {
        cancel: vi.fn(() => { cancelled = true; }),
        release: vi.fn(async () => { cancelled = true; return { accepted: settled || !operation.prepare.mock.calls.length }; }),
        prepare: vi.fn(async () => {
          if (wait.prepare) await preparation.promise;
          settled = true;
          if (cancelled) throw new Error('late owned preparation cancelled');
          return { targetAgentRunId: id,
            commit: vi.fn(async () => { if (cancelled) throw new Error('commit closed'); committed.set(id, { chainOf: [id] }); return { committed: true as const }; }),
            acceptSeed: vi.fn(async (assertOpen: () => void) => { if (wait.seed) await seed.promise; assertOpen(); return { accepted: true }; }),
          };
        }),
      };
      operations.push(operation as never);
      registrations.set(id, { target: plan.target, ownedAgentRunIds: plan.ownedAgentRunIds, operation });
      return operation;
    }),
    registrationFor: ref => 'agentRunId' in ref ? registrations.get(ref.agentRunId) ?? null : null,
    ownershipChainFor: agentRunId => committed.has(agentRunId) || registrations.has(agentRunId) ? [{ agentRunId }] : [],
    taskExecutionAt: () => null,
    cancelOwnedExecution: vi.fn(), releaseOwnedExecution: vi.fn(async ref => committed.has('agentRunId' in ref ? ref.agentRunId : '')
      ? { accepted: true } : { accepted: false, code: 'EXACT_RELEASE_AUTHORITY_UNAVAILABLE' }),
    taskExecutionChainFor: agentRunId => committed.has(agentRunId) ? [{ agentRunId }] : [],
    isLive: () => false, assertRestorableChain: () => undefined, restoreChain: async () => undefined, tryShutDownIfQuiet: async () => false,
  };
  const lifecycle = new RootTaskExecutionLifecycle(adapter, { taskAgentResources: resources });
  const manager = member('manager', '/manager');
  /** DONE: the Task side commits closure, then asks this root to stop exactly the closed agent runs. */
  const done = async () => lifecycle.releaseTaskAgentResources(resources.close('task-A'));
  return { root, member, resources, linkAtRegistration, adapter, lifecycle, operations, planned, preparation, seed, wait, done,
    assign: () => lifecycle.delegate({ identity: manager }, { recipient_address: '/worker', task_id: 'task-A' }, 'placement') };
}

describe.each(['agent', 'agent_team', 'agent_org'] as const)('link-before-register Task dispatch under a %s root', kind => {
  it('links the assignment `starting` before registration and marks it started at seed acceptance', async () => {
    const h = fixture(kind);
    const result = await h.assign();
    expect(result).toEqual({ target_agent_run_id: 'copy-1' });
    expect(h.resources.links[0]).toMatchObject({ role: 'assigned', taskId: 'task-A', assignedBy: 'manager',
      hostRoot: { rootSubjectKind: kind, rootRunId: 'exact-root' }, agentRun: { agentRunId: 'copy-1' } });
    expect(h.linkAtRegistration).toEqual(['starting']);
    expect(h.resources.entry({ agentRunId: 'copy-1' })).toMatchObject({ start: 'started', open: true });
  });

  it('DONE during identity-only planning: the link is rejected, nothing is registered or prepared', async () => {
    const h = fixture(kind); h.wait.plan = true;
    const dispatch = h.assign(); await vi.waitFor(() => expect(h.adapter.planActivation).toHaveBeenCalledOnce());
    await h.done(); h.planned.resolve();
    expect((await dispatch).target_agent_run_id).toBeNull();
    expect(h.adapter.beginActivation).not.toHaveBeenCalled(); expect(h.resources.entries.size).toBe(0);
  });

  it('DONE after the link but before registration: closed by DONE, never registered', async () => {
    const h = fixture(kind);
    const original = h.resources.linkAgentRun.bind(h.resources);
    h.resources.linkAgentRun = async input => { const linked = await original(input); await h.done(); return linked; };
    expect((await h.assign()).target_agent_run_id).toBeNull();
    expect(h.adapter.beginActivation).not.toHaveBeenCalled();
    expect(h.resources.entry({ agentRunId: 'copy-1' })).toMatchObject({ open: false, start: 'failed' });
  });

  it('DONE after registration: cancelled before any await; an unsettled acquisition is not reported stopped until a repeated DONE', async () => {
    const h = fixture(kind); h.wait.prepare = true;
    const dispatch = h.assign();
    await vi.waitFor(() => expect(h.operations[0]?.prepare).toHaveBeenCalledOnce());
    const stop = h.done();
    expect(h.operations[0]!.cancel).toHaveBeenCalled();
    expect(await stop).toEqual([{ agentRun: { agentRunId: 'copy-1' }, stopped: false, error: expect.objectContaining({ code: expect.any(String) }) }]);
    h.preparation.resolve();
    expect((await dispatch).target_agent_run_id).toBeNull();
    expect(await h.done()).toEqual([{ agentRun: { agentRunId: 'copy-1' }, stopped: true }]);
    expect(h.adapter.taskExecutionChainFor('copy-1')).toEqual([]);
    expect(h.resources.entry({ agentRunId: 'copy-1' })).toMatchObject({ open: false, start: 'failed' });
  });

  it('DONE after commit fences the awaited seed; the run is closed and never reported started', async () => {
    const h = fixture(kind); h.wait.seed = true;
    const dispatch = h.assign();
    await vi.waitFor(() => expect(h.adapter.taskExecutionChainFor('copy-1')).toHaveLength(1));
    expect(await h.done()).toEqual([{ agentRun: { agentRunId: 'copy-1' }, stopped: true }]);
    h.seed.resolve();
    expect((await dispatch).target_agent_run_id).toBeNull();
    expect(h.resources.entry({ agentRunId: 'copy-1' })).toMatchObject({ open: false, start: 'failed' });
    expect(() => h.lifecycle.assertInputAllowed('copy-1')).toThrow(expect.objectContaining({ code: 'TASK_AGENT_RESOURCE_CLOSED' }));
  });

  it('an owned worker delegates only without task_id: own Task ID rejected (N2), no-ID work joins its Task as delegated', async () => {
    const h = fixture(kind);
    await h.assign();
    const worker = { identity: h.member('copy-1', '/worker') };
    await expect(h.lifecycle.delegate(worker, { recipient_address: '/sub', task_id: 'task-A' }, 'placement'))
      .rejects.toMatchObject({ code: 'TASK_AGENT_RESOURCE_OWNED_SENDER' });
    expect(await h.lifecycle.delegate(worker, { recipient_address: '/sub', description: 'sub-work' }, 'placement')).toEqual({ target_agent_run_id: 'copy-2' });
    expect(h.resources.links[1]).toMatchObject({ role: 'delegated', creator: { agentRunId: 'copy-1' } });
    expect(h.resources.entry({ agentRunId: 'copy-2' })).toMatchObject({ taskId: 'task-A', start: 'started', open: true });
  });

  it('an inherited link from a closed creator is rejected with zero registration', async () => {
    const h = fixture(kind);
    await h.assign(); await h.done();
    const worker = { identity: h.member('copy-1', '/worker') };
    const result = await h.lifecycle.delegate(worker, { recipient_address: '/sub', description: 'late' }, 'placement').catch(error => error);
    expect(result).toMatchObject({ code: 'TASK_AGENT_RESOURCE_CLOSED' });
    expect(h.adapter.beginActivation).toHaveBeenCalledTimes(1);
  });

  it('both orders of an inherited link vs DONE: closed by DONE, or rejected under the lock; never open after DONE', async () => {
    const h = fixture(kind);
    await h.assign();
    const worker = { identity: h.member('copy-1', '/worker') };
    // Order 1: the link commits first, then DONE closes it.
    h.wait.prepare = true;
    const first = h.lifecycle.delegate(worker, { recipient_address: '/sub', description: 'one' }, 'placement');
    await vi.waitFor(() => expect(h.resources.entry({ agentRunId: 'copy-2' })).toBeDefined());
    await h.done(); h.preparation.resolve();
    expect((await first).target_agent_run_id).toBeNull();
    expect(h.resources.entry({ agentRunId: 'copy-2' })?.open).toBe(false);
    // Order 2: DONE first; the creator is read closed, nothing is linked.
    await expect(h.lifecycle.delegate(worker, { recipient_address: '/sub', description: 'two' }, 'placement'))
      .rejects.toMatchObject({ code: 'TASK_AGENT_RESOURCE_CLOSED' });
    expect([...h.resources.entries.values()].every(entry => !entry.open)).toBe(true);
  });

  it('damaged Task data rejects description-only delegation by a non-owned sender before any planning (Q-3)', async () => {
    const h = fixture(kind);
    h.resources.damaged.add('task-B');
    await expect(h.lifecycle.delegate({ identity: h.member('manager', '/manager') }, { recipient_address: '/worker', description: 'plain' }, 'placement'))
      .rejects.toMatchObject({ code: 'TASK_AGENT_RESOURCES_UNAVAILABLE' });
    expect(h.adapter.planActivation).not.toHaveBeenCalled();
    // A readable Task still assigns normally.
    expect((await h.assign()).target_agent_run_id).toBe('copy-1');
    h.resources.damaged.add('task-A');
    await expect(h.lifecycle.delegate({ identity: h.member('manager', '/manager') }, { recipient_address: '/w', task_id: 'task-A' }, 'placement'))
      .rejects.toMatchObject({ code: 'TASK_AGENT_RESOURCES_UNAVAILABLE' });
  });

  it('a failed exact stop with a retained authority is reported, then repeated DONE invokes the same release until it succeeds', async () => {
    const h = fixture(kind);
    await h.assign();
    const release = h.adapter.releaseOwnedExecution as ReturnType<typeof vi.fn>;
    release.mockResolvedValueOnce({ accepted: false, code: 'EXACT_CLOSE_FAILED', message: 'provider still running' });
    expect(await h.done()).toEqual([{ agentRun: { agentRunId: 'copy-1' }, stopped: false, error: { code: 'EXACT_CLOSE_FAILED', message: 'provider still running' } }]);
    expect(await h.done()).toEqual([{ agentRun: { agentRunId: 'copy-1' }, stopped: true }]);
    expect(release).toHaveBeenCalledTimes(2);
    expect(await h.lifecycle.releaseTaskAgentResources([{ agentRunId: 'never-linked' }])).toEqual([
      { agentRun: { agentRunId: 'never-linked' }, stopped: false, error: expect.objectContaining({ code: 'TASK_AGENT_RESOURCE_NOT_CLOSED' }) }]);
  });
});
