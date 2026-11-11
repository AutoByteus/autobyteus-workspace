import { foldTeamAggregateStatus, type AgentExecutionStatus } from "@autobyteus/collaboration-stream-contracts";
import { normalizeAgentApiStatus } from "../../../agent-execution/domain/agent-status-payload.js";
import type { AgentRunService } from "../../../agent-execution/services/agent-run-service.js";
import type { TeamRunService } from "../../../agent-team-execution/services/team-run-service.js";
import type { TaskExecutionReference } from "./task-execution-reference.js";
import type { TaskExecutionReleaseResult, TaskExecutionResourcePort } from "./task-execution-resource-port.js";

/**
 * What the Task side asks of a run by its own identity (design DS-5): a closed Task's run stops through its ordinary
 * Stop (`model.py` `stop`: the run's own parts only, its history row records it, it stays restorable), and the Task
 * page reads the run's own live status (an agent run's agent; a team run's members, folded), waking nothing. A run
 * tells it when that status may have changed (`statusChanged`, from `TaskWorkerStatusNotice`).
 */
export class TaskRunControl {
  constructor(private readonly runs: Readonly<{
    agentRuns: Pick<AgentRunService, "stopForTaskClosure" | "getAgentRun">;
    teamRuns: Pick<TeamRunService, "stopForTaskClosure" | "getActiveTeamRun">;
    tasks?: () => Pick<TaskExecutionResourcePort, "taskExecutionsStatusChanged" | "isOpen"> | null;
  }>) {}

  /** The run's own status may have changed: the Task side announces its Tasks' worker status (it re-reads `ownStatus`). */
  statusChanged(execution: TaskExecutionReference): void {
    this.runs.tasks?.()?.taskExecutionsStatusChanged([execution]);
  }

  /**
   * The run's own Stop, unless its Task entry is open again where the run's gate closes (CR-461-001: a reopen or a new
   * assignment committed while the stop waited): the Task side's `isOpen` is the authority, as at a delivery's gate head.
   */
  async stopForTaskClosure(execution: TaskExecutionReference): Promise<TaskExecutionReleaseResult> {
    const stillClosed = () => !(this.runs.tasks?.()?.isOpen(execution) ?? false);
    const outcome = "agentRunId" in execution
      ? await this.runs.agentRuns.stopForTaskClosure(execution.agentRunId, stillClosed)
      : await this.runs.teamRuns.stopForTaskClosure(execution.teamRunId, stillClosed);
    if (outcome === "stopped") return { execution, stopped: true };
    return { execution, stopped: false, error: outcome === "kept_open"
      ? { code: "TASK_AGENT_RESOURCE_NOT_CLOSED", message: "The run's Task entry is open again; it keeps running." }
      : { code: "TASK_AGENT_RESOURCE_STOP_FAILED", message: "The run did not stop." } };
  }

  /** `null` when the run is not running (the Task page shows it offline). */
  ownStatus(execution: TaskExecutionReference): AgentExecutionStatus | null {
    if ("agentRunId" in execution) {
      const run = this.runs.agentRuns.getAgentRun(execution.agentRunId);
      return run ? normalizeAgentApiStatus(run.getStatusSnapshot().status) : null;
    }
    const team = this.runs.teamRuns.getActiveTeamRun(execution.teamRunId);
    return team ? foldTeamAggregateStatus(team.getLeafAgentStatusSnapshots().map((snapshot) => snapshot.details.status), "live") : null;
  }
}

let bound: TaskRunControl | null = null;
/** The composition binds it once the run services exist (the Task side is composed before them). */
export const bindTaskRunControl = (control: TaskRunControl): void => { bound = control; };
export const unbindTaskRunControl = (control: TaskRunControl): void => { if (bound === control) bound = null; };
export const findTaskRunControl = (): TaskRunControl | null => bound;
