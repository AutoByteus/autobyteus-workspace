import {
  TaskDelegationError,
  type DelegateTaskInput,
  type TaskDelegationCallerIdentity,
  type TaskDelegationContext,
  type TaskDelegationDelegatorIdentity,
  type TaskDelegationMemberIdentity,
  type TaskDelegationTaskInput,
} from "./task-delegation-record.js";
import type {
  CreateTaskDelegationRecordInput,
  TaskDelegationLedger,
} from "./task-delegation-ledger.js";

export const normalizeRequiredTaskDelegationString = (
  value: string,
  fieldName: string,
): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new TaskDelegationError("VALIDATION_ERROR", `${fieldName} is required.`);
  }
  return normalized;
};

export const cloneTaskDelegationMemberIdentity = (
  identity: TaskDelegationMemberIdentity,
): TaskDelegationMemberIdentity => ({
  memberName: identity.memberName,
  memberPath: [...identity.memberPath],
  memberRouteKey: identity.memberRouteKey,
  memberRunId: identity.memberRunId,
  runtimeKind: identity.runtimeKind ?? null,
});

export const cloneTaskDelegationDelegatorIdentity = (
  identity: TaskDelegationCallerIdentity,
): TaskDelegationDelegatorIdentity => ({
  ...cloneTaskDelegationMemberIdentity(identity),
  taskAgentInstanceId: identity.taskAgentInstanceId ?? null,
  taskAgentRunId: identity.taskAgentRunId ?? null,
  taskId: identity.taskId ?? null,
  logicalMemberRouteKey: identity.logicalMemberRouteKey ?? null,
});

export class TaskDelegationInputResolver {
  constructor(
    private readonly teamRunId: string,
    private readonly ledger: TaskDelegationLedger,
  ) {}

  assertContext(context: TaskDelegationContext): void {
    const contextTeamRunId = normalizeRequiredTaskDelegationString(
      context.teamRunId,
      "teamRunId",
    );
    if (contextTeamRunId !== this.teamRunId) {
      throw new TaskDelegationError(
        "TEAM_RUN_MISMATCH",
        `Task delegation call is bound to team run '${contextTeamRunId}', not '${this.teamRunId}'.`,
      );
    }
    normalizeRequiredTaskDelegationString(context.caller.memberName, "caller.memberName");
    normalizeRequiredTaskDelegationString(context.caller.memberRouteKey, "caller.memberRouteKey");
    normalizeRequiredTaskDelegationString(context.caller.memberRunId, "caller.memberRunId");
    this.assertTaskAgentCallerShape(context.caller);
    this.assertAuthorizedDelegator(context);
  }

  buildCreateInput(
    context: TaskDelegationContext,
    input: DelegateTaskInput,
  ): CreateTaskDelegationRecordInput {
    const task = this.normalizeTaskInput(input);
    const member = this.resolveMember(context, task.member_name);
    return {
      taskId: this.ledger.reserveTaskId(),
      task,
      member,
      delegator: cloneTaskDelegationDelegatorIdentity(context.caller),
    };
  }

  normalizeStatusMessage(message: string | null | undefined): string | null {
    if (message === undefined || message === null) {
      return null;
    }
    const normalized = message.trim();
    return normalized.length > 0 ? normalized : null;
  }

  normalizeReferenceFiles(referenceFiles: readonly string[] | undefined): string[] {
    return (referenceFiles ?? []).map((referenceFile) =>
      normalizeRequiredTaskDelegationString(referenceFile, "reference_files item"),
    );
  }

  private normalizeTaskInput(task: TaskDelegationTaskInput): TaskDelegationTaskInput {
    return {
      member_name: normalizeRequiredTaskDelegationString(task.member_name, "member_name"),
      description: normalizeRequiredTaskDelegationString(task.description, "description"),
      reference_files: this.normalizeReferenceFiles(task.reference_files),
    };
  }

  private resolveMember(
    context: TaskDelegationContext,
    memberName: string,
  ): TaskDelegationMemberIdentity {
    const matches = context.members.filter(
      (member) => member.memberName === memberName,
    );
    if (matches.length !== 1) {
      throw new TaskDelegationError(
        matches.length === 0 ? "MEMBER_NOT_FOUND" : "MEMBER_AMBIGUOUS",
        matches.length === 0
          ? `Member '${memberName}' was not found in the current team run.`
          : `Member '${memberName}' matched multiple team members; member_name must be unique.`,
      );
    }
    return cloneTaskDelegationMemberIdentity(matches[0]);
  }

  private assertAuthorizedDelegator(context: TaskDelegationContext): void {
    const callerRouteKey = context.caller.memberRouteKey.trim();
    const logicalRouteKey = context.caller.logicalMemberRouteKey?.trim() || callerRouteKey;
    const member = context.members.find((candidate) => candidate.memberRouteKey === logicalRouteKey) ?? null;
    if (!member || member.memberName !== context.caller.memberName) {
      throw new TaskDelegationError(
        "DELEGATOR_NOT_AUTHORIZED",
        `Caller '${context.caller.memberName}' is not an authorized active team member for this delegation context.`,
      );
    }
    const taskAgentRunId = context.caller.taskAgentRunId?.trim() || null;
    if (taskAgentRunId) {
      if (context.caller.memberRunId !== taskAgentRunId || callerRouteKey !== logicalRouteKey) {
        throw new TaskDelegationError(
          "DELEGATOR_NOT_AUTHORIZED",
          `Task-agent delegator '${context.caller.memberName}' has inconsistent caller identity.`,
        );
      }
      return;
    }
    if (member.memberRunId !== context.caller.memberRunId) {
      throw new TaskDelegationError(
        "DELEGATOR_NOT_AUTHORIZED",
        `Caller run '${context.caller.memberRunId}' is not authorized for member '${context.caller.memberName}'.`,
      );
    }
  }

  private assertTaskAgentCallerShape(caller: TaskDelegationCallerIdentity): void {
    const taskAgentFields = [
      caller.taskAgentRunId?.trim(),
      caller.taskId?.trim(),
      caller.logicalMemberRouteKey?.trim(),
    ];
    if (taskAgentFields.some(Boolean) && !taskAgentFields.every(Boolean)) {
      throw new TaskDelegationError(
        "TASK_AGENT_CONTEXT_INCOMPLETE",
        "Task-agent delegation context requires taskAgentRunId, taskId, and logicalMemberRouteKey.",
      );
    }
  }
}
