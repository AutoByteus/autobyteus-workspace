import type { RootTaskExecutionAdapter } from './root-task-execution-adapter.js';
import type { TaskExecutionLifetimePort, TaskExecutionReleaseOutcome, TaskLifetimeAdmission } from './task-execution-lifetime.js';
import { taskExecutionReferenceKey, type TaskExecutionReference } from './task-execution-reference.js';
import { TaskDelegationError } from './task-delegation-command.js';

/** Business authority is checked durably before wake; retained latches fence actual synchronous input. */
export class RootTaskLifetimeScope<T> {
  private readonly fences = new Map<string, () => void>();
  private readonly closed = new Set<string>();
  constructor(private readonly adapter: RootTaskExecutionAdapter<T>, private readonly lifetimePort?: TaskExecutionLifetimePort) {}
  port(): TaskExecutionLifetimePort {
    if (!this.lifetimePort) throw new TaskDelegationError('TASK_LIFETIME_UNAVAILABLE', 'Task lifetime authority is unavailable.');
    return this.lifetimePort;
  }
  async acquire(id: string): Promise<TaskLifetimeAdmission> {
    if (this.closed.has(id)) this.rejectClosed();
    const admission = await this.port().acquireAdmission(id);
    this.fences.set(id, admission.assertOpen);
    try { admission.assertOpen(); return admission; }
    catch (error) { admission.release(); throw error; }
  }
  assertInputAllowed(agentRunId: string): void {
    const stamp = this.adapter.lifetimeForAgent(agentRunId);
    if (!stamp) return;
    if (this.closed.has(stamp.lifetimeId)) this.rejectClosed();
    const fence = this.fences.get(stamp.lifetimeId);
    if (!fence) throw new TaskDelegationError('TASK_LIFETIME_UNAVAILABLE', 'Owned input requires a current durable lifetime admission.');
    fence();
  }
  async acquireForAgent(agentRunId: string): Promise<TaskLifetimeAdmission | undefined> {
    const stamp = this.adapter.lifetimeForAgent(agentRunId);
    if (!stamp) return undefined;
    const admission = await this.acquire(stamp.lifetimeId);
    try {
      for (const reference of this.adapter.taskExecutionChainFor(agentRunId)) {
        const identity = this.adapter.linkForExecution(reference);
        if (!identity) continue; // Only unlinked ancestors may be unstamped.
        const actual = this.adapter.ownedExecutions(stamp.lifetimeId).some(ref => taskExecutionReferenceKey(ref) === taskExecutionReferenceKey(reference));
        if (!actual) throw new TaskDelegationError('TASK_LIFETIME_CONFLICT', 'Physical ownership contains an independent Task lifetime.');
        await this.port().assertExecutionLinked(stamp.lifetimeId, identity);
        admission.assertOpen();
      }
      return admission;
    } catch (error) { admission.release(); throw error; }
  }
  assertMessageScope(senderAgentRunId: string, recipientAgentRunId: string): void {
    this.assertInputAllowed(senderAgentRunId);
    this.assertInputAllowed(recipientAgentRunId);
    const sender = this.adapter.lifetimeForAgent(senderAgentRunId), recipient = this.adapter.lifetimeForAgent(recipientAgentRunId);
    if (sender && recipient && sender.lifetimeId !== recipient.lifetimeId) {
      throw new TaskDelegationError('TASK_LIFETIME_CONFLICT', 'A Task-owned worker cannot borrow another Task-owned execution.');
    }
  }
  async release(id: string, requested: readonly TaskExecutionReference[]): Promise<readonly TaskExecutionReleaseOutcome[]> {
    await this.port().assertClosed(id);
    this.closed.add(id);
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
    // Unreserved registrations are still cancelled/released, but are not invented business links.
    const durable = new Set(requested.map(taskExecutionReferenceKey));
    return outcomes.filter(outcome => durable.has(taskExecutionReferenceKey(outcome.execution)));
  }
  private rejectClosed(): never { throw new TaskDelegationError('TASK_LIFETIME_CLOSED', 'The Task execution lifetime is permanently closed.'); }
}
