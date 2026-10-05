import type { RootTaskExecutionAdapter } from './root-task-execution-adapter.js';
import type { TaskExecutionLifetimePort, TaskExecutionReleaseOutcome, TaskLifetimeAdmission, TaskLifetimeReleaseReport } from './task-execution-lifetime.js';
import type { TaskLifetimeRuntime } from './task-lifetime-gate.js';
import { taskExecutionReferenceKey, type TaskExecutionReference } from './task-execution-reference.js';
import { TaskDelegationError } from './task-delegation-command.js';

/**
 * Stateless per-root lifetime policy over the root adapter and the shared process binding.
 * Durable authority is the port; the only runtime closure latch is the shared TaskLifetimeGate.
 */
export class RootTaskLifetimeScope<T> {
  constructor(private readonly adapter: RootTaskExecutionAdapter<T>, private readonly runtime?: TaskLifetimeRuntime) {}
  port(): TaskExecutionLifetimePort { return this.bound().port; }
  acquire(id: string): Promise<TaskLifetimeAdmission> { return this.bound().gate.admit(id); }
  assertInputAllowed(agentRunId: string): void {
    const stamp = this.adapter.lifetimeForAgent(agentRunId);
    if (stamp) this.bound().gate.assertOpen(stamp.lifetimeId);
  }
  async acquireForAgent(agentRunId: string): Promise<TaskLifetimeAdmission | undefined> {
    const stamp = this.adapter.lifetimeForAgent(agentRunId);
    if (!stamp) return undefined;
    const admission = await this.acquire(stamp.lifetimeId);
    for (const reference of this.adapter.taskExecutionChainFor(agentRunId)) {
      const identity = this.adapter.linkForExecution(reference);
      if (!identity) continue; // Only unlinked ancestors may be unstamped.
      const actual = this.adapter.ownedExecutions(stamp.lifetimeId).some(ref => taskExecutionReferenceKey(ref) === taskExecutionReferenceKey(reference));
      if (!actual) throw new TaskDelegationError('TASK_LIFETIME_CONFLICT', 'Physical ownership contains an independent Task lifetime.');
      await this.port().assertExecutionLinked(stamp.lifetimeId, identity);
      admission.assertOpen();
    }
    return admission;
  }
  assertMessageScope(senderAgentRunId: string, recipientAgentRunId: string): void {
    this.assertInputAllowed(senderAgentRunId);
    this.assertInputAllowed(recipientAgentRunId);
    const sender = this.adapter.lifetimeForAgent(senderAgentRunId), recipient = this.adapter.lifetimeForAgent(recipientAgentRunId);
    if (sender && recipient && sender.lifetimeId !== recipient.lifetimeId) {
      throw new TaskDelegationError('TASK_LIFETIME_CONFLICT', 'A Task-owned worker cannot borrow another Task-owned execution.');
    }
  }
  /** Durable links are membership; registered attempts and stamped executions are a safety sweep. */
  async release(id: string, requested: readonly TaskExecutionReference[]): Promise<TaskLifetimeReleaseReport> {
    await this.bound().gate.confirmClosed(id);
    const registered = this.adapter.registeredActivations(id);
    const owned = this.adapter.ownedExecutions(id);
    const controls = new Map(registered.map(entry => [taskExecutionReferenceKey(entry.plan.link.execution), entry.operation]));
    const references = new Map([...requested, ...registered.map(entry => entry.plan.link.execution), ...owned]
      .map(ref => [taskExecutionReferenceKey(ref), ref]));
    // Cancellation precedes all asynchronous drains/stops; a slow acquisition cannot hold siblings hostage.
    registered.forEach(entry => entry.operation.cancel());
    owned.forEach(reference => this.adapter.cancelOwnedExecution(reference));
    const outcomes = await Promise.all([...references].map(async ([key, execution]): Promise<TaskExecutionReleaseOutcome> => {
      try {
        const actual = this.adapter.linkForExecution(execution);
        if (actual && !owned.some(ref => taskExecutionReferenceKey(ref) === key)) {
          return { execution, cleanup: 'failed', error: { code: 'TASK_LIFETIME_CONFLICT', message: 'Exact reference belongs to another lifetime.' } };
        }
        const proofs = [];
        if (controls.has(key)) proofs.push(controls.get(key)!.release());
        if (actual || !controls.has(key)) proofs.push(this.adapter.releaseOwnedExecution(execution));
        const settled = await Promise.allSettled(proofs);
        const faults = settled.flatMap(value => value.status === "rejected" ? [value.reason] : []);
        if (faults.length) throw new AggregateError(faults, "Exact Task execution cleanup failed.");
        const result = settled.flatMap(value => value.status === "fulfilled" ? [value.value] : [])
          .find(value => !value.accepted) ?? { accepted: true };
        return result.accepted ? { execution, cleanup: 'released' } : { execution, cleanup: 'pending',
          error: { code: result.code ?? 'TASK_RELEASE_PENDING', message: result.message ?? 'Exact release proof is unavailable; retry DONE.' } };
      } catch (error) {
        return { execution, cleanup: 'failed', error: { code: 'TASK_RELEASE_FAILED', message: error instanceof Error ? error.message : String(error) } };
      }
    }));
    // Registered attempts outside the request belong to their dispatching operation and are not reported.
    const durable = new Set(requested.map(taskExecutionReferenceKey));
    const stamped = new Set(owned.map(taskExecutionReferenceKey));
    const keyOf = (outcome: TaskExecutionReleaseOutcome) => taskExecutionReferenceKey(outcome.execution);
    return Object.freeze({
      requested: outcomes.filter(outcome => durable.has(keyOf(outcome))),
      unrequested: outcomes.filter(outcome => !durable.has(keyOf(outcome)) && stamped.has(keyOf(outcome))),
    });
  }
  private bound(): TaskLifetimeRuntime {
    if (!this.runtime) throw new TaskDelegationError('TASK_LIFETIME_UNAVAILABLE', 'Task lifetime authority is unavailable.');
    return this.runtime;
  }
}
