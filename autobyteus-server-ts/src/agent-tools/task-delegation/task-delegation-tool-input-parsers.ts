import { z } from "zod";
import {
  type DelegateTasksInput,
  type ReviewTaskResultInput,
  type SubmitTaskResultInput,
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

const SubmitTaskResultInputSchema = z.object({
  message: nonEmptyString("message"),
  reference_files: z.array(nonEmptyString("reference_files item")).default([]),
}).strict();

const ReviewTaskResultInputSchema = z.object({
  task_id: nonEmptyString("task_id"),
  decision: z.enum(["accept", "request_revision"]),
  message: z.string().trim().optional().nullable(),
  reference_files: z.array(nonEmptyString("reference_files item")).default([]),
}).strict().superRefine((value, context) => {
  if (value.decision === "request_revision" && !value.message?.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "message is required for request_revision",
      path: ["message"],
    });
  }
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

export const parseSubmitTaskResultInput = (
  rawArguments: Record<string, unknown>,
): SubmitTaskResultInput => {
  const result = SubmitTaskResultInputSchema.safeParse(rawArguments);
  if (!result.success) {
    throw new Error(`Invalid submit_task_result input: ${parseZodIssues(result.error)}`);
  }
  return result.data;
};

export const parseReviewTaskResultInput = (
  rawArguments: Record<string, unknown>,
): ReviewTaskResultInput => {
  const result = ReviewTaskResultInputSchema.safeParse(rawArguments);
  if (!result.success) {
    throw new Error(`Invalid review_task_result input: ${parseZodIssues(result.error)}`);
  }
  return result.data;
};
