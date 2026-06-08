import type { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import type {
  AcceptTaskInput,
  AcceptTaskResult,
  DelegateTasksInput,
  DelegateTasksResult,
} from "../../agent-team-execution/task-delegation/task-delegation-record.js";
import {
  ACCEPT_TASK_TOOL_NAME,
  DELEGATE_TASKS_TOOL_NAME,
  type TaskDelegationToolContext,
  type TaskDelegationToolName,
} from "./task-delegation-tool-contract.js";
import {
  parseAcceptTaskInput,
  parseDelegateTasksInput,
} from "./task-delegation-tool-input-parsers.js";
import { buildTaskDelegationToolParameterSchema } from "./task-delegation-tool-parameter-schemas.js";
import type { TaskDelegationToolService } from "./task-delegation-tool-service.js";

type TaskDelegationToolParsedInput = DelegateTasksInput | AcceptTaskInput;
type TaskDelegationToolExecutionResult = DelegateTasksResult | AcceptTaskResult;

export type TaskDelegationToolManifestEntry = {
  name: TaskDelegationToolName;
  description: string;
  parameterSchema: ParameterSchema;
  parseInput: (rawArguments: Record<string, unknown>) => TaskDelegationToolParsedInput;
  execute: (
    service: TaskDelegationToolService,
    context: TaskDelegationToolContext,
    input: TaskDelegationToolParsedInput,
  ) => Promise<TaskDelegationToolExecutionResult>;
};

export const TASK_DELEGATION_TOOL_MANIFEST: TaskDelegationToolManifestEntry[] = [
  {
    name: DELEGATE_TASKS_TOOL_NAME,
    description:
      "Delegate one or more ready-to-run task work packets to exact logical team members. The framework derives you as delegator from tool context and starts one concrete task-agent per task. Task-agent progress, blockers, completion reports, feedback, and revisions use ordinary send_message_to messages; exact task-agent feedback uses target_agent_run_id returned by the framework.",
    parameterSchema: buildTaskDelegationToolParameterSchema(DELEGATE_TASKS_TOOL_NAME),
    parseInput: parseDelegateTasksInput,
    execute: (service, context, input) =>
      service.delegateTasks(context, input as DelegateTasksInput),
  },
  {
    name: ACCEPT_TASK_TOOL_NAME,
    description:
      "Accept an active delegated task as its original delegator. Use task_id from delegate_tasks/activation messages after the task-agent's send_message_to report is satisfactory. Acceptance is the only terminal task action and schedules task-agent settlement after safe idle gates.",
    parameterSchema: buildTaskDelegationToolParameterSchema(ACCEPT_TASK_TOOL_NAME),
    parseInput: parseAcceptTaskInput,
    execute: (service, context, input) =>
      service.acceptTask(context, input as AcceptTaskInput),
  },
];

export const getTaskDelegationToolManifestEntry = (
  toolName: TaskDelegationToolName,
): TaskDelegationToolManifestEntry => {
  const entry = TASK_DELEGATION_TOOL_MANIFEST.find(
    (candidate) => candidate.name === toolName,
  );
  if (!entry) {
    throw new Error(`Unknown task delegation tool '${toolName}'.`);
  }
  return entry;
};
