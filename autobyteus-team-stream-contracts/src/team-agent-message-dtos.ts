import { z } from "zod";
import {
  agentPresentationErrorPayloadSchemas,
  agentPresentationPayloadSchemas,
  nonEmptyStringSchema,
} from "@autobyteus/agent-presentation-contracts";
import { tokenUsageRunSummaryDtoSchema } from "./token-usage-run-summary-dto.js";

export const teamAgentSegmentTypeSchema = z.enum([
  "text", "tool_call", "write_file", "edit_file", "run_bash", "reasoning", "media",
]);

const execution = {
  change_sequence: z.number().int().positive(),
  agent_run_id: nonEmptyStringSchema,
};
const withExecution = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) => schema.extend(execution).strict();

/** Team adds only its unchanged sequence/run correlation to root-neutral bodies. */
export const teamAgentPayloadSchemas = {
  SYSTEM_INSTRUCTIONS_SUPPLIED: withExecution(agentPresentationPayloadSchemas.SYSTEM_INSTRUCTIONS_SUPPLIED),
  TURN_STARTED: withExecution(agentPresentationPayloadSchemas.TURN_STARTED),
  TURN_COMPLETED: withExecution(agentPresentationPayloadSchemas.TURN_COMPLETED),
  TURN_INTERRUPTED: withExecution(agentPresentationPayloadSchemas.TURN_INTERRUPTED),
  SEGMENT_START: withExecution(agentPresentationPayloadSchemas.SEGMENT_START),
  SEGMENT_CONTENT: withExecution(agentPresentationPayloadSchemas.SEGMENT_CONTENT),
  SEGMENT_END: withExecution(agentPresentationPayloadSchemas.SEGMENT_END),
  AGENT_STATUS: withExecution(agentPresentationPayloadSchemas.AGENT_STATUS),
  COMPACTION_STATUS: withExecution(agentPresentationPayloadSchemas.COMPACTION_STATUS),
  TOKEN_USAGE_UPDATED: withExecution(agentPresentationPayloadSchemas.TOKEN_USAGE_UPDATED.extend({
    run_summary_after_event: tokenUsageRunSummaryDtoSchema.nullable(),
  }).strict()),
  ASSISTANT_COMPLETE: withExecution(agentPresentationPayloadSchemas.ASSISTANT_COMPLETE),
  TOOL_APPROVAL_REQUESTED: withExecution(agentPresentationPayloadSchemas.TOOL_APPROVAL_REQUESTED),
  TOOL_APPROVED: withExecution(agentPresentationPayloadSchemas.TOOL_APPROVED),
  TOOL_DENIED: withExecution(agentPresentationPayloadSchemas.TOOL_DENIED),
  TOOL_EXECUTION_STARTED: withExecution(agentPresentationPayloadSchemas.TOOL_EXECUTION_STARTED),
  TOOL_EXECUTION_SUCCEEDED: withExecution(agentPresentationPayloadSchemas.TOOL_EXECUTION_SUCCEEDED),
  TOOL_EXECUTION_FAILED: withExecution(agentPresentationPayloadSchemas.TOOL_EXECUTION_FAILED),
  TOOL_EXECUTION_INTERRUPTED: withExecution(agentPresentationPayloadSchemas.TOOL_EXECUTION_INTERRUPTED),
  TOOL_LOG: withExecution(agentPresentationPayloadSchemas.TOOL_LOG),
  TODO_LIST_UPDATE: withExecution(agentPresentationPayloadSchemas.TODO_LIST_UPDATE),
  SYSTEM_TASK_NOTIFICATION: withExecution(agentPresentationPayloadSchemas.SYSTEM_TASK_NOTIFICATION),
  ARTIFACT_PERSISTED: withExecution(agentPresentationPayloadSchemas.ARTIFACT_PERSISTED),
  FILE_CHANGE: withExecution(agentPresentationPayloadSchemas.FILE_CHANGE),
} as const;

const errorExecution = {
  change_sequence: z.number().int().positive().nullable(),
  agent_run_id: nonEmptyStringSchema.nullable(),
};
export const teamAgentErrorPayloadSchema = z.union(
  [
    agentPresentationErrorPayloadSchemas.unscoped.extend(errorExecution).strict(),
    agentPresentationErrorPayloadSchemas.turn.extend(errorExecution).strict(),
    agentPresentationErrorPayloadSchemas.runtime.extend(errorExecution).strict(),
  ],
);

export const teamInterruptCommandAckPayloadSchema = z.union([
  z.object({ command_type: z.literal("INTERRUPT_GENERATION"), command_id: nonEmptyStringSchema, state: z.literal("accepted"), agent_run_id: nonEmptyStringSchema }).strict(),
  z.object({ command_type: z.literal("INTERRUPT_GENERATION"), command_id: nonEmptyStringSchema, state: z.enum(["rejected", "failed"]), code: nonEmptyStringSchema, message: z.string(), agent_run_id: nonEmptyStringSchema }).strict(),
]);

export type TeamAgentMessageType = keyof typeof teamAgentPayloadSchemas;
export type TeamAgentPayload<T extends TeamAgentMessageType> = Readonly<z.infer<(typeof teamAgentPayloadSchemas)[T]>>;
