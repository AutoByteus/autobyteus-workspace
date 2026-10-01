import { z } from "zod";
import { collaboratorMentionsDtoSchema } from "@autobyteus/agent-presentation-contracts";
import { nonEmptyStringSchema } from "./schema-helpers.js";
export const teamConnectedPayloadSchema = z.object({
    session_id: nonEmptyStringSchema,
    root_team_run_id: nonEmptyStringSchema,
}).strict();
export const teamRunLifecyclePayloadSchema = z.object({
    is_active: z.boolean(),
}).strict();
export const teamSendMessageClientPayloadSchema = z.object({
    content: z.string(),
    context_file_paths: z.array(nonEmptyStringSchema),
    image_urls: z.array(nonEmptyStringSchema),
    agent_run_id: nonEmptyStringSchema,
    message_id: nonEmptyStringSchema,
    dedupe_key: nonEmptyStringSchema,
    /** Shared definitions the user mentioned with `@`; the server admits them before delivery. */
    mentions: collaboratorMentionsDtoSchema.optional(),
}).strict();
export const teamInterruptClientPayloadSchema = z.object({
    command_id: nonEmptyStringSchema,
    agent_run_id: nonEmptyStringSchema,
}).strict();
export const teamToolApprovalClientPayloadSchema = z.object({
    invocation_id: nonEmptyStringSchema,
    agent_run_id: nonEmptyStringSchema,
    reason: z.string().nullable(),
}).strict();
//# sourceMappingURL=team-control-message-dtos.js.map