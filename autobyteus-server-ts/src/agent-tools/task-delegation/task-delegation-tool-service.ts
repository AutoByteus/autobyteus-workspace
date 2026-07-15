import type { MemberTeamContext } from "../../agent-team-execution/domain/member-team-context.js";
import type {
  DelegateTaskInput,
  DelegateTaskResult,
  ReviewTaskResultInput,
  ReviewTaskResultResult,
  SubmitTaskResultInput,
  SubmitTaskResultResult,
  TaskDelegationCallerIdentity,
  TaskDelegationContext,
} from "../../agent-team-execution/task-delegation/task-delegation-record.js";
import { toTaskDelegationContextMember, toTaskDelegationMemberIdentity } from "./task-delegation-context-member-mapper.js";
import type { TaskDelegationToolContext } from "./task-delegation-tool-contract.js";
import { TaskDelegationToolRunRouter } from "./task-delegation-tool-run-router.js";

export const buildTaskDelegationToolContextFromMemberTeamContext = (
  memberTeamContext: MemberTeamContext,
): TaskDelegationToolContext => {
  const caller: TaskDelegationCallerIdentity = {
    ...toTaskDelegationMemberIdentity(memberTeamContext),
    ...(memberTeamContext.taskAgentInstance
      ? {
          taskAgentInstanceId: memberTeamContext.taskAgentInstance.taskAgentInstanceId,
          taskAgentRunId: memberTeamContext.taskAgentInstance.taskAgentRunId,
          taskId: memberTeamContext.taskAgentInstance.taskId,
          logicalMemberRouteKey: memberTeamContext.taskAgentInstance.logicalMember.memberRouteKey,
        }
      : {}),
    taskTeamInstance: memberTeamContext.taskTeamInstance ?? null,
  };
  return {
    teamRunId: memberTeamContext.teamRunId,
    teamDefinitionId: memberTeamContext.teamDefinitionId,
    teamName: memberTeamContext.teamName,
    caller,
    coordinatorMemberRouteKey: memberTeamContext.coordinatorMemberRouteKey,
    members: memberTeamContext.members.map(toTaskDelegationContextMember),
  };
};

export class TaskDelegationToolService {
  private readonly runRouter: TaskDelegationToolRunRouter;

  constructor(dependencies: {
    runRouter?: TaskDelegationToolRunRouter;
  } = {}) {
    this.runRouter = dependencies.runRouter ?? new TaskDelegationToolRunRouter();
  }

  async delegateTask(
    context: TaskDelegationToolContext,
    input: DelegateTaskInput,
  ): Promise<DelegateTaskResult> {
    const service = await this.runRouter.resolveServiceForDelegateOrReview(context);
    return service.delegateTask(context, input);
  }

  async submitTaskResult(
    context: TaskDelegationToolContext,
    input: SubmitTaskResultInput,
  ): Promise<SubmitTaskResultResult> {
    const route = await this.runRouter.resolveServiceForSubmit(context);
    return route.kind === "task_team_ingress_parent"
      ? route.service.submitTaskTeamIngressResult(route.context, input, route.taskTeamInstance)
      : route.service.submitTaskAgentResult(route.context, input);
  }

  async reviewTaskResult(
    context: TaskDelegationToolContext,
    input: ReviewTaskResultInput,
  ): Promise<ReviewTaskResultResult> {
    const service = await this.runRouter.resolveServiceForDelegateOrReview(context);
    return service.reviewTaskResult(context, input);
  }
}

let cachedTaskDelegationToolService: TaskDelegationToolService | null = null;

export const getTaskDelegationToolService = (): TaskDelegationToolService => {
  if (!cachedTaskDelegationToolService) cachedTaskDelegationToolService = new TaskDelegationToolService();
  return cachedTaskDelegationToolService;
};
