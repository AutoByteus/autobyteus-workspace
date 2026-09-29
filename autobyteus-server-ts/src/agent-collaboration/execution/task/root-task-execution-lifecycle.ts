import type { CollaborationMemberExecutionIdentity } from "../domain/root-execution-identity.js";
import { resolveTaskExecutionIdleShutdownGraceMs } from "../../../config/task-execution-idle-shutdown-setting.js";
import type {
  PreparedTaskExecutionActivation,
  RootTaskExecutionAdapter,
} from "./root-task-execution-adapter.js";
import { RootTaskExecutionCommandQueue } from "./root-task-execution-command-queue.js";
import {
  RootTaskPersistenceFinalizationIndeterminateError,
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
import {
  TaskExecutionIdleShutdownSchedule,
  type TaskExecutionIdleTimers,
} from "./task-execution-idle-shutdown-schedule.js";
import {
  taskExecutionReferenceKey,
  type TaskExecutionReference,
} from "./task-execution-reference.js";

/** Holds a task-execution chain live between wake and input reservation. */
export type TaskExecutionLiveLease = Readonly<{ release(): void }>;

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

  constructor(
    private readonly adapter: RootTaskExecutionAdapter<TPlacement>,
    options: Readonly<{
      gracePeriodMs?: () => number;
      timers?: TaskExecutionIdleTimers;
    }> = {},
  ) {
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
    const description = requireTaskString(input.description, "description");
    const referenceFiles = await validateTaskReferenceFiles(input.reference_files ?? []);
    let prepared: PreparedTaskExecutionActivation | null = null;
    try {
      prepared = await this.adapter.prepareActivation({
        identity: context.identity,
        placement,
        startedAt: new Date().toISOString(),
        workPacket: buildTaskAssigneeWorkPacket({ delegator: context.identity, description, referenceFiles }),
      });
      const exact = prepared;
      return await this.queue.submit({
        kind: "activate",
        executeAtQueueHead: () => this.activateAtHead(context.identity, exact),
      });
    } catch (error) {
      if (error instanceof RootTaskPersistenceFinalizationIndeterminateError) throw error;
      if (prepared) await prepared.abort();
      return { target_agent_run_id: null, message: errorMessage(error) };
    }
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
    return this.queue.submit({ kind: "wake", executeAtQueueHead: () => this.acquireAtHead(agentRunId) });
  }

  private async acquireAtHead(agentRunId: string): Promise<TaskExecutionLiveLease> {
    if (!this.accepting) {
      throw new TaskDelegationError("ROOT_RUN_NOT_ACTIVE", "The collaboration root is not accepting deliveries.");
    }
    const chain = this.adapter.taskExecutionChainFor(agentRunId);
    if (!chain.length) return NO_OP_LEASE;
    this.adapter.assertRestorableChain(agentRunId);
    try {
      await this.adapter.restoreChain(agentRunId);
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

  private async activateAtHead(
    identity: CollaborationMemberExecutionIdentity,
    prepared: PreparedTaskExecutionActivation,
  ): Promise<DelegateTaskResult> {
    this.assertAdmitting(identity);
    const result = await prepared.commit();
    return result.committed
      ? { target_agent_run_id: prepared.targetAgentRunId }
      : { target_agent_run_id: null, message: result.message };
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

const NO_OP_LEASE: TaskExecutionLiveLease = Object.freeze({ release: () => undefined });
const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);
