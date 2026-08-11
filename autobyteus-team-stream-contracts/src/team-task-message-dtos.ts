import { z } from "zod";
import { nonEmptyStringSchema } from "./schema-helpers.js";
import { teamExecutionAddressDtoSchema } from "./team-execution-address-dto.js";

export const taskDelegationReferenceFileDtoSchema = z.object({
  reference_id: nonEmptyStringSchema,
  path: nonEmptyStringSchema,
  type: nonEmptyStringSchema,
  created_at: nonEmptyStringSchema,
  updated_at: nonEmptyStringSchema,
}).strict();

const eventIdentity = {
  task_id: nonEmptyStringSchema,
  execution_address: teamExecutionAddressDtoSchema,
};

export const taskDelegationActivatedPayloadSchema = z.object({
  event_type: z.literal("TASK_DELEGATION_ACTIVATED"),
  ...eventIdentity,
  sender_address: teamExecutionAddressDtoSchema,
  content: z.string(),
  reference_files: z.array(taskDelegationReferenceFileDtoSchema),
  created_at: nonEmptyStringSchema,
  started_at: nonEmptyStringSchema,
}).strict();

export const taskDelegationResultSubmittedPayloadSchema = z.object({
  event_type: z.literal("TASK_DELEGATION_RESULT_SUBMITTED"),
  ...eventIdentity,
  submission_id: nonEmptyStringSchema,
  submitted_at: nonEmptyStringSchema,
}).strict();

export const taskDelegationResultReviewedPayloadSchema = z.object({
  event_type: z.literal("TASK_DELEGATION_RESULT_REVIEWED"),
  ...eventIdentity,
  review_id: nonEmptyStringSchema,
  reviewed_submission_id: nonEmptyStringSchema,
  decision: z.enum(["accept", "request_revision"]),
  reviewed_at: nonEmptyStringSchema,
}).strict();

export const teamTaskDelegationPayloadSchema = z.discriminatedUnion("event_type", [
  taskDelegationActivatedPayloadSchema,
  taskDelegationResultSubmittedPayloadSchema,
  taskDelegationResultReviewedPayloadSchema,
]);

export type TeamTaskDelegationPayload = Readonly<z.infer<typeof teamTaskDelegationPayloadSchema>>;
