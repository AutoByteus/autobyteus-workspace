import { z } from "zod";
import { nonEmptyStringSchema } from "./schema-helpers.js";
import { teamExecutionAddressDtoSchema } from "./team-execution-address-dto.js";

export const teamConnectedPayloadSchema = z.object({
  session_id: nonEmptyStringSchema,
}).strict();

export const teamRunLifecyclePayloadSchema = z.object({
  is_active: z.boolean(),
}).strict();

export const teamSendMessageClientPayloadSchema = z.object({
  content: z.string(),
  context_file_paths: z.array(nonEmptyStringSchema),
  image_urls: z.array(nonEmptyStringSchema),
  execution_address: teamExecutionAddressDtoSchema,
  message_id: nonEmptyStringSchema,
  dedupe_key: nonEmptyStringSchema,
}).strict();

export const teamInterruptClientPayloadSchema = z.object({
  command_id: nonEmptyStringSchema,
  execution_address: teamExecutionAddressDtoSchema,
}).strict();

export const teamToolApprovalClientPayloadSchema = z.object({
  invocation_id: nonEmptyStringSchema,
  execution_address: teamExecutionAddressDtoSchema,
  reason: z.string().nullable(),
}).strict();
