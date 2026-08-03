import {
  TaskDelegationError,
  type DelegateTaskInput,
  type TaskDelegationCallerIdentity,
  type TaskDelegationContext,
  type TaskDelegationDelegatorIdentity,
  type TaskDelegationTaskInput,
} from "./task-delegation-record.js";
import type { TaskDelegationTarget } from "./task-delegation-target.js";
import { cloneTaskDelegationMemberIdentity, cloneTaskDelegationTarget } from "./task-delegation-target.js";
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
    normalizeRequiredTaskDelegationString(context.addressing.rootTeamRunId, "addressing.rootTeamRunId");
    if (context.addressing.memberAddress !== `/${context.addressing.memberPath.join("/")}`) {
      throw new TaskDelegationError("TEAM_RUN_CONTEXT_REQUIRED", "Task delegation caller addressing is inconsistent.");
    }
    this.assertTaskAgentCallerShape(context.caller);
  }

  normalizeCreateInput(input: DelegateTaskInput): TaskDelegationTaskInput {
    return {
      recipient_name: input.recipient_name,
      description: normalizeRequiredTaskDelegationString(input.description, "description"),
      reference_files: this.normalizeReferenceFiles(input.reference_files),
    };
  }

  buildCreateInput(
    context: TaskDelegationContext,
    task: TaskDelegationTaskInput,
    target: TaskDelegationTarget,
    taskId: string,
  ) {
    return {
      taskId,
      task,
      target: cloneTaskDelegationTarget(target),
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
      throw new TaskDelegationError("VALIDATION_ERROR", referenceFilesValidationMessage(result.error));
    }
    return result.referenceFiles;
  }

  private assertTaskAgentCallerShape(caller: TaskDelegationCallerIdentity): void {
    const fields = [
      caller.taskAgentRunId?.trim(),
      caller.taskId?.trim(),
      caller.logicalMemberRouteKey?.trim(),
    ];
    if (fields.some(Boolean) && !fields.every(Boolean)) {
      throw new TaskDelegationError(
        "TASK_AGENT_CONTEXT_INCOMPLETE",
        "Task-agent delegation context requires taskAgentRunId, taskId, and logicalMemberRouteKey.",
      );
    }
  }
}
