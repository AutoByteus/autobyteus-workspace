import { z } from "zod";
import type { AssignToExistingCopyInput, SpawnTaskInput } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";

/** `delegate_task` input by subject: a new copy from an address, or an existing copy by its own ID. */
export type DelegateTaskToolInput =
  | Readonly<{ subject: "new_copy"; input: SpawnTaskInput }>
  | Readonly<{ subject: "existing_copy"; input: AssignToExistingCopyInput }>;

const nonEmptyString = (fieldName: string) =>
  z.string({ error: `${fieldName} is required` }).trim().min(1, `${fieldName} is required`);

/** `node` (DEC-111): a registered peer's name; the root refuses it with a saved Task or files (REQ-110). */
const PeerNodeSchema = nonEmptyString("node").optional();

const DescribedTaskInputSchema = z.object({
  recipient_address: z.string(),
  description: nonEmptyString("description"),
  reference_files: z.array(nonEmptyString("reference_files item")).default([]),
  node: PeerNodeSchema,
}).strict();

const LinkedTaskInputSchema = z.object({ recipient_address: z.string(), task_id: nonEmptyString("task_id"), node: PeerNodeSchema }).strict();

const EXISTING_COPY_TASK_ID = "task_id (the saved Task to give)";
const ExistingTeamCopyInputSchema = z.object({
  target_team_run_id: nonEmptyString("target_team_run_id"), task_id: nonEmptyString(EXISTING_COPY_TASK_ID),
}).strict();
const ExistingAgentCopyInputSchema = z.object({
  target_agent_run_id: nonEmptyString("target_agent_run_id"), task_id: nonEmptyString(EXISTING_COPY_TASK_ID),
}).strict();

const parseZodIssues = (error: z.ZodError): string =>
  error.issues.map((issue) => issue.message).join("; ");

const parseExistingCopyInput = (rawArguments: Record<string, unknown>): DelegateTaskToolInput => {
  if (Object.hasOwn(rawArguments, "target_team_run_id") && Object.hasOwn(rawArguments, "target_agent_run_id")) {
    throw new Error("Invalid delegate_task input: supply exactly one of target_team_run_id (a task agent team) or target_agent_run_id (a task agent).");
  }
  const extra = Object.keys(rawArguments).filter(key => !["target_team_run_id", "target_agent_run_id", "task_id"].includes(key));
  if (extra.length) {
    throw new Error(`Invalid delegate_task input: with target_team_run_id or target_agent_run_id, supply only that run id and task_id (not ${extra.join(", ")}).`);
  }
  if (Object.hasOwn(rawArguments, "target_team_run_id")) {
    const result = ExistingTeamCopyInputSchema.safeParse(rawArguments);
    if (!result.success) throw new Error(`Invalid delegate_task input: ${parseZodIssues(result.error)}`);
    return { subject: "existing_copy", input: { copy: { teamRunId: result.data.target_team_run_id }, taskId: result.data.task_id } };
  }
  const result = ExistingAgentCopyInputSchema.safeParse(rawArguments);
  if (!result.success) throw new Error(`Invalid delegate_task input: ${parseZodIssues(result.error)}`);
  return { subject: "existing_copy", input: { copy: { agentRunId: result.data.target_agent_run_id }, taskId: result.data.task_id } };
};

export const parseDelegateTaskInput = (
  rawArguments: Record<string, unknown>,
): DelegateTaskToolInput => {
  if (Object.hasOwn(rawArguments, "target_team_run_id") || Object.hasOwn(rawArguments, "target_agent_run_id")) {
    return parseExistingCopyInput(rawArguments);
  }
  const result = (Object.hasOwn(rawArguments, "task_id") ? LinkedTaskInputSchema : DescribedTaskInputSchema).safeParse(rawArguments);
  if (!result.success) {
    if (typeof rawArguments.recipient_address !== "string") {
      throw new CollaborationContractError(
        "COLLABORATION_ADDRESS_INVALID",
        "delegate_task needs recipient_address (an address beginning with '/') to create a new task agent, or target_agent_run_id / target_team_run_id with task_id to give a saved Task to one of your task agents.",
      );
    }
    throw new Error(`Invalid delegate_task input: ${parseZodIssues(result.error)}`);
  }
  const { node, ...input } = result.data;
  return { subject: "new_copy", input: node === undefined ? input : { ...input, node } };
};
