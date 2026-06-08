import type { MemberTeamContext } from "../../agent-team-execution/domain/member-team-context.js";
import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import {
  getTaskDelegationRunRegistry,
  type TaskDelegationRunRegistry,
} from "../../agent-team-execution/task-delegation/task-delegation-run-registry.js";
import type {
  AcceptTaskInput,
  AcceptTaskResult,
  DelegateTasksInput,
  DelegateTasksResult,
  TaskDelegationCallerIdentity,
  TaskDelegationMemberIdentity,
} from "../../agent-team-execution/task-delegation/task-delegation-record.js";
import { TaskDelegationError } from "../../agent-team-execution/task-delegation/task-delegation-record.js";
import {
  getTeamRunService,
  type TeamRunService,
} from "../../agent-team-execution/services/team-run-service.js";
import type { TaskDelegationToolContext } from "./task-delegation-tool-contract.js";

const toIdentity = (member: {
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  memberRunId: string;
  runtimeKind?: TaskDelegationMemberIdentity["runtimeKind"];
}): TaskDelegationMemberIdentity => ({
  memberName: member.memberName,
  memberPath: [...member.memberPath],
  memberRouteKey: member.memberRouteKey,
  memberRunId: member.memberRunId,
  runtimeKind: member.runtimeKind ?? null,
});

export const buildTaskDelegationToolContextFromMemberTeamContext = (
  memberTeamContext: MemberTeamContext,
): TaskDelegationToolContext => {
  const caller: TaskDelegationCallerIdentity = {
    ...toIdentity(memberTeamContext),
    ...(memberTeamContext.taskAgentInstance
      ? {
          taskAgentRunId: memberTeamContext.taskAgentInstance.taskAgentRunId,
          taskId: memberTeamContext.taskAgentInstance.taskId,
          logicalMemberRouteKey:
            memberTeamContext.taskAgentInstance.logicalMember.memberRouteKey,
        }
      : {}),
  };
  const members = memberTeamContext.members.map(toIdentity);
  return {
    teamRunId: memberTeamContext.teamRunId,
    teamDefinitionId: memberTeamContext.teamDefinitionId,
    teamName: memberTeamContext.teamName,
    caller,
    coordinatorMemberRouteKey: memberTeamContext.coordinatorMemberRouteKey,
    members,
  };
};

export class TaskDelegationToolService {
  constructor(private readonly dependencies: {
    teamRunService?: TeamRunService;
    runRegistry?: TaskDelegationRunRegistry;
  } = {}) {}

  async delegateTasks(
    context: TaskDelegationToolContext,
    input: DelegateTasksInput,
  ): Promise<DelegateTasksResult> {
    const run = await this.resolveBoundTeamRun(context);
    return this.getTaskDelegationService(run).delegateTasks(context, input);
  }

  async acceptTask(
    context: TaskDelegationToolContext,
    input: AcceptTaskInput,
  ): Promise<AcceptTaskResult> {
    const run = await this.resolveBoundTeamRun(context);
    return this.getTaskDelegationService(run).acceptTask(context, input);
  }

  private async resolveBoundTeamRun(
    context: TaskDelegationToolContext,
  ): Promise<TeamRun> {
    const teamRunId = context.teamRunId?.trim();
    if (!teamRunId) {
      throw new TaskDelegationError(
        "TEAM_RUN_CONTEXT_REQUIRED",
        "Task delegation tools require an active team run context.",
      );
    }
    const run = await (this.dependencies.teamRunService ?? getTeamRunService())
      .resolveTeamRun(teamRunId);
    if (!run) {
      throw new TaskDelegationError(
        "TEAM_RUN_NOT_FOUND",
        `Team run '${teamRunId}' is not active or could not be restored.`,
      );
    }
    if (run.runId !== teamRunId) {
      throw new TaskDelegationError(
        "TEAM_RUN_MISMATCH",
        `Resolved team run '${run.runId}' does not match bound context '${teamRunId}'.`,
      );
    }
    return run;
  }

  private getTaskDelegationService(run: TeamRun) {
    return (this.dependencies.runRegistry ?? getTaskDelegationRunRegistry())
      .getOrCreate(run);
  }
}

let cachedTaskDelegationToolService: TaskDelegationToolService | null = null;

export const getTaskDelegationToolService = (): TaskDelegationToolService => {
  if (!cachedTaskDelegationToolService) {
    cachedTaskDelegationToolService = new TaskDelegationToolService();
  }
  return cachedTaskDelegationToolService;
};
