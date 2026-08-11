import { z } from "zod";
import { nonEmptyStringSchema } from "./schema-helpers.js";
import { teamExecutionAddressDtoSchema } from "./team-execution-address-dto.js";
export const teamCommunicationReferenceFileDtoSchema = z.object({
    reference_id: nonEmptyStringSchema,
    path: nonEmptyStringSchema,
    type: nonEmptyStringSchema,
    created_at: nonEmptyStringSchema,
    updated_at: nonEmptyStringSchema,
}).strict();
export const teamCommunicationMessagePayloadSchema = z.object({
    message_id: nonEmptyStringSchema,
    sender_address: teamExecutionAddressDtoSchema,
    receiver_address: teamExecutionAddressDtoSchema,
    content: z.string(),
    message_type: nonEmptyStringSchema,
    reference_files: z.array(teamCommunicationReferenceFileDtoSchema),
    created_at: nonEmptyStringSchema,
}).strict();
export const teamMemberInputContextFileDtoSchema = z.object({
    path: nonEmptyStringSchema,
    type: nonEmptyStringSchema.nullable(),
}).strict();
export const teamMemberInputMessagePayloadSchema = z.object({
    execution_address: teamExecutionAddressDtoSchema,
    message_id: nonEmptyStringSchema,
    dedupe_key: nonEmptyStringSchema,
    content: z.string(),
    input_origin: z.enum(["user_message", "inter_agent_delivery"]),
    received_at: nonEmptyStringSchema,
    context_file_paths: z.array(teamMemberInputContextFileDtoSchema),
    sender_address: teamExecutionAddressDtoSchema.nullable(),
    parent_communication_message_id: nonEmptyStringSchema.nullable(),
}).strict();
export const teamExternalUserMessagePayloadSchema = z.object({
    execution_address: teamExecutionAddressDtoSchema,
    content: z.string(),
    received_at: nonEmptyStringSchema,
    provider: nonEmptyStringSchema,
    transport: nonEmptyStringSchema,
    account_id: nonEmptyStringSchema,
    peer_id: nonEmptyStringSchema,
    thread_id: nonEmptyStringSchema.nullable(),
    external_message_id: nonEmptyStringSchema,
    context_file_paths: z.array(teamMemberInputContextFileDtoSchema),
}).strict();
//# sourceMappingURL=team-collaboration-message-dtos.js.map