import { foldTeamAggregateStatus, type AgentExecutionStatus } from "@autobyteus/collaboration-stream-contracts";
import { normalizeAgentApiStatus } from "../../../agent-execution/domain/agent-status-payload.js";
import type { AgentRunService } from "../../../agent-execution/services/agent-run-service.js";
import type { TeamRunService } from "../../../agent-team-execution/services/team-run-service.js";
import type { TaskExecutionReference } from "./task-execution-reference.js";
import type { TaskExecutionReleaseResult, TaskExecutionResourcePort } from "./task-execution-resource-port.js";

/**
 * What the Task side asks of a run by its own identity (design DS-5): a closed Task's run stops through its ordinary
 * Stop (`model.py` `stop`: the run's own parts only, its history row records it, it stays restorable), and the Task
 * page reads the run's own live status (an agent run's agent; a team run's members, folded), waking nothing. Created by
 * the composition root after the run services (SR-047 step 4) and passed to the Project Task service.
 */
export class TaskRunControl {
  constructor(private readonly runs: Readonly<{
    agentRuns: Pick<AgentRunService, "stopForTaskClosure" | "getAgentRun">;
    teamRuns: Pick<TeamRunService, "stopForTaskClosure" | "getActiveTeamRun">;
    tasks: Pick<TaskExecutionResourcePort, "isOpen">;
  }>) {}

  /**
   * The run's own Stop, unless its Task entry is open again where the run's gate closes (CR-461-001: a reopen or a new
   * assignment committed while the stop waited): the Task side's `isOpen` is the authority, as at a delivery's gate head.
   */
  async stopForTaskClosure(execution: TaskExecutionReference): Promise<TaskExecutionReleaseResult> {
    const stillClosed = () => !this.runs.tasks.isOpen(execution);
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
    return runOwnStatus(this.runs, execution);
  }
}

/** A run's own live status by its identity (an agent run's agent; a team run's members, folded); `null` when not running. */
export const runOwnStatus = (runs: Readonly<{
  agentRuns: Pick<AgentRunService, "getAgentRun">;
  teamRuns: Pick<TeamRunService, "getActiveTeamRun">;
}>, execution: TaskExecutionReference): AgentExecutionStatus | null => {
  if ("agentRunId" in execution) {
    const run = runs.agentRuns.getAgentRun(execution.agentRunId);
    return run ? normalizeAgentApiStatus(run.getStatusSnapshot().status) : null;
  }
  const team = runs.teamRuns.getActiveTeamRun(execution.teamRunId);
  return team ? foldTeamAggregateStatus(team.getLeafAgentStatusSnapshots().map((snapshot) => snapshot.details.status), "live") : null;
};
