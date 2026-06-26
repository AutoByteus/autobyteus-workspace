import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import type { TaskTeamInstanceIdentity } from "../../agent-team-execution/domain/task-team-instance.js";
import { TaskDelegationError } from "../../agent-team-execution/task-delegation/task-delegation-record.js";
import type { TaskDelegationService } from "../../agent-team-execution/task-delegation/task-delegation-service.js";
import {
  getTaskDelegationRunRegistry,
  type TaskDelegationRunRegistry,
} from "../../agent-team-execution/task-delegation/task-delegation-run-registry.js";
import {
  getTaskTeamActiveRunDirectory,
  type TaskTeamActiveRunDirectory,
} from "../../agent-team-execution/task-delegation/task-team-active-run-directory.js";
import {
  getTeamRunService,
  type TeamRunService,
} from "../../agent-team-execution/services/team-run-service.js";
import type { TaskDelegationToolContext } from "./task-delegation-tool-contract.js";

export type TaskDelegationSubmitRoute =
  | {
      kind: "current";
      service: TaskDelegationService;
      context: TaskDelegationToolContext;
    }
  | {
      kind: "task_team_ingress_parent";
      service: TaskDelegationService;
      context: TaskDelegationToolContext;
      taskTeamInstance: TaskTeamInstanceIdentity;
    };

export class TaskDelegationToolRunRouter {
  constructor(private readonly dependencies: {
    teamRunService?: TeamRunService;
    runRegistry?: TaskDelegationRunRegistry;
    taskTeamActiveRunDirectory?: TaskTeamActiveRunDirectory;
  } = {}) {}

  async resolveServiceForDelegateOrReview(
    context: TaskDelegationToolContext,
  ): Promise<TaskDelegationService> {
    return this.getService(await this.resolveActiveTeamRun(context.teamRunId));
  }

  async resolveServiceForSubmit(
    context: TaskDelegationToolContext,
  ): Promise<TaskDelegationSubmitRoute> {
    const taskAgentRunId = context.caller.taskAgentRunId?.trim() || null;
    const taskTeamInstance = context.caller.taskTeamInstance ?? null;
    if (taskTeamInstance && !taskAgentRunId) {
      const parentRun = await this.resolveActiveTeamRun(taskTeamInstance.parentTeamRunId);
      return {
        kind: "task_team_ingress_parent",
        service: this.getService(parentRun),
        context,
        taskTeamInstance,
      };
    }

    return {
      kind: "current",
      service: this.getService(await this.resolveActiveTeamRun(context.teamRunId)),
      context,
    };
  }

  async resolveActiveTeamRun(teamRunIdInput: string | null | undefined): Promise<TeamRun> {
    const teamRunId = teamRunIdInput?.trim();
    if (!teamRunId) {
      throw new TaskDelegationError(
        "TEAM_RUN_CONTEXT_REQUIRED",
        "Task delegation tools require an active team run context.",
      );
    }

    const topLevelRun = await (this.dependencies.teamRunService ?? getTeamRunService())
      .resolveTeamRun(teamRunId);
    if (topLevelRun) {
      if (topLevelRun.runId !== teamRunId) {
        throw new TaskDelegationError(
          "TEAM_RUN_MISMATCH",
          `Resolved team run '${topLevelRun.runId}' does not match bound context '${teamRunId}'.`,
        );
      }
      return topLevelRun;
    }

    const taskTeamRun = (this.dependencies.taskTeamActiveRunDirectory ?? getTaskTeamActiveRunDirectory())
      .resolveActiveRun(teamRunId);
    if (taskTeamRun) return taskTeamRun;
    throw new TaskDelegationError(
      "TEAM_RUN_NOT_FOUND",
      `Team run '${teamRunId}' is not active, could not be restored, and is not an active task-scoped team run.`,
    );
  }

  getService(run: TeamRun): TaskDelegationService {
    return (this.dependencies.runRegistry ?? getTaskDelegationRunRegistry()).getOrCreate(run);
  }
}
