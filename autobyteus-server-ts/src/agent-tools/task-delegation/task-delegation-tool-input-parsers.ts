import { z } from "zod";
import {
  TASK_DELEGATION_MODEL_TOOL_STATUSES,
  type DelegateTasksInput,
  type UpdateTaskStatusInput,
} from "../../agent-team-execution/task-delegation/task-delegation-record.js";

const nonEmptyString = (fieldName: string) =>
  z.string().trim().min(1, `${fieldName} is required`);

const TaskInputSchema = z.object({
  task_name: nonEmptyString("task_name"),
  assignee_name: nonEmptyString("assignee_name"),
  description: nonEmptyString("description"),
  dependencies: z.array(nonEmptyString("dependency")).default([]),
  completion_criteria: z.string().trim().optional().nullable(),
  expected_deliverables: z.array(nonEmptyString("expected_deliverables item")).default([]),
});

const DelegateTasksInputSchema = z.object({
  tasks: z.array(TaskInputSchema).min(1, "delegate_tasks requires at least one task"),
});

const DeliverableInputSchema = z.object({
  file_path: nonEmptyString("deliverables.file_path"),
  summary: nonEmptyString("deliverables.summary"),
});

const UpdateTaskStatusInputSchema = z.object({
  task_id: nonEmptyString("task_id"),
  status: z.enum(TASK_DELEGATION_MODEL_TOOL_STATUSES),
  summary: z.string().trim().optional().nullable(),
  deliverables: z.array(DeliverableInputSchema).default([]),
});

const parseZodIssues = (error: z.ZodError): string =>
  error.issues.map((issue) => issue.message).join("; ");

export const parseDelegateTasksInput = (
  rawArguments: Record<string, unknown>,
): DelegateTasksInput => {
  const result = DelegateTasksInputSchema.safeParse(rawArguments);
  if (!result.success) {
    throw new Error(`Invalid delegate_tasks input: ${parseZodIssues(result.error)}`);
  }
  return result.data;
};

export const parseUpdateTaskStatusInput = (
  rawArguments: Record<string, unknown>,
): UpdateTaskStatusInput => {
  const result = UpdateTaskStatusInputSchema.safeParse(rawArguments);
  if (!result.success) {
    throw new Error(`Invalid update_task_status input: ${parseZodIssues(result.error)}`);
  }
  return result.data;
};
