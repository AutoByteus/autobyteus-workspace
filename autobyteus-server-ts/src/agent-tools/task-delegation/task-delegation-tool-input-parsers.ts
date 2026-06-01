import { z } from "zod";
import {
  type DelegateTasksInput,
  type UpdateTaskStatusInput,
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

const UpdateTaskExecutionStatusInputSchema = z.object({
  status: z.enum(["in_progress", "completed", "failed"]),
  message: z.string().trim().optional().nullable(),
  reference_files: z.array(nonEmptyString("reference_files item")).default([]),
}).strict();

const UpdateTaskAcceptanceStatusInputSchema = z.object({
  status: z.literal("accepted"),
  task_id: nonEmptyString("task_id"),
  message: z.string().trim().optional().nullable(),
}).strict();

const UpdateTaskStatusInputSchema = z.discriminatedUnion("status", [
  UpdateTaskExecutionStatusInputSchema,
  UpdateTaskAcceptanceStatusInputSchema,
]);

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
