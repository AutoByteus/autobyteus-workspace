import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import { messagePlacement } from "../../collaborators/message-recipient-resolution.js";
import { dispatchTaskCopy } from "./root-task-dispatch.js";
import { RootTaskLifetimeScope } from "./root-task-lifetime-scope.js";
import type { TaskLifetimeAdmission, TaskLifetimeReleaseReport } from "./task-execution-lifetime.js";
import type { TaskLifetimeRuntime } from "./task-lifetime-gate.js";
import type { CollaborationMemberExecutionIdentity } from "../domain/root-execution-identity.js";
import { resolveTaskExecutionIdleShutdownGraceMs } from "../../../config/task-execution-idle-shutdown-setting.js";
import type {
  RootTaskExecutionAdapter,
} from "./root-task-execution-adapter.js";
import { RootTaskExecutionCommandQueue } from "./root-task-execution-command-queue.js";
import {
  TaskDelegationError, TaskDispatchIndeterminateError,
  type DelegateTaskInput,
  type DelegateTaskResult,
  type TaskDelegationContext,
} from "./task-delegation-command.js";
import {
  buildTaskAssigneeWorkPacket,
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
 * Root-neutral resource lifecycle for delegated children (task executions) of
 * one root. It owns delegation admission, the serialized activation / wake /
 * shutdown FIFO, idle-shutdown scheduling and live leases. It owns no subject
 * tree, index or store; the subject adapter owns those.
 */
export class RootTaskExecutionLifecycle<TPlacement> {
  private readonly queue = new RootTaskExecutionCommandQueue();
  private readonly schedule: TaskExecutionIdleShutdownSchedule;
  private readonly leases = new Map<string, number>();
  private accepting = true;
  private readonly lifetimeScope: RootTaskLifetimeScope<TPlacement>;
  private readonly helperAttempts = new Map<string, Promise<DelegateTaskResult>>();

  constructor(
    private readonly adapter: RootTaskExecutionAdapter<TPlacement>,
    options: Readonly<{
      gracePeriodMs?: () => number;
      timers?: TaskExecutionIdleTimers;
      taskLifetimes?: TaskLifetimeRuntime;
    }> = {},
  ) {
    this.lifetimeScope = new RootTaskLifetimeScope(adapter, options.taskLifetimes);
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
  }

  enterRootFailStop(): void {
    this.accepting = false;
    this.schedule.dispose();
    this.queue.enterRootFailStop();
  }

  drain(): Promise<void> { return this.queue.drain(); }

  async delegate(
    context: TaskDelegationContext,
    input: DelegateTaskInput,
    placement: TPlacement,
  ): Promise<DelegateTaskResult> {
    this.assertAdmitting(context.identity);
    this.adapter.assertCurrentSchemaReady();
    const inherited = this.adapter.lifetimeForAgent(context.identity.agentRunId);
    const linked = Object.prototype.hasOwnProperty.call(input, "task_id");
    const allowed = linked ? ["recipient_address", "task_id"] : ["recipient_address", "description", "reference_files"];
    if (Object.keys(input).some(key => !allowed.includes(key))) throw new TaskDelegationError("VALIDATION_ERROR", "Delegation accepts exactly one work source.");
    let lifetimeId = inherited?.lifetimeId;
    let description: string, referenceFiles: readonly string[];
    if (linked) {
      const taskId = requireTaskString(input.task_id, "task_id");
      const saved = await this.lifetimeScope.port().resolveDelegationWork(taskId, lifetimeId);
      lifetimeId = saved.lifetimeId; description = saved.description;
      referenceFiles = await validateTaskReferenceFiles(saved.referenceFiles);
    } else {
      description = requireTaskString(input.description, "description");
      referenceFiles = await validateTaskReferenceFiles(input.reference_files ?? []);
    }
    const admission = lifetimeId ? await this.lifetimeScope.acquire(lifetimeId) : undefined;
    return dispatchTaskCopy({ adapter: this.adapter, queue: this.queue, context, placement,
      workPacket: buildTaskAssigneeWorkPacket({ delegator: context.identity, description, referenceFiles }),
      taskLifetime: lifetimeId ? { lifetimeId, purpose: linked ? "assignment" : "delegation" } : undefined,
      admission, lifetimePort: lifetimeId ? this.lifetimeScope.port() : undefined,
      explicitTaskId: linked ? input.task_id : undefined,
      assertAdmitting: () => this.assertAdmitting(context.identity),
    });
  }

  assertInputAllowed(agentRunId: string): void { this.lifetimeScope.assertInputAllowed(agentRunId); }
  assertMessageScope(sender: string, recipient: string): void { this.lifetimeScope.assertMessageScope(sender, recipient); }
  lifetimeForAgent(agentRunId: string) { return this.adapter.lifetimeForAgent(agentRunId); }
  releaseTaskLifetime(id: string, references: readonly TaskExecutionReference[]): Promise<TaskLifetimeReleaseReport> {
    return this.lifetimeScope.release(id, references);
  }

  /** One seedless existing Task copy per lifetime/address; its first ordinary message proves delivery. */
  async ensureLifetimeHelper(context: TaskDelegationContext, address: string, placement: TPlacement): Promise<DelegateTaskResult> {
    const stamp = this.adapter.lifetimeForAgent(context.identity.agentRunId);
    if (!stamp) throw new TaskDelegationError("TASK_LIFETIME_UNAVAILABLE", "Helper ownership requires a Task-owned sender.");
    const admission = await this.lifetimeScope.acquire(stamp.lifetimeId);
    const key = `${stamp.lifetimeId}:${address}`;
    const existing = this.adapter.findLifetimeHelper(stamp.lifetimeId, address);
    if (existing) return { target_agent_run_id: existing.ingressAgentRunId };
    const pending = this.helperAttempts.get(key);
    if (pending) return pending;
    const attempt = dispatchTaskCopy({ adapter: this.adapter, queue: this.queue, context, placement,
      taskLifetime: { lifetimeId: stamp.lifetimeId, purpose: "helper" }, admission, lifetimePort: this.lifetimeScope.port(),
      assertAdmitting: () => this.assertAdmitting(context.identity),
    });
    this.helperAttempts.set(key, attempt);
    try { return await attempt; } finally { if (this.helperAttempts.get(key) === attempt) this.helperAttempts.delete(key); }
  }

  helperPlacement(lifetimeId: string, address: string) {
    const link = this.adapter.findLifetimeHelper(lifetimeId, address);
    return link ? messagePlacement("agentRunId" in link.execution ? "agent" : "agent_team", address,
      { agentRunId: link.ingressAgentRunId, address }) : null;
  }

  /** `delivered` is monotonic: a lock-free read skips the locked write once the receiver's link is final. */
  private async recordMessageAccepted(agentRunId: string): Promise<void> {
    const stamp = this.adapter.lifetimeForAgent(agentRunId);
    if (!stamp) return;
    const reference = this.adapter.taskExecutionChainFor(agentRunId)[0];
    const link = reference && this.adapter.linkForExecution(reference);
    if (!link) return;
    const port = this.lifetimePort();
    if (await port.readExecutionDispatch(stamp.lifetimeId, link) === "delivered") return;
    await port.recordDispatch(stamp.lifetimeId, link, "delivered");
  }

  private lifetimePort() { return this.lifetimeScope.port(); }

  /**
   * Actual input fence shared by all root facades. Only the receiver of an accepted message or
   * operator post opts into `recordAcceptance`, which records its link's first acceptance.
   */
  async withLiveLease(
    agentRunId: string,
    operation: () => Promise<AgentOperationResult>,
    options: Readonly<{ recordAcceptance?: boolean }> = {},
  ): Promise<AgentOperationResult> {
    let lease: TaskExecutionLiveLease;
    try { lease = await this.acquireLiveLease(agentRunId); }
    catch (error) {
      if (error instanceof TaskDelegationError) return { accepted: false, code: error.code, message: error.message };
      throw error;
    }
    try {
      lease.assertOpen();
      const result = await operation();
      if (result.accepted && options.recordAcceptance) {
        try { await this.recordMessageAccepted(agentRunId); }
        catch (error) { throw new TaskDispatchIndeterminateError({ agentRunId }, error); }
      }
      return result;
    } finally { lease.release(); }
  }

  /**
   * Status of any agent in the root. Running or initializing cancels the grace
   * timers of every task execution containing the agent; idle, offline or error
   * (re)arms them. The fire-time quiescence check is the only safety guard.
   */
  onAgentStatus(agentRunId: string, status: TaskExecutionAgentStatus): void {
    if (!this.accepting) return;
    const chain = this.adapter.taskExecutionChainFor(agentRunId);
    if (!chain.length) return;
    if (status === "running" || status === "initializing") {
      chain.forEach((reference) => this.schedule.cancel(reference));
      return;
    }
    this.armLive(chain);
  }

  /**
   * Restores every shut-down task execution containing the agent (outermost
   * first) and holds the chain live until `release()`. Rejects with a coded
   * `TaskDelegationError` when the saved context is unavailable or restore fails.
   */
  async acquireLiveLease(agentRunId: string): Promise<TaskExecutionLiveLease> {
    if (!this.accepting) {
      throw new TaskDelegationError("ROOT_RUN_NOT_ACTIVE", "The collaboration root is not accepting deliveries.");
    }
    const admission = await this.lifetimeScope.acquireForAgent(agentRunId);
    return this.queue.submit({ kind: "wake", executeAtQueueHead: () => this.acquireAtHead(agentRunId, admission) });
  }

  private async acquireAtHead(agentRunId: string, admission?: TaskLifetimeAdmission): Promise<TaskExecutionLiveLease> {
    if (!this.accepting) {
      throw new TaskDelegationError("ROOT_RUN_NOT_ACTIVE", "The collaboration root is not accepting deliveries.");
    }
    admission?.assertOpen();
    const chain = this.adapter.taskExecutionChainFor(agentRunId);
    if (!chain.length) return admission ? Object.freeze({ assertOpen: admission.assertOpen, release: () => undefined }) : NO_OP_LEASE;
    this.adapter.assertRestorableChain(agentRunId);
    try {
      await this.adapter.restoreChain(agentRunId, () => { admission?.assertOpen(); this.lifetimeScope.assertInputAllowed(agentRunId); });
      admission?.assertOpen();
    } catch (error) {
      // Executions restored before the failure are never left live without a timer.
      this.armLive(chain);
      if (error instanceof TaskDelegationError) throw error;
      throw new TaskDelegationError(
        "TASK_EXECUTION_RESTORE_FAILED",
        `The delegated execution for AgentRun '${agentRunId}' could not be restored: ${errorMessage(error)}`,
        { cause: error },
      );
    }
    const keys = chain.map(taskExecutionReferenceKey);
    keys.forEach((key) => this.leases.set(key, (this.leases.get(key) ?? 0) + 1));
    let released = false;
    return Object.freeze({
      assertOpen: () => { admission?.assertOpen(); this.lifetimeScope.assertInputAllowed(agentRunId); },
      release: () => {
        if (released) return;
        released = true;
        for (const key of keys) {
          const next = (this.leases.get(key) ?? 1) - 1;
          if (next > 0) this.leases.set(key, next);
          else this.leases.delete(key);
        }
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
    if (this.leases.has(taskExecutionReferenceKey(reference))) return;
    if (!this.adapter.isLive(reference)) return;
    // Not quiet: a later idle/offline/error status or lease release re-arms.
    await this.adapter.tryShutDownIfQuiet(reference);
  }

  private armLive(chain: readonly TaskExecutionReference[]): void {
    for (const reference of chain) {
      if (this.adapter.isLive(reference)) this.schedule.arm(reference);
    }
  }

  private assertAdmitting(identity: CollaborationMemberExecutionIdentity): void {
    if (!this.accepting || !this.adapter.isOpen()) {
      throw new TaskDelegationError("ROOT_RUN_NOT_ACTIVE", "The collaboration root is not accepting task commands.");
    }
    this.adapter.authorize(identity);
  }
}

const NO_OP_LEASE: TaskExecutionLiveLease = Object.freeze({ assertOpen: () => undefined, release: () => undefined });
const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);
