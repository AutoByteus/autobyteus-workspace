import type { RemoteRunLinks } from "../remote/remote-run-links.js";
import { REMOTE_ROOT_REFUSAL_TEXT } from "../remote/remote-refusal-codes.js";
import { remoteTeamCoordinatorRunId } from "../../../run-history/domain/run-execution-tree-shared-records.js";

/**
 * The narrow port a lifecycle gets from its root: which run IDs are runs on a peer node (AR-003), and which
 * team run IDs are Team runs on a peer node (autobyteus-247 G-3).
 */
export type RemoteEndpointLookup = Readonly<{ isRemoteEndpoint(agentRunId: string): boolean; isRemoteTeam(teamRunId: string): boolean }>;
const NO_REMOTE_ENDPOINTS: RemoteEndpointLookup = Object.freeze({ isRemoteEndpoint: () => false, isRemoteTeam: () => false });
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import { dispatchTaskCopy, type TaskExecutionJoin } from "./root-task-dispatch.js";
import { notACopyOfThisRun, resolveExistingCopy } from "./existing-copy-target.js";
import { RootTaskExecutionResourceScope, asTaskDelegationError } from "./root-task-execution-resource-scope.js";
import { ASSIGNER_ONLY_REACTIVATION_MESSAGE, taskReactivationRejectionCode, type TaskExecutionOwner, type TaskExecutionResourcePort, type TaskExecutionStopResult } from "./task-execution-resource-port.js";
import type { CollaborationMemberExecutionIdentity } from "../domain/root-execution-identity.js";
import type { AgentExecutionStatus } from "@autobyteus/collaboration-stream-contracts";
import { resolveTaskExecutionIdleShutdownGraceMs } from "../../../config/task-execution-idle-shutdown-setting.js";
import type { RootTaskExecutionAdapter, TaskExecutionTarget } from "./root-task-execution-adapter.js";
import { RootTaskExecutionCommandQueue } from "./root-task-execution-command-queue.js";
import { TaskExecutionLiveHolds } from "./task-execution-live-holds.js";
import {
  ROOT_NOT_ACTIVE_MESSAGE,
  TaskDelegationError,
  TaskDispatchIndeterminateError,
  delegatedCopyOf,
  type AssignToExistingCopyInput,
  type SpawnTaskInput,
  type TaskCopyPlacementLaunchNotes,
  type TaskDelegationContext,
  type TaskDelegationOutcome,
} from "./task-delegation-command.js";
import {
  buildExistingCopyTaskMessage,
  buildTaskAssigneeWorkPacket,
  type DelegatedProjectTask,
  requireTaskString,
  validateTaskReferenceFiles,
} from "./task-execution-input.js";
import {
  TaskExecutionIdleShutdownSchedule,
  type TaskExecutionIdleTimers,
} from "./task-execution-idle-shutdown-schedule.js";
import {
  taskExecutionReferenceKey,
  type TaskExecutionReference,
} from "./task-execution-reference.js";

/** Holds a task-execution chain live between wake and input reservation. */
export type TaskExecutionLiveLease = Readonly<{ assertOpen(): void; release(): void }>;

export type TaskExecutionAgentStatus = "offline" | "initializing" | "idle" | "running" | "error";

/**
 * The root's exact delivery of an existing copy's new Task: a message from the delegator to the copy's
 * ingress (wakes or restores it like `send_message_to`).
 */
export type DeliverTaskWork = (ingressAgentRunId: string, content: string, referenceFiles: readonly string[]) => Promise<AgentOperationResult>;

/** A user Stop of task copies (SR-006): those it stopped and those that were already offline. */
export type TaskExecutionUserStopResult = Readonly<{
  stopped: readonly TaskExecutionReference[];
  alreadyStopped: readonly TaskExecutionReference[];
}>;

/** A step that runs only while the listed copies are stopped (AR-001); otherwise the running ones. */
export type StoppedTaskExecutionsStep<T> =
  | Readonly<{ ran: true; value: T }>
  | Readonly<{ ran: false; running: readonly TaskExecutionReference[] }>;

/**
 * Root-neutral resource lifecycle for delegated children (task executions) of
 * one root. It owns delegation admission, the serialized activation / wake /
 * shutdown FIFO, idle-shutdown scheduling and live leases. It owns no subject
 * tree, index or store; the subject adapter owns those.
 */
export class RootTaskExecutionLifecycle<TPlacement extends TaskCopyPlacementLaunchNotes> {
  private readonly queue = new RootTaskExecutionCommandQueue();
  private readonly schedule: TaskExecutionIdleShutdownSchedule;
  private accepting = true;
  private readonly resourceScope: RootTaskExecutionResourceScope<TPlacement>;
  /** Live leases and user Stops in progress (SR-006). */
  private readonly holds: TaskExecutionLiveHolds;
  private readonly remoteEndpoints: RemoteEndpointLookup;
  private readonly remoteRunLinks: RemoteRunLinks | null;

  constructor(
    private readonly adapter: RootTaskExecutionAdapter<TPlacement>,
    options: Readonly<{
      gracePeriodMs?: () => number;
      timers?: TaskExecutionIdleTimers;
      taskExecutionResources?: TaskExecutionResourcePort;
      /** The root's remote endpoints, for the Task-closure fence of remote runs (AR-007). */
      remoteRunLinks?: RemoteRunLinks;
      /** AR-003: which run IDs name runs on a peer node (backed by the root's `RemoteRunLinks.has`). */
      remoteEndpoints?: RemoteEndpointLookup;
      /** Told after every live-lease release (DS-004: a peer-started Team root's idle schedule re-arms). */
      onLiveLeaseReleased?: () => void;
    }> = {},
  ) {
    this.holds = new TaskExecutionLiveHolds(options.onLiveLeaseReleased);
    this.remoteEndpoints = options.remoteEndpoints ?? NO_REMOTE_ENDPOINTS;
    this.remoteRunLinks = options.remoteRunLinks ?? null;
    this.resourceScope = new RootTaskExecutionResourceScope(adapter, options.taskExecutionResources, options.remoteRunLinks);
    this.schedule = new TaskExecutionIdleShutdownSchedule({
      gracePeriodMs: options.gracePeriodMs ?? (() => resolveTaskExecutionIdleShutdownGraceMs()),
      onFire: (reference) => this.onGraceElapsed(reference),
      timers: options.timers,
    });
  }

  /** Root termination: stop admitting commands and cancel every grace timer. */
  closeExternalAdmission(): void {
    this.accepting = false;
    this.schedule.dispose();
    this.queue.closeExternalAdmission();
    // Every task execution of a root that no longer admits work reports offline.
    this.resourceScope.taskExecutionsStatusChanged(this.adapter.listTaskExecutions());
  }

  enterRootFailStop(): void {
    this.accepting = false;
    this.schedule.dispose();
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

  /** `delegate_task` with an address: a new copy for a saved Task or for described work. */
  async delegateToNewCopy(
    context: TaskDelegationContext,
    input: SpawnTaskInput,
    placement: TPlacement,
  ): Promise<TaskDelegationOutcome> {
    this.assertAdmitting(context.identity);
    this.adapter.assertCurrentSchemaReady();
    const linked = Object.prototype.hasOwnProperty.call(input, "task_id");
    const allowed = linked ? ["recipient_address", "task_id"] : ["recipient_address", "description", "reference_files"];
    if (Object.keys(input).some(key => !allowed.includes(key))) throw new TaskDelegationError("VALIDATION_ERROR", "Delegation accepts exactly one work source.");
    const owner = this.resourceScope.ownerOf(context.identity.agentRunId);
    let description: string, referenceFiles: readonly string[], comments: readonly string[] = [];
    let task: DelegatedProjectTask | undefined;
    let join: TaskExecutionJoin;
    if (linked) {
      if (owner) throw new TaskDelegationError("TASK_AGENT_RESOURCE_OWNED_SENDER", "You are a task agent, so you can't use task_id. Delegate with a description instead; that work is part of your Task.");
      // The agent's task_id (key or ID) is resolved once; only the stored ID goes on.
      const saved = await this.resourceScope.port().resolveAssignment(requireTaskString(input.task_id, "task_id")).catch(error => { throw asTaskDelegationError(error); });
      ({ description, comments } = saved);
      task = { taskKey: saved.taskReference, projectId: saved.projectId };
      referenceFiles = await validateTaskReferenceFiles(saved.referenceFiles);
      join = { role: "assigned", taskId: saved.taskId, assignedBy: context.identity.agentRunId };
    } else {
      if (owner && !owner.open) throw new TaskDelegationError("TASK_AGENT_RESOURCE_CLOSED", "Your Task is DONE or CANCELLED, so you can't start new work.");
      // An unowned copy could not be told apart from an unreadable Task's work: reject before any planning.
      if (!owner) this.resourceScope.assertResourceDataReadable();
      description = requireTaskString(input.description, "description");
      referenceFiles = await validateTaskReferenceFiles(input.reference_files ?? []);
      // Sub-work of Task work stays that Task's; otherwise the copy gets its own Task with no Project.
      join = owner
        ? { role: "delegated", creator: owner.execution }
        : { role: "assigned", assignedBy: context.identity.agentRunId, adHocTask: { description, referenceFiles } };
    }
    return dispatchTaskCopy({ adapter: this.adapter, queue: this.queue, context, placement,
      workPacket: buildTaskAssigneeWorkPacket({ delegator: context.identity, delegatorAddress: this.adapter.reachingAddressOf(context.identity), description, comments, ...(task ? { task } : {}), referenceFiles }),
      join, resources: this.resourceScope.port(),
      assertAdmitting: () => this.assertAdmitting(context.identity),
    });
  }

  /**
   * DS-002, `delegate_task` with a copy's own ID: resolves the named Task first (its refusals come before the
   * copy's), finds the copy in this root, asks the Task side whether this sender may give it the Task, settles its previous stop and checks it can be restored, commits
   * the new assignment, publishes it as reopened, then delivers the Task's work through the root's exact
   * delivery (which wakes or restores it with its conversation). Every refusal before the commit changes nothing.
   */
  async assignToExistingCopy(context: TaskDelegationContext, input: AssignToExistingCopyInput, deliverWork: DeliverTaskWork): Promise<TaskDelegationOutcome> {
    const sender = context.identity.agentRunId;
    let target: TaskExecutionTarget, taskId: string, taskReference: string, projectId: string, description: string, comments: readonly string[], referenceFiles: readonly string[];
    let otherOpenTaskReferences: readonly string[];
    try {
      this.assertAdmitting(context.identity);
      this.adapter.assertCurrentSchemaReady();
      if (this.resourceScope.ownerOf(sender)) throw new TaskDelegationError("TASK_AGENT_RESOURCE_OWNED_SENDER", "You are a task agent, so you can't use task_id. Delegate with a description instead; that work is part of your Task.");
      const port = this.resourceScope.port();
      // The agent's task_id (key or ID) is resolved once; only the stored ID goes on, the key only into texts.
      const saved = await port.resolveAssignment(requireTaskString(input.taskId, "task_id"));
      ({ taskId, taskReference, projectId, description, comments } = saved);
      // AR-003: a saved Task is never given to a run on a peer node; refused after the named Task's own refusals
      // and before the copy is resolved or any Task change.
      if ("agentRunId" in input.copy ? this.remoteEndpoints.isRemoteEndpoint(input.copy.agentRunId) : this.remoteEndpoints.isRemoteTeam(input.copy.teamRunId)) {
        return { delegated: false, message: REMOTE_ROOT_REFUSAL_TEXT.savedTask };
      }
      const found = resolveExistingCopy(this.adapter, input.copy);
      if (!found) return await this.refuseCopyOutsideTree(port, input.copy, sender, taskId);
      target = found;
      referenceFiles = await validateTaskReferenceFiles(saved.referenceFiles);
      await port.assertAssignable({ execution: target.execution, requestedBy: sender, taskId });
      // The copy may hold other open Tasks; the message names them (read before any change, so a failure changes nothing).
      otherOpenTaskReferences = await port.openTaskReferencesOf(target.execution, taskId);
      await this.queue.submit({ kind: "reopen", executeAtQueueHead: () => this.prepareClosedCopyForResume(target.execution, target.ingressAgentRunId) });
      await port.assignExistingTaskExecution({ hostRoot: target.root, execution: target.execution, taskId, assignedBy: sender,
        ...("teamRunId" in target.execution ? { teamCoordinatorAgentRunId: target.ingressAgentRunId } : {}) });
    } catch (error) {
      if (refusalCode(error)) return { delegated: false, message: errorMessage(error) };
      throw error;
    }
    this.adapter.publishTaskExecutionsReopened(Object.freeze([target.execution]));
    const content = buildExistingCopyTaskMessage({ taskReference, projectId, description, comments, otherOpenTaskReferences });
    let delivered: AgentOperationResult;
    try { delivered = await this.withLiveLease(sender, () => deliverWork(target.ingressAgentRunId, content, referenceFiles)); }
    catch (error) { delivered = { accepted: false, code: "TASK_WORK_NOT_DELIVERED", message: errorMessage(error) }; }
    const port = this.resourceScope.port();
    if (!delivered.accepted) {
      const reason = delivered.message ?? delivered.code ?? "delivery was not accepted";
      try { await port.markFailed(target.execution, { code: delivered.code ?? "TASK_WORK_NOT_DELIVERED", message: reason }); }
      catch (recordError) { throw new TaskDispatchIndeterminateError(target.execution, recordError); }
      return { delegated: false, message: `Task ${taskReference} was given to the task agent, but the message with its work was not delivered (${reason}). `
        + `Message the task agent's run id ${target.ingressAgentRunId}, or set Task ${taskReference} to CANCELLED, or delegate it to a new task agent.` };
    }
    try { await port.markStarted(target.execution); }
    catch (error) { throw new TaskDispatchIndeterminateError(target.execution, error); }
    return { delegated: true, copy: delegatedCopyOf(target) };
  }
  /**
   * A named copy that is not in this root's tree. A copy whose start failed never reached the tree, but the
   * Task side still knows it: when it is a closed copy this root hosts, the Task side's specific refusal
   * applies (never started, another assigner, already this Task; AC-009). Anything else is not a copy of
   * this run (unknown, or hosted by another root). Always rejects.
   */
  private async refuseCopyOutsideTree(port: TaskExecutionResourcePort, copy: TaskExecutionReference, requestedBy: string, taskId: string): Promise<never> {
    const key = taskExecutionReferenceKey(copy);
    if (port.closedTaskExecutionsIn(this.adapter.root).some(reference => taskExecutionReferenceKey(reference) === key)) {
      await port.assertAssignable({ execution: copy, requestedBy, taskId });
    }
    throw notACopyOfThisRun(copy);
  }
  /**
   * `send_message_to` guidance: the coordinator agent run of the Team copy with this team run ID in this root, or
   * of the remote Team run this root delegated to (G-6); `null` otherwise.
   */
  /** The Task the agent works on (its copy's current Task), or null; throws when damaged run data can't tell. */
  ownedTaskOf(agentRunId: string): TaskExecutionOwner | null { return this.resourceScope.ownerOf(agentRunId); }
  teamCoordinatorOf(teamRunId: string): string | null {
    const remote = this.remoteRunLinks?.teamLinkFor(teamRunId);
    return remote ? remoteTeamCoordinatorRunId(remote) : this.adapter.taskExecutionTargetOf({ teamRunId })?.ingressAgentRunId ?? null;
  }

  assertInputAllowed(agentRunId: string): void { this.resourceScope.assertInputAllowed(agentRunId); }
  /** A live lease is held on a task execution of this root (DS-004's quiet shutdown waits for it). */
  hasLiveLeases(): boolean { return this.holds.hasLeases(); }
  assertMessageScope(sender: string, recipient: string): void { this.resourceScope.assertMessageScope(sender, recipient); }
  releaseTaskExecutions(executions: readonly TaskExecutionReference[]): Promise<readonly TaskExecutionStopResult[]> {
    return this.resourceScope.releaseTaskExecutions(executions);
  }
  /** Closed (Task DONE or CANCELLED) task executions of the root's current tree, for its package snapshot. */
  closedTaskExecutions(): readonly TaskExecutionReference[] { return this.resourceScope.closedTaskExecutions(); }

  /** Actual input fence shared by all root facades: wakes the chain and holds it live for the operation. */
  async withLiveLease(agentRunId: string, operation: () => Promise<AgentOperationResult>): Promise<AgentOperationResult> {
    let lease: TaskExecutionLiveLease;
    try { lease = await this.acquireLiveLease(agentRunId); }
    catch (error) {
      if (error instanceof TaskDelegationError) return { accepted: false, code: error.code, message: error.message };
      throw error;
    }
    try {
      lease.assertOpen();
      return await operation();
    } finally { lease.release(); }
  }

  /**
   * `send_message_to(run ID)` from a sender in this root. A target in closed Task work is first
   * reactivated when it is an assignment's ingress, the sender is its assigner and the Task is not
   * DONE or CANCELLED; any other closed target is refused with guidance and nothing changes. The delivery then
   * follows the normal wake / restore path under the sender's live lease.
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
    const result = await this.withLiveLease(senderAgentRunId, deliver);
    if (!reactivated) return result;
    return result.accepted
      ? { ...result, message: `${result.message ?? `Delivered message to ${targetAgentRunId}.`} ${targetAgentRunId} continues with its conversation.` }
      : { ...result, message: `${result.message ?? "The message was not delivered."} ${targetAgentRunId} continues with its conversation (its Task is open again) but did not receive this message; send it again.` };
  }

  /** DS-L1. `true` only when this call committed the reopen. Every refusal before the commit leaves the Task and its entries unchanged. */
  private async reactivateClosedTarget(senderAgentRunId: string, targetAgentRunId: string): Promise<boolean> {
    if (this.resourceScope.ownerOf(targetAgentRunId)?.open !== false) return false;
    if (!this.accepting) throw new TaskDelegationError("ROOT_RUN_NOT_ACTIVE", ROOT_NOT_ACTIVE_MESSAGE);
    const execution = this.adapter.taskExecutionWithIngress(targetAgentRunId);
    if (!execution) {
      throw new TaskDelegationError("TASK_AGENT_RESOURCE_CLOSED", ASSIGNER_ONLY_REACTIVATION_MESSAGE);
    }
    const port = this.resourceScope.port();
    const request = { execution, requestedBy: senderAgentRunId };
    await port.assertReopenable(request);
    await this.queue.submit({ kind: "reopen", executeAtQueueHead: () => this.prepareClosedCopyForResume(execution, targetAgentRunId) });
    const { reopened } = await port.reopenAssignment(request);
    if (reopened) this.adapter.publishTaskExecutionsReopened(Object.freeze([execution]));
    return reopened;
  }

  /**
   * Queue-head step shared by reactivation and existing-copy assignment: settles the copy's previous
   * stop, drops its released authority so restore builds a fresh one, and checks its conversation can be
   * restored. A copy already open (a concurrent reopen or assignment) is never released.
   */
  private async prepareClosedCopyForResume(execution: TaskExecutionReference, ingressAgentRunId: string): Promise<void> {
    if (!this.accepting) throw new TaskDelegationError("ROOT_RUN_NOT_ACTIVE", ROOT_NOT_ACTIVE_MESSAGE);
    if (this.resourceScope.port().isOpen(execution)) return;
    await this.resourceScope.discardReleasedExecution(execution);
    this.adapter.assertRestorableChain(ingressAgentRunId);
  }

  /**
   * Status of any agent in the root. Running or initializing cancels the grace
   * timers of every task execution containing the agent; idle, offline or error
   * (re)arms them. The fire-time quiescence check, which includes running
   * background tasks, is the only safety guard.
   */
  onAgentStatus(agentRunId: string, status: TaskExecutionAgentStatus): void {
    const chain = this.adapter.taskExecutionChainFor(agentRunId);
    if (!chain.length) return;
    // The copies containing the agent may show a new status; the Task side reads it later.
    this.resourceScope.taskExecutionsStatusChanged(chain);
    if (!this.accepting) return;
    if (status === "running" || status === "initializing") {
      chain.forEach((reference) => this.schedule.cancel(reference));
      return;
    }
    this.armLive(chain);
  }

  /**
   * A background task of an agent ended (completed, failed or stopped). While it ran, a grace fire
   * skipped the shutdown without re-arming; re-arm every live task execution containing the agent so
   * an otherwise quiet copy is shut down one grace period after the end, even when no turn follows.
   */
  onAgentBackgroundTaskEnded(agentRunId: string): void {
    if (!this.accepting) return;
    const chain = this.adapter.taskExecutionChainFor(agentRunId);
    if (chain.length) this.armLive(chain);
  }

  /**
   * Restores every shut-down task execution containing the agent (outermost
   * first) and holds the chain live until `release()`. Rejects with a coded
   * `TaskDelegationError` when the saved context is unavailable or restore fails.
   */
  async acquireLiveLease(agentRunId: string): Promise<TaskExecutionLiveLease> {
    if (!this.accepting) {
      throw new TaskDelegationError("ROOT_RUN_NOT_ACTIVE", ROOT_NOT_ACTIVE_MESSAGE);
    }
    // The Task side's loaded records are the authority: no durable read, closed stays closed after restart.
    this.resourceScope.assertInputAllowed(agentRunId);
    this.assertNotStopping(agentRunId);
    return this.queue.submit({ kind: "wake", executeAtQueueHead: () => this.acquireAtHead(agentRunId) });
  }

  private async acquireAtHead(agentRunId: string): Promise<TaskExecutionLiveLease> {
    if (!this.accepting) {
      throw new TaskDelegationError("ROOT_RUN_NOT_ACTIVE", ROOT_NOT_ACTIVE_MESSAGE);
    }
    const assertOpen = () => this.resourceScope.assertInputAllowed(agentRunId);
    assertOpen();
    // A wake queued before a Stop marked its chain is refused at the head, never restored.
    this.assertNotStopping(agentRunId);
    const chain = this.adapter.taskExecutionChainFor(agentRunId);
    if (!chain.length) return Object.freeze({ assertOpen, release: () => undefined });
    this.adapter.assertRestorableChain(agentRunId);
    try {
      await this.adapter.restoreChain(agentRunId, assertOpen);
      assertOpen();
    } catch (error) {
      // Executions restored before the failure are never left live without a timer.
      this.armLive(chain);
      if (error instanceof TaskDelegationError) throw error;
      throw new TaskDelegationError(
        "TASK_EXECUTION_RESTORE_FAILED",
        `The task agent ${agentRunId} could not continue with its conversation: ${errorMessage(error)}`,
        { cause: error },
      );
    }
    const releaseHold = this.holds.lease(chain.map(taskExecutionReferenceKey));
    let released = false;
    return Object.freeze({
      assertOpen,
      release: () => {
        if (released) return;
        released = true;
        releaseHold();
        if (this.accepting) this.armLive(chain);
      },
    });
  }

  private onGraceElapsed(reference: TaskExecutionReference): void {
    if (!this.accepting) return;
    void this.queue.submit({
      kind: "shutdown",
      executeAtQueueHead: () => this.shutdownAtHead(reference),
    }).catch((error) => {
      if (!this.accepting) return;
      console.error(`Task execution '${taskExecutionReferenceKey(reference)}' idle shutdown failed:`, error);
    });
  }

  private async shutdownAtHead(reference: TaskExecutionReference): Promise<void> {
    if (!this.accepting) return;
    const key = taskExecutionReferenceKey(reference);
    if (this.holds.isLeased(key) || this.holds.isStopping(key)) return;
    if (!this.adapter.isLive(reference)) return;
    // Not quiet: a later idle/offline/error status or lease release re-arms.
    await this.adapter.tryShutDownIfQuiet(reference);
  }

  /**
   * User Stop of task copies (SR-006), `executions` innermost first (`delegatedStopSet`):
   * 1. marks them stopping: from now on a live lease on any chain containing one is refused with
   *    `TASK_EXECUTION_STOPPING`, before any queue step (deliveries into, from or by them are refused);
   * 2. waits, outside the queue, for the leases already held on them to be released (in-flight
   *    deliveries finish; their inner queue steps still run, since this never holds the queue head);
   * 3. submits one non-waiting `stop` step per copy, innermost first, that releases a live copy into
   *    the restorable idle-shutdown state;
   * 4. clears the marks. An overlapping Stop first lets the earlier attempt settle.
   */
  async stopForUser(executions: readonly TaskExecutionReference[]): Promise<TaskExecutionUserStopResult> {
    if (!this.accepting) throw new TaskDelegationError("ROOT_RUN_NOT_ACTIVE", ROOT_NOT_ACTIVE_MESSAGE);
    const stop = await this.holds.beginStop([...new Set(executions.map(taskExecutionReferenceKey))]);
    executions.forEach((reference) => this.schedule.cancel(reference));
    try {
      await stop.drained;
      const stopped: TaskExecutionReference[] = [];
      const alreadyStopped: TaskExecutionReference[] = [];
      for (const reference of executions) {
        const done = await this.queue.submit({ kind: "stop", executeAtQueueHead: () => this.stopAtHead(reference) });
        (done ? stopped : alreadyStopped).push(reference);
      }
      return Object.freeze({ stopped: Object.freeze(stopped), alreadyStopped: Object.freeze(alreadyStopped) });
    } finally {
      stop.end();
      this.resourceScope.taskExecutionsStatusChanged(executions);
    }
  }

  /**
   * AR-001: runs `operation` at the queue head only while every listed copy is stopped (not live,
   * not held by a lease and not being stopped); wake, activation, idle shutdown and Stop cannot
   * interleave with it. Otherwise nothing runs and the running copies are returned.
   */
  async whileTaskExecutionsStopped<T>(
    references: readonly TaskExecutionReference[],
    operation: () => Promise<T> | T,
  ): Promise<StoppedTaskExecutionsStep<T>> {
    if (!this.accepting) throw new TaskDelegationError("ROOT_RUN_NOT_ACTIVE", ROOT_NOT_ACTIVE_MESSAGE);
    return this.queue.submit({
      kind: "reconfigure",
      executeAtQueueHead: async (): Promise<StoppedTaskExecutionsStep<T>> => {
        const running = references.filter((reference) => {
          const key = taskExecutionReferenceKey(reference);
          return this.holds.isStopping(key) || this.holds.isLeased(key) || this.adapter.isLive(reference);
        });
        if (running.length) return Object.freeze({ ran: false, running: Object.freeze(running) });
        return Object.freeze({ ran: true, value: await operation() });
      },
    });
  }

  /** Never awaits a lease: the Stop already drained them and refuses new ones. */
  private async stopAtHead(reference: TaskExecutionReference): Promise<boolean> {
    if (!this.accepting) throw new TaskDelegationError("ROOT_RUN_NOT_ACTIVE", ROOT_NOT_ACTIVE_MESSAGE);
    if (!this.adapter.isLive(reference)) return false;
    this.schedule.cancel(reference);
    return this.adapter.shutDownForUser(reference);
  }

  private assertNotStopping(agentRunId: string): void {
    this.holds.assertNotStopping(this.adapter.taskExecutionChainFor(agentRunId).map(taskExecutionReferenceKey));
  }

  private armLive(chain: readonly TaskExecutionReference[]): void {
    for (const reference of chain) {
      if (this.adapter.isLive(reference)) this.schedule.arm(reference);
    }
  }

  private assertAdmitting(identity: CollaborationMemberExecutionIdentity): void {
    if (!this.accepting || !this.adapter.isOpen()) {
      throw new TaskDelegationError("ROOT_RUN_NOT_ACTIVE", ROOT_NOT_ACTIVE_MESSAGE);
    }
    this.adapter.authorize(identity);
  }
}

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);
/** A coded refusal from the runtime or the Task side (as opposed to an infrastructure fault). */
const refusalCode = (error: unknown): string | null => {
  if (error instanceof TaskDelegationError) return error.code;
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && error instanceof Error ? code : null;
};
