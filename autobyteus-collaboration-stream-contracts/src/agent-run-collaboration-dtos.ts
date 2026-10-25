import { z } from "zod";
import {
  agentAddressSchema,
  agentInputStateSchema,
  agentPresentationMessageSchema,
  nonEmptyStringSchema,
  remoteTaskExecutionDtoSchema,
  remoteTaskExecutionSummaryDtoSchema,
} from "@autobyteus/agent-presentation-contracts";
import {
  agentOrgAgentStatusDtoSchema,
  agentPresentationBatchEventDtoSchema,
  agentOrgCommunicationMessageDtoSchema,
  closedTaskExecutionsDtoSchema,
  taskExecutionDtoSchema,
  taskExecutionsClosedEventDtoSchema,
  delegatedLaunchSelectionsChangedEventDtoSchema,
  taskExecutionsReopenedEventDtoSchema,
} from "./agent-org-execution-dtos.js";

const timestamp = nonEmptyStringSchema;

/**
 * The collaboration package of one standalone Agent run (root kind `agent`): its host
 * Agent and its delegated copies (task executions).
 */
export const agentRunCollaborationTreeDtoSchema = z.object({
  subjectKind: z.literal("agent"),
  createdAt: timestamp,
  host: z.object({
    address: agentAddressSchema,
    agentRunId: nonEmptyStringSchema,
    agentDefinitionId: nonEmptyStringSchema,
  }).strict(),
  taskExecutions: z.array(taskExecutionDtoSchema),
}).strict();

export const agentRunCollaborationCommunicationMessagesDtoSchema = z.object({
  schemaVersion: z.literal(1),
  subjectKind: z.literal("agent"),
  hostRunId: nonEmptyStringSchema,
  messages: z.array(agentOrgCommunicationMessageDtoSchema),
}).strict();

/** Statuses cover the Agent root's children; the host reports on its own Agent stream. */
export const agentRunCollaborationViewDtoSchema = z.object({
  base_change_sequence: z.number().int().nonnegative(),
  is_active: z.boolean(),
  execution_tree: agentRunCollaborationTreeDtoSchema,
  closed_task_executions: closedTaskExecutionsDtoSchema,
  communication_messages: agentRunCollaborationCommunicationMessagesDtoSchema,
  agent_statuses: z.array(agentOrgAgentStatusDtoSchema),
  agent_input_states: z.array(z.object({ agent_run_id: nonEmptyStringSchema, state: agentInputStateSchema }).strict()),
  /** The runs this root delegated to other nodes (autobyteus-278); their summaries arrive as events. */
  remote_task_executions: z.array(remoteTaskExecutionDtoSchema),
}).strict();

/** A run this root delegated to another node was recorded (autobyteus-278). */
export const remoteTaskExecutionStartedEventDtoSchema = z.object({
  kind: z.literal("remote_task_execution_started"), execution: remoteTaskExecutionDtoSchema,
}).strict();
/** What a remote run's node answered about it (autobyteus-278): title, statuses, or that it did not answer. */
export const remoteTaskExecutionSummaryEventDtoSchema = remoteTaskExecutionSummaryDtoSchema.extend({
  kind: z.literal("remote_task_execution_summary"),
}).strict();

export const agentRunCollaborationEventDtoSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("agent_presentation"), member_address: agentAddressSchema, agent_run_id: nonEmptyStringSchema, message: agentPresentationMessageSchema }).strict(),
  agentPresentationBatchEventDtoSchema,
  z.object({
    kind: z.literal("task_execution_started"),
    host_kind: z.enum(["root", "team"]), host_run_id: nonEmptyStringSchema, execution: taskExecutionDtoSchema,
  }).strict(),
  z.object({ kind: z.literal("communication"), message: agentOrgCommunicationMessageDtoSchema }).strict(),
  taskExecutionsClosedEventDtoSchema,
  taskExecutionsReopenedEventDtoSchema,
  delegatedLaunchSelectionsChangedEventDtoSchema,
  remoteTaskExecutionStartedEventDtoSchema,
  remoteTaskExecutionSummaryEventDtoSchema,
]);

export type AgentRunCollaborationTreeDto = Readonly<z.infer<typeof agentRunCollaborationTreeDtoSchema>>;
export type AgentRunCollaborationViewDto = Readonly<z.infer<typeof agentRunCollaborationViewDtoSchema>>;
export type AgentRunCollaborationEventDto = Readonly<z.infer<typeof agentRunCollaborationEventDtoSchema>>;
