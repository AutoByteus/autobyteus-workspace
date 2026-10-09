import { toJsonString } from "../json-utils.js";
import {
  TaskDelegationError,
  type TaskDelegationOutcome,
} from "../../agent-collaboration/execution/task/task-delegation-command.js";
import type { DelegateTaskResult } from "../../agent-team-execution/task-delegation/task-delegation-result-contract.js";
import type { TaskDelegationToolErrorPayload } from "./task-delegation-tool-contract.js";
import { isCollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";

export const toTaskDelegationToolErrorPayload = (
  error: unknown,
): TaskDelegationToolErrorPayload => {
  if (error instanceof TaskDelegationError || isCollaborationContractError(error)) {
    return {
      error: {
        code: error.code,
        message: error.message,
      },
    };
  }
  return {
    error: {
      code: "TASK_DELEGATION_ERROR",
      message: error instanceof Error ? error.message : String(error),
    },
  };
};

/** The internal outcome as the tool's explicit-ID result (snake_case only at this edge). */
export const toDelegateTaskResult = (outcome: TaskDelegationOutcome): DelegateTaskResult => {
  if (!outcome.delegated) return { delegated: false, message: outcome.message };
  const taskId = outcome.taskId ? { task_id: outcome.taskId } : {};
  return outcome.copy.kind === "agent"
    ? { delegated: true, target_kind: "agent", target_agent_run_id: outcome.copy.agentRunId, ...taskId }
    : { delegated: true, target_kind: "team", target_team_run_id: outcome.copy.teamRunId,
      target_team_coordinator_agent_run_id: outcome.copy.teamCoordinatorAgentRunId, ...taskId };
};

export const toTaskDelegationJsonString = (value: unknown): string =>
  toJsonString(value, 2);
