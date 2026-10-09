import type { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import type { ZodType } from "zod";
import { DelegateTaskResultSchema, type DelegateTaskResult } from "../../agent-team-execution/task-delegation/task-delegation-result-contract.js";
import { DELEGATE_TASK_LLM_DESCRIPTION } from "../../agent-collaboration/domain/agent-team-collaboration-llm-contract.js";
import {
  DELEGATE_TASK_TOOL_NAME,
  type TaskDelegationToolContext,
  type TaskDelegationToolName,
} from "./task-delegation-tool-contract.js";
import { parseDelegateTaskInput, type DelegateTaskToolInput } from "./task-delegation-tool-input-parsers.js";
import { buildTaskDelegationToolParameterSchema } from "./task-delegation-tool-parameter-schemas.js";
import type { TaskDelegationToolService } from "./task-delegation-tool-service.js";

type TaskDelegationToolParsedInput = DelegateTaskToolInput;
type TaskDelegationToolExecutionResult = DelegateTaskResult;

export type TaskDelegationToolManifestEntry = {
  name: TaskDelegationToolName;
  description: string;
  parameterSchema: ParameterSchema;
  resultSchema?: ZodType;
  parseInput: (rawArguments: Record<string, unknown>) => TaskDelegationToolParsedInput;
  execute: (
    service: TaskDelegationToolService,
    context: TaskDelegationToolContext,
    input: TaskDelegationToolParsedInput,
  ) => Promise<TaskDelegationToolExecutionResult>;
};

export const TASK_DELEGATION_TOOL_MANIFEST: TaskDelegationToolManifestEntry[] = [
  {
    name: DELEGATE_TASK_TOOL_NAME,
    description: DELEGATE_TASK_LLM_DESCRIPTION,
    parameterSchema: buildTaskDelegationToolParameterSchema(DELEGATE_TASK_TOOL_NAME),
    resultSchema: DelegateTaskResultSchema,
    parseInput: parseDelegateTaskInput,
    execute: async (service, context, input) => DelegateTaskResultSchema.parse(
      await service.delegateTask(context, input),
    ),
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
