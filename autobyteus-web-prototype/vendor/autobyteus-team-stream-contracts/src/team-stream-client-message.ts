import { z } from "zod";
import {
  teamInterruptClientPayloadSchema,
  teamSendMessageClientPayloadSchema,
  teamToolApprovalClientPayloadSchema,
} from "./team-control-message-dtos.js";
import { readonlyParsed } from "./schema-helpers.js";

export const teamStreamClientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("SEND_MESSAGE"), payload: teamSendMessageClientPayloadSchema }).strict(),
  z.object({ type: z.literal("INTERRUPT_GENERATION"), payload: teamInterruptClientPayloadSchema }).strict(),
  z.object({ type: z.literal("APPROVE_TOOL"), payload: teamToolApprovalClientPayloadSchema }).strict(),
  z.object({ type: z.literal("DENY_TOOL"), payload: teamToolApprovalClientPayloadSchema }).strict(),
]);

export type TeamStreamClientMessage = Readonly<z.infer<typeof teamStreamClientMessageSchema>>;

export const parseTeamStreamClientMessage = (value: string | unknown): TeamStreamClientMessage => {
  const decoded = typeof value === "string" ? JSON.parse(value) as unknown : value;
  return readonlyParsed(teamStreamClientMessageSchema.parse(decoded));
};

export const serializeTeamStreamClientMessage = (message: TeamStreamClientMessage): string =>
  JSON.stringify(teamStreamClientMessageSchema.parse(message));
