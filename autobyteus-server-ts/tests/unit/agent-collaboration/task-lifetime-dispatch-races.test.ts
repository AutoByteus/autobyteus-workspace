import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectStore } from '../../../src/projects/stores/project-store.js';
import { ProjectService } from '../../../src/projects/services/project-service.js';
import { ProjectTaskService } from '../../../src/projects/services/project-task-service.js';
import { ProjectTaskContextStore } from '../../../src/projects/context/project-task-context-store.js';
import { ProjectTaskContextLayout } from '../../../src/projects/context/project-task-context-layout.js';
import { RootTaskExecutionLifecycle } from '../../../src/agent-collaboration/execution/task/root-task-execution-lifecycle.js';
import { TaskLifetimeGate } from '../../../src/agent-collaboration/execution/task/task-lifetime-gate.js';
import { createRootExecutionIdentity, createCollaborationMemberExecutionIdentity } from '../../../src/agent-collaboration/execution/domain/root-execution-identity.js';
import type { RootTaskExecutionAdapter, TaskExecutionActivationPlan, TaskExecutionActivationOperation } from '../../../src/agent-collaboration/execution/task/root-task-execution-adapter.js';
const dirs: string[] = [];
afterEach(async () => { for (const dir of dirs.splice(0)) await fs.rm(dir, { recursive: true, force: true }); });
const latch = () => { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; };
type RootKind = 'agent' | 'agent_team' | 'agent_org';
async function fixture(kind: RootKind) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'task-dispatch-race-')); dirs.push(dir);
  const store = new ProjectStore({ getAppDataDir: () => dir });
  const contextStore = new ProjectTaskContextStore(new ProjectTaskContextLayout(path.join(dir, 'projects')));
  const projectId = (await new ProjectService({ store, contextStore }).createProject({ name: 'test-owned' })).projectId;
  const root = createRootExecutionIdentity({ rootSubjectKind: kind, rootRunId: 'exact-root' });
  const identity = createCollaborationMemberExecutionIdentity({ root, memberAddress: '/manager', agentRunId: 'manager' });
  const planned = latch(), preparation = latch(), seed = latch();
  let waitPlan = false, waitPrepare = false, waitSeed = false, cancelled = false, settled = false, committed = false;
  let registered: { plan: TaskExecutionActivationPlan<string>; operation: TaskExecutionActivationOperation } | undefined;
  const operation: TaskExecutionActivationOperation = {
    cancel: vi.fn(() => { cancelled = true; }),
    release: vi.fn(async () => { cancelled = true; return { accepted: settled }; }),
    prepare: vi.fn(async () => {
      if (waitPrepare) await preparation.promise;
      settled = true;
      if (cancelled) throw new Error('late owned preparation cancelled');
      return { targetAgentRunId: 'copy-coordinator',
        commit: vi.fn(async () => { if (cancelled) throw new Error('commit closed'); committed = true; return { committed: true as const }; }),
        acceptSeed: vi.fn(async assertOpen => { if (waitSeed) await seed.promise; assertOpen(); return { accepted: true }; }),
      };
    }),
  };
  const adapter: RootTaskExecutionAdapter<string> = {
    root, isOpen: () => true, authorize: () => undefined, assertCurrentSchemaReady: () => undefined,
    planActivation: vi.fn(async input => {
      if (waitPlan) await planned.promise;
      return { ...input, ownedAgentRunIds: ['copy-coordinator', 'copy-member'], link: { root, execution: { teamRunId: 'copy-team' }, ingressAgentRunId: 'copy-coordinator', purpose: input.taskLifetime!.purpose } };
    }),
    beginActivation: vi.fn(plan => { registered = { plan, operation }; return operation; }),
    registeredActivations: id => registered?.plan.taskLifetime?.lifetimeId === id ? [registered] : [],
    // This unit witnesses the neutral private boundary, not a concrete provider or subject tree.
    ownedExecutions: () => committed && registered ? [registered.plan.link.execution] : [], linkForExecution: () => committed ? registered?.plan.link ?? null : null,
    findLifetimeHelper: () => null, lifetimeForAgent: () => undefined,
    cancelOwnedExecution: vi.fn(), releaseOwnedExecution: vi.fn(async () => ({ accepted: settled })),
    taskExecutionChainFor: () => [], isLive: () => false, assertRestorableChain: () => undefined,
    restoreChain: async () => undefined, tryShutDownIfQuiet: async () => false,
  };
  let lifecycle!: RootTaskExecutionLifecycle<string>;
  let gate!: TaskLifetimeGate;
  const gateAtRelease: string[] = [];
  const tasks = new ProjectTaskService({ store, contextStore, closureListener: { onLifetimesClosed: ids => gate.onLifetimesClosed(ids) },
    requestRuntimeRelease: (tag, id, refs) => {
      expect(tag).toEqual(root);
      try { gate.assertOpen(id); gateAtRelease.push('open'); } catch (error) { gateAtRelease.push((error as { code: string }).code); }
      return lifecycle.releaseTaskLifetime(id, refs);
    } });
  gate = new TaskLifetimeGate(tasks);
  lifecycle = new RootTaskExecutionLifecycle(adapter, { taskLifetimes: { port: tasks, gate } });
  const task = await tasks.createTask({ projectId, description: 'saved authoritative packet' });
  return { store, tasks, gate, gateAtRelease, adapter, lifecycle, operation, projectId, task,
    waitPlan: () => { waitPlan = true; }, waitPrepare: () => { waitPrepare = true; }, waitSeed: () => { waitSeed = true; },
    planned, preparation, seed, dispatch: () => lifecycle.delegate({ identity }, { recipient_address: '/worker', task_id: task.taskId }, 'placement') };
}

describe.each(['agent', 'agent_team', 'agent_org'] as const)('neutral lifetime dispatch with tagged %s authority', kind => {
  it('DONE during identity-only planning makes zero provider preparations/reservations', async () => {
    const h = await fixture(kind); h.waitPlan();
    const dispatch = h.dispatch(); await vi.waitFor(() => expect(h.adapter.planActivation).toHaveBeenCalledOnce());
    await h.tasks.updateTask({ projectId: h.projectId, taskId: h.task.taskId, status: 'DONE' });
    h.planned.resolve();
    expect((await dispatch).target_agent_run_id).toBeNull();
    expect(h.adapter.beginActivation).not.toHaveBeenCalled(); expect(h.operation.prepare).not.toHaveBeenCalled();
    expect((await h.store.readState()).taskLifetimes[0]!.executions).toEqual([]);
  });
  it('DONE after reservation cancels before release, retains late preparation, and never commits/seeds', async () => {
    const h = await fixture(kind); h.waitPrepare(); const dispatch = h.dispatch();
    await vi.waitFor(() => expect(h.operation.prepare).toHaveBeenCalledOnce());
    expect((await h.store.readState()).taskLifetimes[0]!.executions[0]).toMatchObject({ dispatch: 'reserved', execution: { teamRunId: 'copy-team' }, ingressAgentRunId: 'copy-coordinator' });
    await h.tasks.updateTask({ projectId: h.projectId, taskId: h.task.taskId, status: 'DONE' }); await h.tasks.drainRuntimeReleases();
    expect(h.operation.cancel).toHaveBeenCalled();
    expect((await h.store.readState()).taskLifetimes[0]!.executions[0]!.cleanup).toBe('pending');
    h.preparation.resolve(); expect((await dispatch).target_agent_run_id).toBeNull();
    await h.tasks.updateTask({ projectId: h.projectId, taskId: h.task.taskId, status: 'DONE' }); await h.tasks.drainRuntimeReleases();
    expect((await h.store.readState()).taskLifetimes[0]).toMatchObject({ completedAt: expect.any(String), executions: [expect.objectContaining({ dispatch: 'failed', cleanup: 'released' })] });
    expect(h.operation.prepare).toHaveBeenCalledOnce();
  });
  it('DONE commit latches the shared gate synchronously, before the release request runs', async () => {
    const h = await fixture(kind); h.waitSeed(); const dispatch = h.dispatch();
    await vi.waitFor(async () => expect((await h.store.readState()).taskLifetimes[0]!.executions[0]!.dispatch).toBe('admitted'));
    const lifetimeId = (await h.store.readState()).taskLifetimes[0]!.lifetimeId;
    expect(() => h.gate.assertOpen(lifetimeId)).not.toThrow();
    await h.tasks.updateTask({ projectId: h.projectId, taskId: h.task.taskId, status: 'DONE' });
    expect(() => h.gate.assertOpen(lifetimeId)).toThrow(expect.objectContaining({ code: 'TASK_LIFETIME_CLOSED' }));
    expect(h.gateAtRelease).toEqual(['TASK_LIFETIME_CLOSED']);
    await h.tasks.drainRuntimeReleases(); h.seed.resolve(); await dispatch;
  });
  it('DONE after durable admission fences deferred awaited seed acceptance; no reported delivery', async () => {
    const h = await fixture(kind); h.waitSeed(); const dispatch = h.dispatch();
    await vi.waitFor(async () => expect((await h.store.readState()).taskLifetimes[0]!.executions[0]!.dispatch).toBe('admitted'));
    await h.tasks.updateTask({ projectId: h.projectId, taskId: h.task.taskId, status: 'DONE' }); await h.tasks.drainRuntimeReleases();
    h.seed.resolve(); expect((await dispatch).target_agent_run_id).toBeNull();
    expect((await h.store.readState()).taskLifetimes[0]!.executions[0]).toMatchObject({ dispatch: 'failed', cleanup: 'released' });
    expect(h.operation.prepare).toHaveBeenCalledOnce();
  });
});
