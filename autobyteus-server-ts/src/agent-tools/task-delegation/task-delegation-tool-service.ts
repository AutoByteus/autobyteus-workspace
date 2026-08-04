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
import type { TaskDelegationToolContext } from "./task-delegation-tool-contract.js";
import { TaskDelegationToolRunRouter } from "./task-delegation-tool-run-router.js";

export const buildTaskDelegationToolContextFromMemberTeamContext = (
  memberTeamContext: MemberTeamContext,
): TaskDelegationToolContext => {
  const caller: TaskDelegationCallerIdentity = {
    executionAddress: memberTeamContext.executionAddress,
    agentRunId: memberTeamContext.agentRunId,
    taskAgentInstance: memberTeamContext.taskAgentInstance,
    taskTeamInstance: memberTeamContext.taskTeamInstance ?? null,
  };
  return {
    teamRunId: memberTeamContext.teamRunId,
    teamDefinitionId: memberTeamContext.teamDefinitionId,
    teamName: memberTeamContext.teamName,
    caller,
    coordinatorAddress: memberTeamContext.coordinatorAddress,
    addressing: memberTeamContext.collaboration.addressing,
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
    const route = await this.runRouter.resolveRouteForDelegate(context);
    const placement = route.rootRun.resolveRecipient(input.recipient_address, context.addressing);
    return route.service.delegateTask(context, input, placement);
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
