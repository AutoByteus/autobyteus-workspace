import { describe, expect, it, vi } from 'vitest';
import { RootTaskExecutionLifecycle } from '../../../src/agent-collaboration/execution/task/root-task-execution-lifecycle.js';
import { createRootExecutionIdentity, createCollaborationMemberExecutionIdentity } from '../../../src/agent-collaboration/execution/domain/root-execution-identity.js';
import type { RootTaskExecutionAdapter, TaskExecutionActivationPlan, TaskExecutionActivationOperation, RegisteredTaskActivation } from '../../../src/agent-collaboration/execution/task/root-task-execution-adapter.js';
import { InMemoryTaskExecutionResources } from '../../fixtures/task-execution-resource-fixtures.js';

const latch = () => { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; };
type RootKind = 'agent' | 'agent_team' | 'agent_org';

/** One root over a neutral adapter double: identity plan → register → prepare → commit → seed. */
function fixture(kind: RootKind) {
  const root = createRootExecutionIdentity({ rootSubjectKind: kind, rootRunId: 'exact-root' });
  const member = (agentRunId: string, memberAddress = `/${agentRunId}`) => createCollaborationMemberExecutionIdentity({ root, memberAddress, agentRunId });
  const resources = new InMemoryTaskExecutionResources();
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
      return { ...input, ownedAgentRunIds: [id], recipientAddress: `/${input.placement}`, target: { root, execution: { agentRunId: id }, ingressAgentRunId: id } };
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
    listTaskExecutions: () => [...committed.keys()].map(agentRunId => ({ agentRunId })), taskExecutionStatus: () => 'offline',
    containsTaskExecution: ref => committed.has('agentRunId' in ref ? ref.agentRunId : ''), publishTaskExecutionsClosed: vi.fn(),
    discardReleasedExecution: vi.fn(), taskExecutionWithIngress: agentRunId => committed.has(agentRunId) ? { agentRunId } : null,
    publishTaskExecutionsReopened: vi.fn(),
    isLive: () => false, assertRestorableChain: () => undefined, restoreChain: async () => undefined, tryShutDownIfQuiet: async () => false,
  };
  const lifecycle = new RootTaskExecutionLifecycle(adapter, { taskExecutionResources: resources });
  const manager = member('manager', '/manager');
  /** DONE: the Task side commits closure, then asks this root to stop exactly the closed agent runs. */
  const done = async () => lifecycle.releaseTaskExecutions(resources.close('task-A'));
  return { root, member, resources, linkAtRegistration, adapter, lifecycle, operations, planned, preparation, seed, wait, done,
    assign: () => lifecycle.delegate({ identity: manager }, { recipient_address: '/worker', task_id: 'task-A' }, 'placement') };
}

describe.each(['agent', 'agent_team', 'agent_org'] as const)('link-before-register Task dispatch under a %s root', kind => {
  it('links the assignment `starting` before registration and marks it started at seed acceptance', async () => {
    const h = fixture(kind);
    const result = await h.assign();
    expect(result).toEqual({ target_agent_run_id: 'copy-1', target_kind: 'agent' });
    // The assignment records the address it was delegated to (the Task root's name).
    expect(h.resources.links[0]).toMatchObject({ role: 'assigned', taskId: 'task-A', assignedBy: 'manager', recipientAddress: '/placement',
      hostRoot: { rootSubjectKind: kind, rootRunId: 'exact-root' }, execution: { agentRunId: 'copy-1' } });
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
    const original = h.resources.linkNewTaskExecution.bind(h.resources);
    h.resources.linkNewTaskExecution = async input => { const linked = await original(input); await h.done(); return linked; };
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
    expect(await stop).toEqual([{ execution: { agentRunId: 'copy-1' }, stopped: false, error: expect.objectContaining({ code: expect.any(String) }) }]);
    h.preparation.resolve();
    expect((await dispatch).target_agent_run_id).toBeNull();
    expect(await h.done()).toEqual([{ execution: { agentRunId: 'copy-1' }, stopped: true }]);
    expect(h.adapter.taskExecutionChainFor('copy-1')).toEqual([]);
    expect(h.resources.entry({ agentRunId: 'copy-1' })).toMatchObject({ open: false, start: 'failed' });
  });

  it('DONE after commit fences the awaited seed; the run is closed and never reported started', async () => {
    const h = fixture(kind); h.wait.seed = true;
    const dispatch = h.assign();
    await vi.waitFor(() => expect(h.adapter.taskExecutionChainFor('copy-1')).toHaveLength(1));
    expect(await h.done()).toEqual([{ execution: { agentRunId: 'copy-1' }, stopped: true }]);
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
    expect(await h.lifecycle.delegate(worker, { recipient_address: '/sub', description: 'sub-work' }, 'placement')).toEqual({ target_agent_run_id: 'copy-2', target_kind: 'agent' });
    expect(h.resources.links[1]).toMatchObject({ role: 'delegated', creator: { agentRunId: 'copy-1' } });
    expect(h.resources.entry({ agentRunId: 'copy-2' })).toMatchObject({ taskId: 'task-A', start: 'started', open: true });
  });

  it('a non-owned sender\'s description-only copy joins a new Task with no Project, returns its task_id, and DONE closes it with its sub-work', async () => {
    const h = fixture(kind);
    const manager = { identity: h.member('manager', '/manager') };
    const result = await h.lifecycle.delegate(manager, { recipient_address: '/reviewer', description: 'Review it' }, 'placement');
    expect(result).toEqual({ target_agent_run_id: 'copy-1', target_kind: 'agent', task_id: 'ad_hoc_task_1' });
    expect(h.resources.links[0]).toMatchObject({ role: 'assigned', assignedBy: 'manager', adHocTask: { description: 'Review it', referenceFiles: [] },
      hostRoot: { rootSubjectKind: kind, rootRunId: 'exact-root' }, execution: { agentRunId: 'copy-1' } });
    expect(h.linkAtRegistration).toEqual(['starting']);
    expect(h.resources.entry({ agentRunId: 'copy-1' })).toMatchObject({ taskId: 'ad_hoc_task_1', start: 'started', open: true });
    // The copy is Task work now: its own description-only sub-work stays in that Task and carries no task_id (REQ-010).
    const copy = { identity: h.member('copy-1', '/reviewer') };
    expect(await h.lifecycle.delegate(copy, { recipient_address: '/sub', description: 'sub-work' }, 'placement')).toEqual({ target_agent_run_id: 'copy-2', target_kind: 'agent' });
    expect(h.resources.entry({ agentRunId: 'copy-2' })).toMatchObject({ taskId: 'ad_hoc_task_1', role: 'delegated' });
    // DONE on that Task stops exactly its runs, and the closed copy no longer takes input.
    expect(await h.lifecycle.releaseTaskExecutions(h.resources.close('ad_hoc_task_1'))).toEqual([
      { execution: { agentRunId: 'copy-1' }, stopped: true }, { execution: { agentRunId: 'copy-2' }, stopped: true }]);
    expect(h.adapter.publishTaskExecutionsClosed).toHaveBeenCalledWith([{ agentRunId: 'copy-1' }, { agentRunId: 'copy-2' }]);
    expect(() => h.lifecycle.assertInputAllowed('copy-1')).toThrow(expect.objectContaining({ code: 'TASK_AGENT_RESOURCE_CLOSED' }));
    expect(h.lifecycle.closedTaskExecutions()).toEqual([{ agentRunId: 'copy-1' }, { agentRunId: 'copy-2' }]);
  });

  it('a linked assignment returns exactly target_agent_run_id; an ad-hoc task_id cannot be assigned (AC-014)', async () => {
    const h = fixture(kind);
    expect(await h.assign()).toEqual({ target_agent_run_id: 'copy-1', target_kind: 'agent' });
    const manager = { identity: h.member('manager', '/manager') };
    await h.lifecycle.delegate(manager, { recipient_address: '/reviewer', description: 'Review it' }, 'placement');
    await expect(h.lifecycle.delegate(manager, { recipient_address: '/w', task_id: 'ad_hoc_task_1' }, 'placement'))
      .rejects.toMatchObject({ code: 'TASK_NOT_FOUND' });
    expect(h.resources.links).toHaveLength(2);
  });

  it('a rejected description-only delegation creates no Task; a failure after the link returns no task_id (REQ-004)', async () => {
    const h = fixture(kind);
    const manager = { identity: h.member('manager', '/manager') };
    await expect(h.lifecycle.delegate(manager, { recipient_address: '/r', description: '  ' }, 'placement')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await expect(h.lifecycle.delegate(manager, { recipient_address: '/r', description: 'x', reference_files: ['relative.md'] }, 'placement'))
      .rejects.toMatchObject({ code: 'INVALID_REFERENCE_FILE' });
    vi.mocked(h.adapter.planActivation).mockRejectedValueOnce(new Error("Agent '/r' was not found."));
    expect(await h.lifecycle.delegate(manager, { recipient_address: '/r', description: 'x' }, 'placement'))
      .toEqual({ target_agent_run_id: null, message: "Agent '/r' was not found." });
    expect(h.resources.adHocTaskIds()).toEqual([]);
    vi.mocked(h.adapter.beginActivation).mockImplementationOnce(() => ({ cancel: vi.fn(), release: vi.fn(async () => ({ accepted: true })),
      prepare: vi.fn(async () => { throw new Error('preparation failed'); }) }) as never);
    expect(await h.lifecycle.delegate(manager, { recipient_address: '/r', description: 'x' }, 'placement'))
      .toEqual({ target_agent_run_id: null, message: 'preparation failed' });
    // The linked copy is recorded failed under its (kept) Task, as for any linked dispatch failure.
    expect(h.resources.adHocTaskIds()).toEqual(['ad_hoc_task_1']);
    expect(h.resources.entry({ agentRunId: 'copy-1' })).toMatchObject({ taskId: 'ad_hoc_task_1', start: 'failed' });
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
    expect(await h.done()).toEqual([{ execution: { agentRunId: 'copy-1' }, stopped: false, error: { code: 'EXACT_CLOSE_FAILED', message: 'provider still running' } }]);
    expect(await h.done()).toEqual([{ execution: { agentRunId: 'copy-1' }, stopped: true }]);
    expect(release).toHaveBeenCalledTimes(2);
    expect(await h.lifecycle.releaseTaskExecutions([{ agentRunId: 'never-linked' }])).toEqual([
      { execution: { agentRunId: 'never-linked' }, stopped: false, error: expect.objectContaining({ code: 'TASK_AGENT_RESOURCE_NOT_CLOSED' }) }]);
  });
});
