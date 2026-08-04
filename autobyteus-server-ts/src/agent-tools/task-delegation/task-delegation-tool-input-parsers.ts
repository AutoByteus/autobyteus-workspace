import { z } from "zod";
import {
  type DelegateTaskInput,
  type ReviewTaskResultInput,
  type SubmitTaskResultInput,
} from "../../agent-team-execution/task-delegation/task-delegation-record.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";

const nonEmptyString = (fieldName: string) =>
  z.string().trim().min(1, `${fieldName} is required`);

const DelegateTaskInputSchema = z.object({
  recipient_address: z.string(),
  description: nonEmptyString("description"),
  reference_files: z.array(nonEmptyString("reference_files item")).default([]),
}).strict();

const SubmitTaskResultInputSchema = z.object({
  message: nonEmptyString("message"),
  reference_files: z.array(nonEmptyString("reference_files item")).default([]),
}).strict();

const ReviewTaskResultInputSchema = z.object({
  task_id: nonEmptyString("task_id"),
  decision: z.enum(["accept", "request_revision"]),
  comment: z.string().trim().optional().nullable(),
  reference_files: z.array(nonEmptyString("reference_files item")).default([]),
}).strict().superRefine((value, context) => {
  if (value.decision === "request_revision" && !value.comment?.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "comment is required for request_revision",
      path: ["comment"],
    });
  }
});

const parseZodIssues = (error: z.ZodError): string =>
  error.issues.map((issue) => issue.message).join("; ");

export const parseDelegateTaskInput = (
  rawArguments: Record<string, unknown>,
): DelegateTaskInput => {
  const result = DelegateTaskInputSchema.safeParse(rawArguments);
  if (!result.success) {
    if (typeof rawArguments.recipient_address !== "string") {
      throw new CollaborationContractError(
        "COLLABORATION_ADDRESS_INVALID",
        "delegate_task recipient_address must be a logical address string.",
      );
    }
    throw new Error(`Invalid delegate_task input: ${parseZodIssues(result.error)}`);
  }
  return result.data;
};

export const parseSubmitTaskResultInput = (
  rawArguments: Record<string, unknown>,
): SubmitTaskResultInput => {
  const result = SubmitTaskResultInputSchema.safeParse(rawArguments);
  if (!result.success) throw new Error(`Invalid submit_task_result input: ${parseZodIssues(result.error)}`);
  return result.data;
};

export const parseReviewTaskResultInput = (
  rawArguments: Record<string, unknown>,
): ReviewTaskResultInput => {
  const result = ReviewTaskResultInputSchema.safeParse(rawArguments);
  if (!result.success) throw new Error(`Invalid review_task_result input: ${parseZodIssues(result.error)}`);
  return result.data;
};
