import { z } from "zod";
import {
  teamAgentErrorPayloadSchema,
  teamAgentPayloadSchemas,
  teamInterruptCommandAckPayloadSchema,
  type TeamAgentMessageType,
} from "./team-agent-message-dtos.js";
import {
  teamCommunicationMessagePayloadSchema,
  teamExternalUserMessagePayloadSchema,
  teamMemberInputMessagePayloadSchema,
} from "./team-collaboration-message-dtos.js";
import { teamConnectedPayloadSchema, teamRunLifecyclePayloadSchema } from "./team-control-message-dtos.js";
import { teamTaskDelegationPayloadSchema } from "./team-task-message-dtos.js";
import { readonlyParsed } from "./schema-helpers.js";

const message = <T extends string, P extends z.ZodTypeAny>(type: T, payload: P) =>
  z.object({ type: z.literal(type), payload }).strict();

export const teamStreamServerMessageSchema = z.discriminatedUnion("type", [
  message("TURN_STARTED", teamAgentPayloadSchemas.TURN_STARTED),
  message("TURN_COMPLETED", teamAgentPayloadSchemas.TURN_COMPLETED),
  message("TURN_INTERRUPTED", teamAgentPayloadSchemas.TURN_INTERRUPTED),
  message("SEGMENT_START", teamAgentPayloadSchemas.SEGMENT_START),
  message("SEGMENT_CONTENT", teamAgentPayloadSchemas.SEGMENT_CONTENT),
  message("SEGMENT_END", teamAgentPayloadSchemas.SEGMENT_END),
  message("AGENT_STATUS", teamAgentPayloadSchemas.AGENT_STATUS),
  message("COMPACTION_STATUS", teamAgentPayloadSchemas.COMPACTION_STATUS),
  message("TOKEN_USAGE_UPDATED", teamAgentPayloadSchemas.TOKEN_USAGE_UPDATED),
  message("ASSISTANT_COMPLETE", teamAgentPayloadSchemas.ASSISTANT_COMPLETE),
  message("TOOL_APPROVAL_REQUESTED", teamAgentPayloadSchemas.TOOL_APPROVAL_REQUESTED),
  message("TOOL_APPROVED", teamAgentPayloadSchemas.TOOL_APPROVED),
  message("TOOL_DENIED", teamAgentPayloadSchemas.TOOL_DENIED),
  message("TOOL_EXECUTION_STARTED", teamAgentPayloadSchemas.TOOL_EXECUTION_STARTED),
  message("TOOL_EXECUTION_SUCCEEDED", teamAgentPayloadSchemas.TOOL_EXECUTION_SUCCEEDED),
  message("TOOL_EXECUTION_FAILED", teamAgentPayloadSchemas.TOOL_EXECUTION_FAILED),
  message("TOOL_EXECUTION_INTERRUPTED", teamAgentPayloadSchemas.TOOL_EXECUTION_INTERRUPTED),
  message("TOOL_LOG", teamAgentPayloadSchemas.TOOL_LOG),
  message("TODO_LIST_UPDATE", teamAgentPayloadSchemas.TODO_LIST_UPDATE),
  message("SYSTEM_TASK_NOTIFICATION", teamAgentPayloadSchemas.SYSTEM_TASK_NOTIFICATION),
  message("ARTIFACT_PERSISTED", teamAgentPayloadSchemas.ARTIFACT_PERSISTED),
  message("FILE_CHANGE", teamAgentPayloadSchemas.FILE_CHANGE),
  z.object({ type: z.literal("CONNECTED"), payload: teamConnectedPayloadSchema }).strict(),
  z.object({ type: z.literal("TEAM_RUN_LIFECYCLE"), payload: teamRunLifecyclePayloadSchema }).strict(),
  z.object({ type: z.literal("AGENT_COMMAND_ACK"), payload: teamInterruptCommandAckPayloadSchema }).strict(),
  z.object({ type: z.literal("TASK_DELEGATION_EVENT"), payload: teamTaskDelegationPayloadSchema }).strict(),
  z.object({ type: z.literal("TEAM_COMMUNICATION_MESSAGE"), payload: teamCommunicationMessagePayloadSchema }).strict(),
  z.object({ type: z.literal("MEMBER_INPUT_MESSAGE"), payload: teamMemberInputMessagePayloadSchema }).strict(),
  z.object({ type: z.literal("EXTERNAL_USER_MESSAGE"), payload: teamExternalUserMessagePayloadSchema }).strict(),
  z.object({ type: z.literal("ERROR"), payload: teamAgentErrorPayloadSchema }).strict(),
]);

type TeamAgentServerMessage = {
  [K in TeamAgentMessageType]: Readonly<{
    type: K;
    payload: Readonly<z.infer<(typeof teamAgentPayloadSchemas)[K]>>;
  }>
}[TeamAgentMessageType];

export type TeamStreamServerMessage =
  | TeamAgentServerMessage
  | Readonly<{ type: "CONNECTED"; payload: z.infer<typeof teamConnectedPayloadSchema> }>
  | Readonly<{ type: "TEAM_RUN_LIFECYCLE"; payload: z.infer<typeof teamRunLifecyclePayloadSchema> }>
  | Readonly<{ type: "AGENT_COMMAND_ACK"; payload: z.infer<typeof teamInterruptCommandAckPayloadSchema> }>
  | Readonly<{ type: "TASK_DELEGATION_EVENT"; payload: z.infer<typeof teamTaskDelegationPayloadSchema> }>
  | Readonly<{ type: "TEAM_COMMUNICATION_MESSAGE"; payload: z.infer<typeof teamCommunicationMessagePayloadSchema> }>
  | Readonly<{ type: "MEMBER_INPUT_MESSAGE"; payload: z.infer<typeof teamMemberInputMessagePayloadSchema> }>
  | Readonly<{ type: "EXTERNAL_USER_MESSAGE"; payload: z.infer<typeof teamExternalUserMessagePayloadSchema> }>
  | Readonly<{ type: "ERROR"; payload: z.infer<typeof teamAgentErrorPayloadSchema> }>;

export const parseTeamStreamServerMessage = (value: string | unknown): TeamStreamServerMessage => {
  const decoded = typeof value === "string" ? JSON.parse(value) as unknown : value;
  return readonlyParsed(teamStreamServerMessageSchema.parse(decoded));
};

export const serializeTeamStreamServerMessage = (message: TeamStreamServerMessage): string =>
  JSON.stringify(teamStreamServerMessageSchema.parse(message));
