import { z } from "zod";
import { teamInterruptClientPayloadSchema, teamSendMessageClientPayloadSchema, teamToolApprovalClientPayloadSchema, } from "./team-control-message-dtos.js";
import { readonlyParsed } from "./schema-helpers.js";
export const teamStreamClientMessageSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("SEND_MESSAGE"), payload: teamSendMessageClientPayloadSchema }).strict(),
    z.object({ type: z.literal("INTERRUPT_GENERATION"), payload: teamInterruptClientPayloadSchema }).strict(),
    z.object({ type: z.literal("APPROVE_TOOL"), payload: teamToolApprovalClientPayloadSchema }).strict(),
    z.object({ type: z.literal("DENY_TOOL"), payload: teamToolApprovalClientPayloadSchema }).strict(),
]);
export const parseTeamStreamClientMessage = (value) => {
    const decoded = typeof value === "string" ? JSON.parse(value) : value;
    return readonlyParsed(teamStreamClientMessageSchema.parse(decoded));
};
export const serializeTeamStreamClientMessage = (message) => JSON.stringify(teamStreamClientMessageSchema.parse(message));
//# sourceMappingURL=team-stream-client-message.js.map