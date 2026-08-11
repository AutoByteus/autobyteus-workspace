import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
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
import {
  getSubTeamActiveRunDirectory,
  type SubTeamActiveRunDirectory,
} from "../../agent-team-execution/services/sub-team-active-run-directory.js";
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
      taskId: string;
    };

export type TaskDelegationDelegateRoute = {
  service: TaskDelegationService;
  currentRun: TeamRun;
  rootRun: TeamRun;
};

export class TaskDelegationToolRunRouter {
  constructor(private readonly dependencies: {
    teamRunService?: TeamRunService;
    runRegistry?: TaskDelegationRunRegistry;
    taskTeamActiveRunDirectory?: TaskTeamActiveRunDirectory;
    subTeamActiveRunDirectory?: SubTeamActiveRunDirectory;
  } = {}) {}

  async resolveServiceForDelegateOrReview(
    context: TaskDelegationToolContext,
  ): Promise<TaskDelegationService> {
    return this.getService(await this.resolveActiveTeamRun(context.teamRunId));
  }

  async resolveRouteForDelegate(
    context: TaskDelegationToolContext,
  ): Promise<TaskDelegationDelegateRoute> {
    const currentRun = await this.resolveActiveTeamRun(context.teamRunId);
    const rootRun = await this.resolveRootTeamRun(context.addressing.rootTeamRunId);
    return { service: this.getService(currentRun), currentRun, rootRun };
  }

  async resolveServiceForSubmit(
    context: TaskDelegationToolContext,
  ): Promise<TaskDelegationSubmitRoute> {
    const executionAddress = context.caller.executionAddress;
    const taskId = context.caller.taskId?.trim() || null;
    if (taskId && executionAddress.taskAgentRunId === null && executionAddress.taskTeamRunIds.length > 0) {
      const parentRunId = executionAddress.taskTeamRunIds.length === 1
        ? executionAddress.rootTeamRunId
        : executionAddress.taskTeamRunIds.at(-2)!;
      const parentRun = await this.resolveActiveTeamRun(parentRunId);
      return {
        kind: "task_team_ingress_parent",
        service: this.getService(parentRun),
        context,
        taskId,
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

    const subTeamRun = (this.dependencies.subTeamActiveRunDirectory ?? getSubTeamActiveRunDirectory())
      .resolveActiveRun(teamRunId);
    if (subTeamRun) return subTeamRun;

    const taskTeamRun = (this.dependencies.taskTeamActiveRunDirectory ?? getTaskTeamActiveRunDirectory())
      .resolveActiveRun(teamRunId);
    if (taskTeamRun) return taskTeamRun;

    const restoredTopLevelRun = await (this.dependencies.teamRunService ?? getTeamRunService())
      .resolveTeamRun(teamRunId);
    if (restoredTopLevelRun) {
      if (restoredTopLevelRun.teamRunId !== teamRunId) {
        throw new TaskDelegationError(
          "TEAM_RUN_MISMATCH",
          `Resolved team run '${restoredTopLevelRun.teamRunId}' does not match bound context '${teamRunId}'.`,
        );
      }
      return restoredTopLevelRun;
    }
    throw new TaskDelegationError(
      "TEAM_RUN_NOT_FOUND",
      `Team run '${teamRunId}' is not active, could not be restored, and is not an active child TeamRun.`,
    );
  }

  getService(run: TeamRun): TaskDelegationService {
    return (this.dependencies.runRegistry ?? getTaskDelegationRunRegistry()).getOrCreate(run);
  }

  private async resolveRootTeamRun(rootTeamRunId: string): Promise<TeamRun> {
    const normalized = rootTeamRunId.trim();
    const rootRun = await (this.dependencies.teamRunService ?? getTeamRunService())
      .resolveTeamRun(normalized);
    if (!rootRun || rootRun.teamRunId !== normalized) {
      throw new TaskDelegationError(
        "TEAM_RUN_NOT_FOUND",
        `Collaboration root TeamRun '${normalized}' is not active.`,
      );
    }
    return rootRun;
  }
}
