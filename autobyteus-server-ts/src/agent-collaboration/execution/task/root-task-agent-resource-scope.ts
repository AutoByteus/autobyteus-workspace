import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { RegisteredTaskActivation, RootTaskExecutionAdapter } from "./root-task-execution-adapter.js";
import {
  taskAgentResourceRejectionCode,
  type TaskAgentResourceOwner,
  type TaskAgentResourcePort,
  type TaskAgentResourceStopResult,
} from "./task-agent-resource-port.js";
import type { TaskExecutionReference } from "./task-execution-reference.js";
import { TaskDelegationError } from "./task-delegation-command.js";
import { listClosedTaskExecutions } from "./task-execution-closure.js";

/** A coded Task-side rejection becomes the runtime's coded delegation error; anything else is unchanged. */
export const asTaskDelegationError = (error: unknown): unknown => {
  const code = taskAgentResourceRejectionCode(error);
  return code && !(error instanceof TaskDelegationError)
    ? new TaskDelegationError(code, error instanceof Error ? error.message : String(error), { cause: error })
    : error;
};
const ask = <T>(question: () => T): T => {
  try { return question(); } catch (error) { throw asTaskDelegationError(error); }
};
/** The root holds no exact release authority for this copy (no registry handle, no retained receipt). */
const NO_AUTHORITY = "EXACT_RELEASE_AUTHORITY_UNAVAILABLE";

/**
 * Stateless per-root Task policy. It stores no Task facts: ownership is asked of the Task side by
 * the agent's containment chain, and agents outside any task copy are never checked at all.
 */
export class RootTaskAgentResourceScope<T> {
  constructor(private readonly adapter: RootTaskExecutionAdapter<T>, private readonly resources?: TaskAgentResourcePort) {}

  port(): TaskAgentResourcePort {
    if (!this.resources) throw new TaskDelegationError("TASK_AGENT_RESOURCES_UNAVAILABLE", "Task agent run resources are unavailable in this scope.");
    return this.resources;
  }

  /** Owner of the copy containing the agent; `null` for unowned agents or when no Task side is bound. */
  ownerOf(agentRunId: string): TaskAgentResourceOwner | null {
    const chain = this.adapter.ownershipChainFor(agentRunId);
    if (!chain.length || !this.resources) return null;
    const resources = this.resources;
    return ask(() => resources.ownerOf(chain));
  }

  /** Description-only work by a non-owned sender needs every Task's data readable (it could not be told apart). */
  assertResourceDataReadable(): void {
    const resources = this.resources;
    if (resources) ask(() => resources.assertResourceDataReadable());
  }

  assertInputAllowed(agentRunId: string): void {
    if (this.ownerOf(agentRunId)?.open === false) throw closed();
  }

  assertMessageScope(senderAgentRunId: string, recipientAgentRunId: string): void {
    const sender = this.ownerOf(senderAgentRunId), recipient = this.ownerOf(recipientAgentRunId);
    if (sender?.open === false || recipient?.open === false) throw closed();
    if (sender && recipient && sender.taskId !== recipient.taskId) {
      throw new TaskDelegationError("TASK_AGENT_RESOURCE_CONFLICT", "A Task-owned worker cannot message another Task's work.");
    }
  }

  /** The closed task executions of this root's current tree (live snapshots read it with the tree). */
  closedTaskExecutions(): readonly TaskExecutionReference[] {
    return listClosedTaskExecutions({ port: this.resources, root: this.adapter.root, contains: reference => this.adapter.containsTaskExecution(reference) });
  }

  /**
   * Stops exactly the given closed agent runs. First, before anything stops, the released runs
   * that are closed and in this root's tree are published as closed (visibility follows closure,
   * not stop success). Every registration and committed copy is cancelled before any await; then
   * every exact release authority the root still holds is invoked, whether or not the copy looks
   * live. `stopped` only when each invoked release is accepted or the root holds no authority at
   * all for the agent run.
   */
  async releaseTaskAgentResources(agentRuns: readonly TaskExecutionReference[]): Promise<readonly TaskAgentResourceStopResult[]> {
    const port = this.port();
    const eligible = agentRuns.map(agentRun => ({ agentRun, closed: isClosed(port, agentRun) }));
    const closedInTree = eligible.flatMap(entry => entry.closed && this.adapter.containsTaskExecution(entry.agentRun) ? [entry.agentRun] : []);
    if (closedInTree.length) this.adapter.publishTaskExecutionsClosed(Object.freeze(closedInTree));
    const registered = eligible.map(entry => entry.closed ? this.adapter.registrationFor(entry.agentRun) : null);
    eligible.forEach((entry, index) => {
      if (!entry.closed) return;
      registered[index]?.operation.cancel();
      this.adapter.cancelOwnedExecution(entry.agentRun);
    });
    return Promise.all(eligible.map(({ agentRun, closed: wasClosed }, index): Promise<TaskAgentResourceStopResult> => wasClosed
      ? this.settleExactRelease(agentRun, registered[index] ?? null)
      : Promise.resolve({ agentRun, stopped: false, error: { code: "TASK_AGENT_RESOURCE_NOT_CLOSED", message: "Only a closed Task agent run is stopped." } })));
  }

  /**
   * Reactivation of one closed copy: settles its previous stop by invoking every exact release
   * authority the root still holds (idempotent, as a repeated DONE does), then drops that released
   * authority so restore builds a fresh copy. While a release is unconfirmed nothing is dropped and
   * it rejects TASK_REACTIVATION_STOP_PENDING.
   */
  async discardReleasedExecution(agentRun: TaskExecutionReference): Promise<void> {
    const registration = this.adapter.registrationFor(agentRun);
    registration?.operation.cancel();
    this.adapter.cancelOwnedExecution(agentRun);
    const settled = await this.settleExactRelease(agentRun, registration);
    if (!settled.stopped) {
      throw new TaskDelegationError("TASK_REACTIVATION_STOP_PENDING",
        `The previous stop of this Task work has not finished (${settled.error?.message ?? "release pending"}); try again shortly.`);
    }
    this.adapter.discardReleasedExecution(agentRun);
  }

  /** `stopped` only when each invoked release is accepted or the root holds no authority at all for the agent run. */
  private async settleExactRelease(agentRun: TaskExecutionReference, registration: RegisteredTaskActivation | null): Promise<TaskAgentResourceStopResult> {
    const releases: Promise<AgentOperationResult>[] = [this.adapter.releaseOwnedExecution(agentRun)];
    if (registration) releases.push(registration.operation.release());
    const settled = await Promise.allSettled(releases);
    const fault = settled.find((value): value is PromiseRejectedResult => value.status === "rejected");
    if (fault) {
      return { agentRun, stopped: false, error: { code: "TASK_RELEASE_FAILED", message: fault.reason instanceof Error ? fault.reason.message : String(fault.reason) } };
    }
    const refused = settled.flatMap(value => value.status === "fulfilled" ? [value.value] : [])
      .find(result => !result.accepted && result.code !== NO_AUTHORITY);
    return refused ? { agentRun, stopped: false, error: { code: refused.code ?? "TASK_RELEASE_PENDING",
      message: refused.message ?? "Exact release was not confirmed; repeat DONE." } } : { agentRun, stopped: true };
  }
}

const closed = () => new TaskDelegationError("TASK_AGENT_RESOURCE_CLOSED", "The Task work for this agent run is closed (Task DONE).");
const isClosed = (port: TaskAgentResourcePort, agentRun: TaskExecutionReference): boolean => {
  try { return port.ownerOf([agentRun])?.open === false; } catch { return false; }
};
