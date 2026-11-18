import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import type { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import { normalizeAgentApiStatus } from "../../agent-execution/domain/agent-status-payload.js";
import { parseBackgroundTaskUpdatedPayload } from "../../agent-execution/domain/agent-background-task.js";
import { AgentRunEventType } from "../../agent-execution/domain/agent-run-event.js";
import {
  TaskExecutionIdleShutdownSchedule,
  type TaskExecutionIdleTimers,
} from "../../agent-collaboration/execution/task/task-execution-idle-shutdown-schedule.js";
import { resolveTaskExecutionIdleShutdownGraceMs } from "../../config/task-execution-idle-shutdown-setting.js";

/**
 * The idle schedule of a delegated agent run, local or started by a peer (autobyteus-461 DS-7, AC-013; it is
 * `isDelegated`): the run's own idle shutdown, never the user Stop. It watches the run's agent status: idle, offline or error arms the grace timer (the delegated copies'
 * schedule and grace setting); running or initializing cancels it; a background task that ends re-arms it.
 * When it fires, the root runs `shutDownIfQuiet` inside its gate: the agent shuts down only when it is quiet and
 * the root's own children have no open work. The next inbound message restores it with its conversation.
 */
export class DelegatedRunIdleShutdown {
  private readonly schedule: TaskExecutionIdleShutdownSchedule;
  private watched: AgentRun | null = null;
  private unsubscribe: (() => void) | null = null;
  private disposed = false;

  constructor(private readonly options: Readonly<{
    agentRunId: string;
    agentRunManager: Pick<AgentRunManager, "tryPrepareAgentRunTerminationIfQuiescent">;
    /** Runs the fire-time check in the root's gate (no root-mediated input interleaves). */
    runInGate(operation: () => Promise<void>): Promise<void>;
    gracePeriodMs?: () => number;
    timers?: TaskExecutionIdleTimers;
  }>) {
    this.schedule = new TaskExecutionIdleShutdownSchedule({
      gracePeriodMs: options.gracePeriodMs ?? (() => resolveTaskExecutionIdleShutdownGraceMs()),
      onFire: () => { void options.runInGate(() => this.shutDownIfQuiet()).catch((error: unknown) => {
        console.error(`Agent run '${options.agentRunId}' idle shutdown failed:`, error);
      }); },
      timers: options.timers,
    });
  }

  /** Follows the agent's status from now on (idempotent per run instance); a fresh agent starts the schedule. */
  watch(run: AgentRun): void {
    if (this.disposed || this.watched === run) return;
    this.unsubscribe?.();
    this.watched = run;
    this.unsubscribe = run.subscribeToEvents((event) => {
      if (event.eventType === AgentRunEventType.AGENT_STATUS) {
        const status = normalizeAgentApiStatus(event.payload.status);
        if (status === "running" || status === "initializing") this.schedule.cancel(this.reference);
        else this.schedule.arm(this.reference);
      } else if (event.eventType === AgentRunEventType.BACKGROUND_TASK_UPDATED
        && parseBackgroundTaskUpdatedPayload(event.payload).status !== "running") {
        this.schedule.arm(this.reference);
      }
    });
    this.schedule.arm(this.reference);
  }

  dispose(): void {
    this.disposed = true;
    this.schedule.dispose();
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.watched = null;
  }

  private async shutDownIfQuiet(): Promise<void> {
    const run = this.watched;
    if (this.disposed || !run?.isActive()) return;
    const prepared = await this.options.agentRunManager.tryPrepareAgentRunTerminationIfQuiescent(run);
    // Not quiet: a later idle, offline or error status re-arms the schedule.
    if (!prepared) return;
    const result = await prepared.commit().finish();
    if (!result.accepted) console.warn(`Agent run '${this.options.agentRunId}' idle shutdown was not accepted: ${result.message ?? result.code ?? ""}`);
  }

  private get reference() { return { agentRunId: this.options.agentRunId }; }
}
