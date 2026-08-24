import { z } from "zod";
import { teamAgentErrorPayloadSchema, teamAgentPayloadSchemas, teamInterruptCommandAckPayloadSchema, } from "./team-agent-message-dtos.js";
import { teamCommunicationMessagePayloadSchema, teamExternalUserMessagePayloadSchema, teamMemberInputMessagePayloadSchema, } from "./team-collaboration-message-dtos.js";
import { teamConnectedPayloadSchema, teamRunLifecyclePayloadSchema } from "./team-control-message-dtos.js";
import { teamTaskDelegationPayloadSchema } from "./team-task-message-dtos.js";
import { readonlyParsed } from "./schema-helpers.js";
import { teamAgentStatusDtoSchema, teamRunExecutionTreeDtoSchema, } from "./team-execution-view-dtos.js";
import { taskDelegationRecordDtoSchema } from "./team-task-message-dtos.js";
import { teamCommunicationMessageDtoSchema } from "./team-collaboration-message-dtos.js";
const message = (type, payload) => z.object({ type: z.literal(type), payload }).strict();
export const teamExecutionViewSnapshotPayloadSchema = z.object({
    root_team_run_id: z.string().trim().min(1),
    base_change_sequence: z.number().int().nonnegative(),
    execution_tree: teamRunExecutionTreeDtoSchema,
    tasks: z.array(taskDelegationRecordDtoSchema),
    messages: z.array(teamCommunicationMessageDtoSchema),
    agent_statuses: z.array(teamAgentStatusDtoSchema),
}).strict();
export const teamStreamServerMessageSchema = z.discriminatedUnion("type", [
    message("SYSTEM_INSTRUCTIONS_SUPPLIED", teamAgentPayloadSchemas.SYSTEM_INSTRUCTIONS_SUPPLIED),
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
    z.object({ type: z.literal("TEAM_EXECUTION_VIEW_SNAPSHOT"), payload: teamExecutionViewSnapshotPayloadSchema }).strict(),
    z.object({ type: z.literal("AGENT_COMMAND_ACK"), payload: teamInterruptCommandAckPayloadSchema }).strict(),
    z.object({ type: z.literal("TASK_DELEGATION_EVENT"), payload: teamTaskDelegationPayloadSchema }).strict(),
    z.object({ type: z.literal("TEAM_COMMUNICATION_MESSAGE"), payload: teamCommunicationMessagePayloadSchema }).strict(),
    z.object({ type: z.literal("MEMBER_INPUT_MESSAGE"), payload: teamMemberInputMessagePayloadSchema }).strict(),
    z.object({ type: z.literal("EXTERNAL_USER_MESSAGE"), payload: teamExternalUserMessagePayloadSchema }).strict(),
    z.object({ type: z.literal("ERROR"), payload: teamAgentErrorPayloadSchema }).strict(),
]);
export const parseTeamStreamServerMessage = (value) => {
    const decoded = typeof value === "string" ? JSON.parse(value) : value;
    return readonlyParsed(teamStreamServerMessageSchema.parse(decoded));
};
export const serializeTeamStreamServerMessage = (message) => JSON.stringify(teamStreamServerMessageSchema.parse(message));
//# sourceMappingURL=team-stream-server-message.js.map