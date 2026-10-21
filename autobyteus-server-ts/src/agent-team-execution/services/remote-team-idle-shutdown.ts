import {
  TaskExecutionIdleShutdownSchedule,
  type TaskExecutionIdleTimers,
} from "../../agent-collaboration/execution/task/task-execution-idle-shutdown-schedule.js";
import { resolveTaskExecutionIdleShutdownGraceMs } from "../../config/task-execution-idle-shutdown-setting.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../domain/team-run-event.js";

/**
 * The idle schedule of a Team run a peer node started on this node (autobyteus-247 DS-004, AR-301): a quiet
 * shutdown, never the user Stop. It arms on the delegated-child schedule's signals and grace setting: an agent
 * of the root reports idle, offline or error, a background task ends, or a live lease is released; an agent
 * running or initializing cancels it. It also arms once when the root opens, so a Team never given work stops.
 * On fire it asks the root for `shutDownIfQuiet()`, which decides in its gate with the Team's own all-or-nothing
 * quiescent preparation; when that is not quiet, nothing happens and a later quiet signal re-arms.
 */
export class RemoteTeamIdleShutdown {
  private readonly schedule: TaskExecutionIdleShutdownSchedule;
  private readonly reference: Readonly<{ teamRunId: string }>;

  constructor(private readonly options: Readonly<{
    teamRunId: string;
    shutDownIfQuiet(): Promise<boolean>;
    gracePeriodMs?: () => number;
    timers?: TaskExecutionIdleTimers;
  }>) {
    this.reference = Object.freeze({ teamRunId: options.teamRunId });
    this.schedule = new TaskExecutionIdleShutdownSchedule({
      gracePeriodMs: options.gracePeriodMs ?? (() => resolveTaskExecutionIdleShutdownGraceMs()),
      onFire: () => { void options.shutDownIfQuiet().catch((error: unknown) => {
        console.error(`Team run '${options.teamRunId}' idle shutdown failed:`, error);
      }); },
      timers: options.timers,
    });
    this.arm();
  }

  /** A root event: an agent's status, or the end of a background task. */
  onRootEvent(event: TeamRunEvent): void {
    if (event.eventSourceType !== TeamRunEventSourceType.AGENT) return;
    if (event.payload.eventType === "AGENT_STATUS") {
      const status = event.payload.details.status;
      if (status === "running" || status === "initializing") this.schedule.cancel(this.reference);
      else this.arm();
    } else if (event.payload.eventType === "BACKGROUND_TASK_UPDATED" && event.payload.details.status !== "running") {
      this.arm();
    }
  }

  /** A quiet signal (also a released live lease): a fresh grace period. */
  arm(): void { this.schedule.arm(this.reference); }

  dispose(): void { this.schedule.dispose(); }
}
