import {
  TaskDelegationError,
  type DelegateTaskInput,
  type TaskDelegationCallerIdentity,
  type TaskDelegationContext,
  type TaskDelegationDelegatorIdentity,
  type TaskDelegationTaskInput,
} from "./task-delegation-record.js";
import type { TaskDelegationTarget } from "./task-delegation-target.js";
import { cloneTaskDelegationTarget } from "./task-delegation-target.js";
import {
  normalizeExplicitAbsoluteLocalReferenceFiles,
  type ExplicitAbsoluteLocalReferenceFileValidationError,
} from "../../services/reference-files/absolute-local-reference-files.js";
import { createMemberLogicalAddressContext } from "../domain/member-logical-address-context.js";
import { createTeamExecutionAddress } from "../domain/team-execution-address.js";

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
  executionAddress: createTeamExecutionAddress(identity.executionAddress),
  agentRunId: identity.agentRunId,
  taskAgentInstance: identity.taskAgentInstance ?? null,
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
    normalizeRequiredTaskDelegationString(context.caller.agentRunId, "caller.agentRunId");
    createTeamExecutionAddress(context.caller.executionAddress);
    normalizeRequiredTaskDelegationString(context.addressing.rootTeamRunId, "addressing.rootTeamRunId");
    createMemberLogicalAddressContext(context.addressing);
  }

  normalizeCreateInput(input: DelegateTaskInput): TaskDelegationTaskInput {
    return {
      recipient_address: input.recipient_address,
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

}
