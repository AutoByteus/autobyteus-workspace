import { z } from "zod";
import type { DelegateTaskInput } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";

const nonEmptyString = (fieldName: string) =>
  z.string().trim().min(1, `${fieldName} is required`);

const DelegateTaskInputSchema = z.object({
  recipient_address: z.string(),
  description: nonEmptyString("description"),
  reference_files: z.array(nonEmptyString("reference_files item")).default([]),
}).strict();

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
