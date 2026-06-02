import { z } from "zod";
import {
  type AcceptTaskInput,
  type DelegateTasksInput,
  type MarkTaskCompletedInput,
  type MarkTaskFailedInput,
} from "../../agent-team-execution/task-delegation/task-delegation-record.js";

const nonEmptyString = (fieldName: string) =>
  z.string().trim().min(1, `${fieldName} is required`);

const TaskInputSchema = z.object({
  member_name: nonEmptyString("member_name"),
  description: nonEmptyString("description"),
  reference_files: z.array(nonEmptyString("reference_files item")).default([]),
}).strict();

const DelegateTasksInputSchema = z.object({
  tasks: z.array(TaskInputSchema).min(1, "delegate_tasks requires at least one task"),
}).strict();

const TaskAgentResultInputSchema = z.object({
  message: nonEmptyString("message"),
  reference_files: z.array(nonEmptyString("reference_files item")).default([]),
}).strict();

const AcceptTaskInputSchema = z.object({
  task_id: nonEmptyString("task_id"),
  message: z.string().trim().optional().nullable(),
}).strict();

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

export const parseMarkTaskCompletedInput = (
  rawArguments: Record<string, unknown>,
): MarkTaskCompletedInput => {
  const result = TaskAgentResultInputSchema.safeParse(rawArguments);
  if (!result.success) {
    throw new Error(`Invalid mark_task_completed input: ${parseZodIssues(result.error)}`);
  }
  return result.data;
};

export const parseMarkTaskFailedInput = (
  rawArguments: Record<string, unknown>,
): MarkTaskFailedInput => {
  const result = TaskAgentResultInputSchema.safeParse(rawArguments);
  if (!result.success) {
    throw new Error(`Invalid mark_task_failed input: ${parseZodIssues(result.error)}`);
  }
  return result.data;
};

export const parseAcceptTaskInput = (
  rawArguments: Record<string, unknown>,
): AcceptTaskInput => {
  const result = AcceptTaskInputSchema.safeParse(rawArguments);
  if (!result.success) {
    throw new Error(`Invalid accept_task input: ${parseZodIssues(result.error)}`);
  }
  return result.data;
};
