import { z } from "zod";
import { nonEmptyStringSchema } from "./schema-helpers.js";
import { agentTeamAddressDtoSchema } from "./team-execution-view-dtos.js";
import { teamReferenceFileDtoSchema } from "./team-reference-file-dto.js";
export const teamCommunicationMessageDtoSchema = z.object({
    message_id: nonEmptyStringSchema,
    sender_agent_run_id: nonEmptyStringSchema,
    receiver_agent_run_id: nonEmptyStringSchema,
    content: z.string(),
    message_type: nonEmptyStringSchema,
    reference_files: z.array(teamReferenceFileDtoSchema),
    created_at: nonEmptyStringSchema,
}).strict();
export const teamCommunicationMessagePayloadSchema = z.object({
    change_sequence: z.number().int().positive(),
    message: teamCommunicationMessageDtoSchema,
}).strict();
export const teamMemberInputContextFileDtoSchema = z.object({
    path: nonEmptyStringSchema,
    type: nonEmptyStringSchema.nullable(),
}).strict();
export const teamMemberInputMessagePayloadSchema = z.object({
    change_sequence: z.number().int().positive(),
    recipient_agent_run_id: nonEmptyStringSchema,
    message_id: nonEmptyStringSchema,
    dedupe_key: nonEmptyStringSchema,
    content: z.string(),
    input_origin: z.enum(["user_message", "inter_agent_delivery"]),
    received_at: nonEmptyStringSchema,
    context_file_paths: z.array(teamMemberInputContextFileDtoSchema),
    sender_agent_run_id: nonEmptyStringSchema.nullable(),
    parent_communication_message_id: nonEmptyStringSchema.nullable(),
}).strict();
export const teamExternalUserMessagePayloadSchema = z.object({
    agent_run_id: nonEmptyStringSchema,
    member_address: agentTeamAddressDtoSchema,
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