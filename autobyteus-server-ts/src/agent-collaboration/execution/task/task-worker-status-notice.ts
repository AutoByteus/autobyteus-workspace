import type { AgentRun } from "../../../agent-execution/domain/agent-run.js";
import { AgentRunEventType } from "../../../agent-execution/domain/agent-run-event.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../../agent-team-execution/domain/team-run-event.js";
import { findTaskRunControl } from "./task-run-control.js";
import type { TaskExecutionReference } from "./task-execution-reference.js";

/**
 * A delegated run tells the Task side when its own status may have changed (autobyteus-461: what the hosting root's
 * task lifecycle forwarded before): an agent run's agent status, a team run's member status, and its stop. The Task
 * side re-reads the run's status by its identity (`TaskRunControl.ownStatus`) and announces its Tasks' worker status.
 * Nothing is read or woken here.
 */
export class TaskWorkerStatusNotice {
  private watched: Pick<AgentRun, "subscribeToEvents"> | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(private readonly run: TaskExecutionReference) {}

  /** An agent run's own agent (idempotent per run instance): each status change is told. */
  watch(agentRun: Pick<AgentRun, "subscribeToEvents">): void {
    if (this.watched === agentRun) return;
    this.unsubscribe?.();
    this.watched = agentRun;
    this.unsubscribe = agentRun.subscribeToEvents((event) => {
      if (event.eventType === AgentRunEventType.AGENT_STATUS) this.changed();
    });
    this.changed();
  }

  /** A team run's root event: a member's status change is told. */
  onTeamEvent(event: TeamRunEvent): void {
    if (event.eventSourceType === TeamRunEventSourceType.AGENT && event.payload.eventType === "AGENT_STATUS") this.changed();
  }

  /** The run stopped (its status is now offline). */
  stopped(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.watched = null;
    this.changed();
  }

  private changed(): void {
    try { findTaskRunControl()?.statusChanged(this.run); }
    catch (error) { console.warn("Task worker status notice failed:", error); }
  }
}
