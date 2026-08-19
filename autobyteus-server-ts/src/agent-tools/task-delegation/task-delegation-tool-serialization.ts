import { toJsonString } from "../json-utils.js";
import {
  TaskDelegationError,
} from "../../agent-team-execution/task-delegation/task-delegation-record.js";
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

export const toTaskDelegationJsonString = (value: unknown): string =>
  toJsonString(value, 2);
