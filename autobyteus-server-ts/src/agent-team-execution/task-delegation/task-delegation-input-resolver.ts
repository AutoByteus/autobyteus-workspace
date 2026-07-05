import {
  TaskDelegationError,
  type DelegateTaskInput,
  type TaskDelegationCallerIdentity,
  type TaskDelegationContext,
  type TaskDelegationDelegatorIdentity,
  type TaskDelegationTaskInput,
} from "./task-delegation-record.js";
import type {
  TaskDelegationContextMember,
  TaskDelegationMemberIdentity,
  TaskDelegationTarget,
  TaskDelegationTeamIdentity,
} from "./task-delegation-target.js";
import {
  cloneTaskDelegationMemberIdentity,
  cloneTaskDelegationTeamIdentity,
} from "./task-delegation-target.js";
import {
  normalizeExplicitAbsoluteLocalReferenceFiles,
  type ExplicitAbsoluteLocalReferenceFileValidationError,
} from "../../services/reference-files/absolute-local-reference-files.js";

export const normalizeRequiredTaskDelegationString = (
  value: string,
  fieldName: string,
): string => {
  const normalized = value.trim();
  if (!normalized) throw new TaskDelegationError("VALIDATION_ERROR", `${fieldName} is required.`);
  return normalized;
};

export const cloneTaskDelegationDelegatorIdentity = (
  identity: TaskDelegationCallerIdentity,
): TaskDelegationDelegatorIdentity => ({
  ...cloneTaskDelegationMemberIdentity(identity),
  taskAgentInstanceId: identity.taskAgentInstanceId ?? null,
  taskAgentRunId: identity.taskAgentRunId ?? null,
  taskId: identity.taskId ?? null,
  logicalMemberRouteKey: identity.logicalMemberRouteKey ?? null,
  taskTeamInstance: identity.taskTeamInstance ?? null,
});

const isAgentMember = (member: TaskDelegationContextMember): member is TaskDelegationMemberIdentity =>
  member.memberKind !== "agent_team";

const isTeamMember = (member: TaskDelegationContextMember): member is TaskDelegationTeamIdentity =>
  member.memberKind === "agent_team";

const referenceFilesValidationMessage = (
  error: ExplicitAbsoluteLocalReferenceFileValidationError,
): string => {
  const location = error.index === undefined ? "" : ` index=${error.index}`;
  return `reference_files must be an array of absolute local file path strings. Invalid${location} reason=${error.reason}.`;
};

export class TaskDelegationInputResolver {
  constructor(private readonly teamRunId: string) {}

  assertContext(context: TaskDelegationContext): void {
    const contextTeamRunId = normalizeRequiredTaskDelegationString(context.teamRunId, "teamRunId");
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
    taskId: string,
  ) {
    const task = this.normalizeTaskInput(input);
    const target = this.resolveTarget(context, task.target);
    return {
      taskId,
      task,
      target,
      delegator: cloneTaskDelegationDelegatorIdentity(context.caller),
    };
  }

  normalizeStatusMessage(message: string | null | undefined): string | null {
    if (message === undefined || message === null) return null;
    const normalized = message.trim();
    return normalized.length > 0 ? normalized : null;
  }

  normalizeReferenceFiles(referenceFiles: readonly string[] | undefined): string[] {
    const result = normalizeExplicitAbsoluteLocalReferenceFiles(referenceFiles ?? []);
    if (!result.ok) {
      throw new TaskDelegationError(
        "VALIDATION_ERROR",
        referenceFilesValidationMessage(result.error),
      );
    }
    return result.referenceFiles;
  }

  private normalizeTaskInput(task: TaskDelegationTaskInput): TaskDelegationTaskInput {
    const target = task.target;
    if (!target || typeof target !== "object") {
      throw new TaskDelegationError("TASK_TARGET_KIND_REQUIRED", "delegate_task target.kind is required.");
    }
    const kind = typeof target.kind === "string" ? target.kind.trim() : "";
    if (!kind) throw new TaskDelegationError("TASK_TARGET_KIND_REQUIRED", "delegate_task target.kind is required.");
    if (kind !== "member" && kind !== "team") {
      throw new TaskDelegationError("TASK_TARGET_KIND_UNSUPPORTED", "delegate_task target.kind must be 'member' or 'team'.");
    }
    return {
      target: {
        kind,
        name: normalizeRequiredTaskDelegationString(target.name, "target.name"),
      },
      description: normalizeRequiredTaskDelegationString(task.description, "description"),
      reference_files: this.normalizeReferenceFiles(task.reference_files),
    };
  }

  private resolveTarget(
    context: TaskDelegationContext,
    target: TaskDelegationTaskInput["target"],
  ): TaskDelegationTarget {
    if (target.kind === "member") {
      return { kind: "member", member: this.resolveMemberTarget(context, target.name) };
    }
    return { kind: "team", team: this.resolveTeamTarget(context, target.name) };
  }

  private resolveMemberTarget(
    context: TaskDelegationContext,
    memberName: string,
  ): TaskDelegationMemberIdentity {
    const matches = context.members.filter(
      (member): member is TaskDelegationMemberIdentity =>
        isAgentMember(member) && member.memberName === memberName,
    );
    if (matches.length !== 1) {
      throw new TaskDelegationError(
        matches.length === 0 ? "TASK_MEMBER_TARGET_NOT_FOUND" : "TASK_TARGET_AMBIGUOUS",
        matches.length === 0
          ? `Member target '${memberName}' was not found as a physical agent member in the current team run.`
          : `Member target '${memberName}' matched multiple physical members; use a unique target name.`,
      );
    }
    const member = matches[0]!;
    const callerLogicalRouteKey = context.caller.logicalMemberRouteKey?.trim() || context.caller.memberRouteKey.trim();
    if (member.memberRouteKey === callerLogicalRouteKey || member.memberRunId === context.caller.memberRunId) {
      throw new TaskDelegationError(
        "TASK_MEMBER_TARGET_SELF_NOT_ALLOWED",
        `Member target '${memberName}' is the current live member and cannot receive a delegated task from itself.`,
      );
    }
    return cloneTaskDelegationMemberIdentity(member);
  }

  private resolveTeamTarget(
    context: TaskDelegationContext,
    teamName: string,
  ): TaskDelegationTeamIdentity {
    const matches = context.members.filter(
      (member): member is TaskDelegationTeamIdentity =>
        isTeamMember(member) && member.memberName === teamName,
    );
    if (matches.length !== 1) {
      throw new TaskDelegationError(
        matches.length === 0 ? "TASK_TEAM_TARGET_NOT_FOUND" : "TASK_TARGET_AMBIGUOUS",
        matches.length === 0
          ? `Team target '${teamName}' was not found as a visible team in the current team run.`
          : `Team target '${teamName}' matched multiple visible teams; use a unique target name.`,
      );
    }
    if (!matches[0]!.ingress) {
      throw new TaskDelegationError(
        "TASK_TEAM_TARGET_INGRESS_NOT_FOUND",
        `Team target '${teamName}' has no resolvable coordinator/default ingress member.`,
      );
    }
    return cloneTaskDelegationTeamIdentity(matches[0]!);
  }

  private assertAuthorizedDelegator(context: TaskDelegationContext): void {
    const callerRouteKey = context.caller.memberRouteKey.trim();
    const logicalRouteKey = context.caller.logicalMemberRouteKey?.trim() || callerRouteKey;
    const member = context.members.find((candidate) =>
      isAgentMember(candidate) && candidate.memberRouteKey === logicalRouteKey,
    ) as TaskDelegationMemberIdentity | undefined;
    if (!member || member.memberName !== context.caller.memberName) {
      throw new TaskDelegationError(
        "DELEGATOR_NOT_AUTHORIZED",
        `Caller '${context.caller.memberName}' is not an authorized active team member for this delegation context.`,
      );
    }
    const taskAgentRunId = context.caller.taskAgentRunId?.trim() || null;
    if (taskAgentRunId) {
      if (context.caller.memberRunId !== taskAgentRunId || callerRouteKey !== logicalRouteKey) {
        throw new TaskDelegationError("DELEGATOR_NOT_AUTHORIZED", `Task-agent delegator '${context.caller.memberName}' has inconsistent caller identity.`);
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
