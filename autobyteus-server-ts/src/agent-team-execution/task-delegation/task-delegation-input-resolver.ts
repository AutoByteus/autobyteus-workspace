import {
  TaskDelegationError,
  type DelegateTasksInput,
  type TaskDelegationContext,
  type TaskDelegationMemberIdentity,
  type TaskDelegationTaskInput,
  type UpdateTaskStatusInput,
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
  }

  buildCreateInputs(
    context: TaskDelegationContext,
    input: DelegateTasksInput,
  ): CreateTaskDelegationRecordInput[] {
    const normalizedTasks = input.tasks.map((task) => this.normalizeTaskInput(task));
    const members = normalizedTasks.map((task) =>
      this.resolveMember(context, task.member_name),
    );
    return normalizedTasks.map((task, index) => ({
      taskId: this.ledger.reserveTaskId(),
      task,
      member: members[index]!,
      delegator: cloneTaskDelegationMemberIdentity(context.caller),
    }));
  }

  normalizeStatusMessage(message: UpdateTaskStatusInput["message"]): string | null {
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
}
