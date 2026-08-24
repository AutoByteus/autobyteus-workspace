import { z } from "zod";
import { nonEmptyStringSchema } from "./schema-helpers.js";
import {
  agentTeamAddressDtoSchema,
  taskAgentExecutionDtoSchema,
  taskTeamExecutionDtoSchema,
} from "./team-execution-view-dtos.js";
import { teamReferenceFileDtoSchema } from "./team-reference-file-dto.js";

export const taskExecutionReferenceDtoSchema = z.union([
  z.object({ agent_run_id: nonEmptyStringSchema }).strict(),
  z.object({ team_run_id: nonEmptyStringSchema }).strict(),
]);

const taskSubmissionDtoSchema = z.object({
  kind: z.literal("submission"),
  submission_id: nonEmptyStringSchema,
  message: nonEmptyStringSchema,
  reference_files: z.array(teamReferenceFileDtoSchema),
  created_at: nonEmptyStringSchema,
}).strict();

const taskReviewDtoSchema = z.object({
  kind: z.literal("review"),
  review_id: nonEmptyStringSchema,
  reviewed_submission_id: nonEmptyStringSchema,
  decision: z.enum(["accept", "request_revision"]),
  comment: z.string().nullable(),
  reference_files: z.array(teamReferenceFileDtoSchema),
  created_at: nonEmptyStringSchema,
}).strict();

const taskInterruptionDtoSchema = z.object({
  kind: z.literal("interruption"),
  interruption_id: nonEmptyStringSchema,
  reason: nonEmptyStringSchema,
  created_at: nonEmptyStringSchema,
}).strict();

export const taskDelegationRecordDtoSchema = z.object({
  task_id: nonEmptyStringSchema,
  delegator_agent_run_id: nonEmptyStringSchema,
  recipient_address: agentTeamAddressDtoSchema,
  task_execution: taskExecutionReferenceDtoSchema,
  description: nonEmptyStringSchema,
  reference_files: z.array(teamReferenceFileDtoSchema),
  status: z.enum(["active", "awaiting_review", "accepted", "interrupted"]),
  updates: z.array(z.discriminatedUnion("kind", [
    taskSubmissionDtoSchema,
    taskReviewDtoSchema,
    taskInterruptionDtoSchema,
  ])),
  created_at: nonEmptyStringSchema,
}).strict();

export const teamTaskDelegationPayloadSchema = z.discriminatedUnion("event_type", [
  z.object({
    event_type: z.literal("TASK_AGENT_ACTIVATED"),
    change_sequence: z.number().int().positive(),
    parent_team_run_id: nonEmptyStringSchema,
    execution: taskAgentExecutionDtoSchema,
    task: taskDelegationRecordDtoSchema,
  }).strict(),
  z.object({
    event_type: z.literal("TASK_TEAM_ACTIVATED"),
    change_sequence: z.number().int().positive(),
    parent_team_run_id: nonEmptyStringSchema,
    execution: taskTeamExecutionDtoSchema,
    task: taskDelegationRecordDtoSchema,
  }).strict(),
  z.object({
    event_type: z.literal("TASK_EXECUTION_SETTLED"),
    change_sequence: z.number().int().positive(),
    execution: taskExecutionReferenceDtoSchema,
    task: taskDelegationRecordDtoSchema,
    settled_at: nonEmptyStringSchema,
  }).strict(),
  z.object({
    event_type: z.literal("TASK_CHANGED"),
    change_sequence: z.number().int().positive(),
    task: taskDelegationRecordDtoSchema,
  }).strict(),
]);

export type TaskExecutionReferenceDto = Readonly<z.infer<typeof taskExecutionReferenceDtoSchema>>;
export type TaskDelegationRecordDto = Readonly<z.infer<typeof taskDelegationRecordDtoSchema>>;
export type TeamTaskDelegationPayload = Readonly<z.infer<typeof teamTaskDelegationPayloadSchema>>;
