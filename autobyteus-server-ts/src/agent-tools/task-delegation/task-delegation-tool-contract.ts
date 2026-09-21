import type {
  DelegateTaskInput,
  DelegateTaskResult,
  ReviewTaskResultInput,
  ReviewTaskResultResult,
  SubmitTaskResultInput,
  SubmitTaskResultResult,
} from "../../agent-collaboration/execution/task/task-lifecycle-command.js";
import {
  cloneCollaborationMemberExecutionIdentity,
  sameRootExecutionIdentity,
  type CollaborationMemberExecutionIdentity,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import {
  requireMemberTaskCommandCapability,
  type MemberTaskCommandCapability,
} from "../../agent-collaboration/execution/task/member-task-command-capability.js";
import type { ToolConfig } from "autobyteus-ts/tools/tool-config.js";

export const DELEGATE_TASK_TOOL_NAME = "delegate_task";
export const SUBMIT_TASK_RESULT_TOOL_NAME = "submit_task_result";
export const REVIEW_TASK_RESULT_TOOL_NAME = "review_task_result";

export const TASK_DELEGATION_TOOL_NAME_LIST = [
  DELEGATE_TASK_TOOL_NAME,
  SUBMIT_TASK_RESULT_TOOL_NAME,
  REVIEW_TASK_RESULT_TOOL_NAME,
] as const;

export type TaskDelegationToolName =
  (typeof TASK_DELEGATION_TOOL_NAME_LIST)[number];

export const TASK_DELEGATION_TOOL_NAMES = new Set<string>(
  TASK_DELEGATION_TOOL_NAME_LIST,
);

export const isTaskDelegationToolName = (value: string | null | undefined): boolean =>
  typeof value === "string" && TASK_DELEGATION_TOOL_NAMES.has(value.trim());

export type TaskDelegationToolContext = Readonly<{
  identity: CollaborationMemberExecutionIdentity;
  commands: MemberTaskCommandCapability;
}>;

export const TASK_DELEGATION_TOOL_CONFIG_KEY = "taskDelegation";

export const requireConfiguredTaskDelegationToolContext = (
  config: ToolConfig | null | undefined,
): TaskDelegationToolContext => {
  const value = config?.get<unknown>(TASK_DELEGATION_TOOL_CONFIG_KEY);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Task delegation tools require a bound taskDelegation ToolConfig.");
  }
  const context = value as Partial<TaskDelegationToolContext>;
  const identity = context.identity;
  if (
    !identity ||
    !identity.root ||
    (identity.root.rootSubjectKind !== "agent_team" && identity.root.rootSubjectKind !== "agent_org") ||
    typeof identity.root.rootRunId !== "string" ||
    !identity.root.rootRunId.trim() ||
    typeof identity.memberAddress !== "string" ||
    !identity.memberAddress.trim() ||
    typeof identity.agentRunId !== "string" ||
    !identity.agentRunId.trim() ||
    !context.commands
  ) {
    throw new Error("Task delegation tools require a valid bound taskDelegation context.");
  }
  const commands = requireMemberTaskCommandCapability(context.commands);
  if (!sameRootExecutionIdentity(identity.root, commands.root)) {
    throw new Error("Task delegation tool identity and commands belong to different roots.");
  }
  return Object.freeze({
    identity: cloneCollaborationMemberExecutionIdentity(identity),
    commands,
  });
};

export type TaskDelegationToolInputs = {
  [DELEGATE_TASK_TOOL_NAME]: DelegateTaskInput;
  [SUBMIT_TASK_RESULT_TOOL_NAME]: SubmitTaskResultInput;
  [REVIEW_TASK_RESULT_TOOL_NAME]: ReviewTaskResultInput;
};

export type TaskDelegationToolResults = {
  [DELEGATE_TASK_TOOL_NAME]: DelegateTaskResult;
  [SUBMIT_TASK_RESULT_TOOL_NAME]: SubmitTaskResultResult;
  [REVIEW_TASK_RESULT_TOOL_NAME]: ReviewTaskResultResult;
};

export type TaskDelegationToolErrorPayload = {
  error: {
    code: string;
    message: string;
  };
};
