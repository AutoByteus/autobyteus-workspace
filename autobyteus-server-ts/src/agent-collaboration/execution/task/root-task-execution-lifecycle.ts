import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import { messagePlacement } from "../../collaborators/message-recipient-resolution.js";
import { dispatchTaskCopy, type TaskAgentResourceJoin } from "./root-task-dispatch.js";
import { RootTaskAgentResourceScope, asTaskDelegationError } from "./root-task-agent-resource-scope.js";
import { taskReactivationRejectionCode, type TaskAgentResourcePort, type TaskAgentResourceStopResult } from "./task-agent-resource-port.js";
import type { CollaborationMemberExecutionIdentity } from "../domain/root-execution-identity.js";
import type { AgentExecutionStatus } from "@autobyteus/collaboration-stream-contracts";
import type {
  RootTaskExecutionAdapter,
} from "./root-task-execution-adapter.js";
import { RootTaskExecutionCommandQueue } from "./root-task-execution-command-queue.js";
import {
  TaskDelegationError,
  type DelegateTaskInput,
  type DelegateTaskResult,
  type TaskDelegationContext,
} from "./task-delegation-command.js";
import {
  buildTaskAssigneeWorkPacket,
  requireTaskString,
  validateTaskReferenceFiles,
} from "./task-execution-input.js";
import type { TaskExecutionReference } from "./task-execution-reference.js";

/**
 * Root-neutral resource lifecycle for delegated children (task executions) of
 * one root. It owns delegation admission, the serialized activation / wake /
 * reopen FIFO and restore-before-delivery. A copy stays live until its Task is
 * DONE or the root stops; nothing shuts it down for being idle. It owns no
 * subject tree, index or store; the subject adapter owns those.
 */
export class RootTaskExecutionLifecycle<TPlacement> {
  private readonly queue = new RootTaskExecutionCommandQueue();
  private accepting = true;
  private readonly resourceScope: RootTaskAgentResourceScope<TPlacement>;
  private readonly helperAttempts = new Map<string, Promise<DelegateTaskResult>>();

  constructor(
    private readonly adapter: RootTaskExecutionAdapter<TPlacement>,
    options: Readonly<{ taskAgentResources?: TaskAgentResourcePort }> = {},
  ) {
    this.resourceScope = new RootTaskAgentResourceScope(adapter, options.taskAgentResources);
  }

  /** Root termination: stop admitting commands. */
  closeExternalAdmission(): void {
    this.accepting = false;
    this.queue.closeExternalAdmission();
    // Every task execution of a root that no longer admits work reports offline.
    this.resourceScope.taskExecutionsStatusChanged(this.adapter.listTaskExecutions());
  }

  enterRootFailStop(): void {
    this.accepting = false;
    this.queue.enterRootFailStop();
    this.resourceScope.taskExecutionsStatusChanged(this.adapter.listTaskExecutions());
  }

  /** A copy's own live status (Agent status, or folded Team status); `offline` once the root stops admitting. Wakes nothing. */
  taskExecutionStatus(reference: TaskExecutionReference): AgentExecutionStatus {
    if (!this.accepting) return "offline";
    try { return this.adapter.taskExecutionStatus(reference); }
    catch (error) { console.warn("TASK_EXECUTION_STATUS_UNAVAILABLE", error); return "offline"; }
  }

  drain(): Promise<void> { return this.queue.drain(); }

  async delegate(
    context: TaskDelegationContext,
    input: DelegateTaskInput,
    placement: TPlacement,
  ): Promise<DelegateTaskResult> {
    this.assertAdmitting(context.identity);
    this.adapter.assertCurrentSchemaReady();
    const linked = Object.prototype.hasOwnProperty.call(input, "task_id");
    const allowed = linked ? ["recipient_address", "task_id"] : ["recipient_address", "description", "reference_files"];
    if (Object.keys(input).some(key => !allowed.includes(key))) throw new TaskDelegationError("VALIDATION_ERROR", "Delegation accepts exactly one work source.");
    const owner = this.resourceScope.ownerOf(context.identity.agentRunId);
    let description: string, referenceFiles: readonly string[];
    let join: TaskAgentResourceJoin;
    if (linked) {
      if (owner) throw new TaskDelegationError("TASK_AGENT_RESOURCE_OWNED_SENDER", "Task workers delegate sub-work without task_id.");
      const taskId = requireTaskString(input.task_id, "task_id");
      const saved = await this.resourceScope.port().resolveAssignment(taskId).catch(error => { throw asTaskDelegationError(error); });
      description = saved.description;
      referenceFiles = await validateTaskReferenceFiles(saved.referenceFiles);
      join = { role: "assigned", taskId, assignedBy: context.identity.agentRunId };
    } else {
      if (owner && !owner.open) throw new TaskDelegationError("TASK_AGENT_RESOURCE_CLOSED", "The Task work for this agent run is closed (Task DONE).");
      // An unowned copy could not be told apart from an unreadable Task's work: reject before any planning.
      if (!owner) this.resourceScope.assertResourceDataReadable();
      description = requireTaskString(input.description, "description");
      referenceFiles = await validateTaskReferenceFiles(input.reference_files ?? []);
      // Sub-work of Task work stays that Task's; otherwise the copy gets its own Task with no Project.
      join = owner
        ? { role: "delegated", creator: owner.agentRun }
        : { role: "assigned", assignedBy: context.identity.agentRunId, adHocTask: { description, referenceFiles } };
    }
    return dispatchTaskCopy({ adapter: this.adapter, queue: this.queue, context, placement,
      workPacket: buildTaskAssigneeWorkPacket({ delegator: context.identity, description, referenceFiles }),
      join, resources: this.resourceScope.port(),
      assertAdmitting: () => this.assertAdmitting(context.identity),
    });
  }

  assertInputAllowed(agentRunId: string): void { this.resourceScope.assertInputAllowed(agentRunId); }
  assertMessageScope(sender: string, recipient: string): void { this.resourceScope.assertMessageScope(sender, recipient); }
  /** The Task owning the copy that contains the agent, as an opaque key; `null` when unowned. */
  taskOwnerOf(agentRunId: string): Readonly<{ taskId: string }> | null {
    const owner = this.resourceScope.ownerOf(agentRunId);
    return owner ? { taskId: owner.taskId } : null;
  }
  releaseTaskAgentResources(agentRuns: readonly TaskExecutionReference[]): Promise<readonly TaskAgentResourceStopResult[]> {
    return this.resourceScope.releaseTaskAgentResources(agentRuns);
  }
  /** Closed (Task DONE) task executions of the root's current tree, for its package snapshot. */
  closedTaskExecutions(): readonly TaskExecutionReference[] { return this.resourceScope.closedTaskExecutions(); }

  /** One seedless brought-in copy per Task/address among the Task's open helpers. */
  async ensureTaskHelper(context: TaskDelegationContext, address: string, placement: TPlacement): Promise<DelegateTaskResult> {
    const owner = this.resourceScope.ownerOf(context.identity.agentRunId);
    if (!owner) throw new TaskDelegationError("TASK_AGENT_RESOURCES_UNAVAILABLE", "Helper bring-in requires a Task-owned sender.");
    if (!owner.open) throw new TaskDelegationError("TASK_AGENT_RESOURCE_CLOSED", "The Task work for this agent run is closed (Task DONE).");
    const existing = this.helperPlacement(owner.taskId, address);
    if (existing) return { target_agent_run_id: existing.receiver.agentRunId, target_kind: existing.kind === "agent" ? "agent" : "team" };
    const key = `${owner.taskId}:${address}`;
    const pending = this.helperAttempts.get(key);
    if (pending) return pending;
    const attempt = dispatchTaskCopy({ adapter: this.adapter, queue: this.queue, context, placement,
      join: { role: "broughtIn", creator: owner.agentRun }, resources: this.resourceScope.port(),
      assertAdmitting: () => this.assertAdmitting(context.identity),
    });
    this.helperAttempts.set(key, attempt);
    try { return await attempt; } finally { if (this.helperAttempts.get(key) === attempt) this.helperAttempts.delete(key); }
  }

  helperPlacement(taskId: string, address: string) {
    const helper = this.adapter.taskExecutionAt(address, this.resourceScope.port().openAgentRuns(taskId, "broughtIn"));
    return helper ? messagePlacement("agentRunId" in helper.execution ? "agent" : "agent_team", address,
      { agentRunId: helper.ingressAgentRunId, address }) : null;
  }

  /**
   * Actual input fence shared by all root facades: at the queue head, checks that input is allowed,
   * restores every non-live task execution containing the agent (outermost first), re-checks, then
   * runs the operation. Coded refusals before the queued restore settles (closed root or Task work,
   * unavailable context, failed restore) are returned as a rejected result.
   */
  async withLiveChain(agentRunId: string, operation: () => Promise<AgentOperationResult>): Promise<AgentOperationResult> {
    try {
      if (!this.accepting) {
        throw new TaskDelegationError("ROOT_RUN_NOT_ACTIVE", "The collaboration root is not accepting deliveries.");
      }
      // The Task side's loaded records are the authority: no durable read, closed stays closed after restart.
      this.resourceScope.assertInputAllowed(agentRunId);
      await this.queue.submit({ kind: "wake", executeAtQueueHead: () => this.restoreChainAtHead(agentRunId) });
    } catch (error) {
      if (error instanceof TaskDelegationError) return { accepted: false, code: error.code, message: error.message };
      throw error;
    }
    this.resourceScope.assertInputAllowed(agentRunId);
    return operation();
  }

  /**
   * `send_message_to(run ID)` from a sender in this root. A target in closed Task work is first
   * reactivated when it is an assignment's ingress, the sender is its assigner and the Task is not
   * DONE; any other closed target is refused with guidance and nothing changes. The delivery then
   * follows the normal wake / restore path for the sender's chain (`withLiveChain`).
   */
  async deliverToExactTarget(senderAgentRunId: string, targetAgentRunId: string,
    deliver: () => Promise<AgentOperationResult>): Promise<AgentOperationResult> {
    let reactivated: boolean;
    try { reactivated = await this.reactivateClosedTarget(senderAgentRunId, targetAgentRunId); }
    catch (error) {
      const code = error instanceof TaskDelegationError ? error.code : taskReactivationRejectionCode(error);
      if (code) return { accepted: false, code, message: errorMessage(error) };
      throw error;
    }
    const result = await this.withLiveChain(senderAgentRunId, deliver);
    if (!reactivated) return result;
    return result.accepted
      ? { ...result, message: `${result.message ?? `Delivered message to ${targetAgentRunId}.`} ${targetAgentRunId} was reactivated.` }
      : { ...result, message: `${result.message ?? "The message was not delivered."} ${targetAgentRunId} was reactivated (its Task work is open again) but did not receive this message; message it again.` };
  }

  /** DS-L1. `true` only when this call committed the reopen. Every refusal before the commit leaves the Task and its entries unchanged. */
  private async reactivateClosedTarget(senderAgentRunId: string, targetAgentRunId: string): Promise<boolean> {
    if (this.resourceScope.ownerOf(targetAgentRunId)?.open !== false) return false;
    if (!this.accepting) throw new TaskDelegationError("ROOT_RUN_NOT_ACTIVE", "The collaboration root is not accepting deliveries.");
    const agentRun = this.adapter.taskExecutionWithIngress(targetAgentRunId);
    if (!agentRun) {
      throw new TaskDelegationError("TASK_AGENT_RESOURCE_CLOSED", "This run is part of closed Task work. Only the run that assigned the work "
        + "can reactivate it: move the Task to TODO or IN_PROGRESS, then message the run ID delegate_task returned (for a Team, its coordinator).");
    }
    const port = this.resourceScope.port();
    const request = { agentRun, requestedBy: senderAgentRunId };
    await port.assertReopenable(request);
    await this.queue.submit({ kind: "reopen", executeAtQueueHead: async () => {
      if (!this.accepting) throw new TaskDelegationError("ROOT_RUN_NOT_ACTIVE", "The collaboration root is not accepting deliveries.");
      // A concurrent reactivation already reopened (and may have restored) it: never release that copy.
      if (port.isOpen(agentRun)) return;
      await this.resourceScope.discardReleasedExecution(agentRun);
      this.adapter.assertRestorableChain(targetAgentRunId);
    } });
    const { reopened } = await port.reopenAssignment(request);
    if (reopened) this.adapter.publishTaskExecutionsReopened(Object.freeze([agentRun]));
    return reopened;
  }

  /**
   * Status of any agent in the root: the copies containing the agent may show a new status, which
   * the Task side reads later. It schedules nothing; a quiet copy stays live.
   */
  onAgentStatus(agentRunId: string): void {
    const chain = this.adapter.taskExecutionChainFor(agentRunId);
    if (chain.length) this.resourceScope.taskExecutionsStatusChanged(chain);
  }

  private async restoreChainAtHead(agentRunId: string): Promise<void> {
    if (!this.accepting) {
      throw new TaskDelegationError("ROOT_RUN_NOT_ACTIVE", "The collaboration root is not accepting deliveries.");
    }
    const assertOpen = () => this.resourceScope.assertInputAllowed(agentRunId);
    assertOpen();
    if (!this.adapter.taskExecutionChainFor(agentRunId).length) return;
    this.adapter.assertRestorableChain(agentRunId);
    try {
      await this.adapter.restoreChain(agentRunId, assertOpen);
      assertOpen();
    } catch (error) {
      if (error instanceof TaskDelegationError) throw error;
      throw new TaskDelegationError(
        "TASK_EXECUTION_RESTORE_FAILED",
        `The delegated execution for AgentRun '${agentRunId}' could not be restored: ${errorMessage(error)}`,
        { cause: error },
      );
    }
  }

  private assertAdmitting(identity: CollaborationMemberExecutionIdentity): void {
    if (!this.accepting || !this.adapter.isOpen()) {
      throw new TaskDelegationError("ROOT_RUN_NOT_ACTIVE", "The collaboration root is not accepting task commands.");
    }
    this.adapter.authorize(identity);
  }
}

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);
