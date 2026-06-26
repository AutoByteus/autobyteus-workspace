import type {
  MemberTeamContext,
  MemberTeamDescriptor,
} from "../../agent-team-execution/domain/member-team-context.js";
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
import type {
  TaskDelegationContextMember,
  TaskDelegationMemberIdentity,
  TaskDelegationTeamIdentity,
} from "../../agent-team-execution/task-delegation/task-delegation-target.js";
import type { TaskDelegationToolContext } from "./task-delegation-tool-contract.js";
import { TaskDelegationToolRunRouter } from "./task-delegation-tool-run-router.js";

const toMemberIdentity = (member: {
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  memberRunId: string;
  runtimeKind?: TaskDelegationMemberIdentity["runtimeKind"];
  role?: string | null;
  description?: string | null;
}): TaskDelegationMemberIdentity => ({
  memberKind: "agent",
  memberName: member.memberName,
  memberPath: [...member.memberPath],
  memberRouteKey: member.memberRouteKey,
  memberRunId: member.memberRunId,
  runtimeKind: member.runtimeKind ?? null,
  role: member.role ?? null,
  description: member.description ?? null,
});

const toTeamIdentity = (
  member: Extract<MemberTeamDescriptor, { memberKind: "agent_team" }>,
): TaskDelegationTeamIdentity => ({
  memberKind: "agent_team",
  memberName: member.memberName,
  memberPath: [...member.memberPath],
  memberRouteKey: member.memberRouteKey,
  memberRunId: member.memberRunId,
  teamDefinitionId: member.teamDefinitionId,
  childTeamRunId: member.childTeamRunId ?? null,
  coordinatorMemberRouteKey: member.coordinatorMemberRouteKey ?? null,
  ingress: member.representative
    ? {
        memberName: member.representative.memberName,
        memberPath: [...member.representative.memberPath],
        memberRouteKey: member.representative.memberRouteKey,
        memberRunId: member.representative.memberRunId,
        runtimeKind: member.representative.runtimeKind ?? null,
        role: member.representative.role ?? null,
        description: member.representative.description ?? null,
      }
    : null,
  role: member.role ?? null,
  description: member.description ?? null,
});

const toContextMember = (member: MemberTeamDescriptor): TaskDelegationContextMember =>
  member.memberKind === "agent_team" ? toTeamIdentity(member) : toMemberIdentity(member);

export const buildTaskDelegationToolContextFromMemberTeamContext = (
  memberTeamContext: MemberTeamContext,
): TaskDelegationToolContext => {
  const caller: TaskDelegationCallerIdentity = {
    ...toMemberIdentity(memberTeamContext),
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
    members: memberTeamContext.members.map(toContextMember),
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
