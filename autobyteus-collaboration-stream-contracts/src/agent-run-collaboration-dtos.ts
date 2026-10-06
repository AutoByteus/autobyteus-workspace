import { z } from "zod";
import {
  agentAddressSchema,
  agentInputStateSchema,
  agentPresentationMessageSchema,
  nonEmptyStringSchema,
} from "@autobyteus/agent-presentation-contracts";
import {
  agentOrgAgentStatusDtoSchema,
  agentOrgCommunicationMessageDtoSchema,
  closedTaskExecutionsDtoSchema,
  collaboratorEntryDtoSchema,
  taskExecutionDtoSchema,
  taskExecutionsClosedEventDtoSchema,
} from "./agent-org-execution-dtos.js";

const timestamp = nonEmptyStringSchema;

/**
 * The collaboration package of one standalone Agent run (root kind `agent`): its host
 * Agent, the collaborators brought in with `@`, and their task executions.
 */
export const agentRunCollaborationTreeDtoSchema = z.object({
  subjectKind: z.literal("agent"),
  createdAt: timestamp,
  host: z.object({
    address: agentAddressSchema,
    agentRunId: nonEmptyStringSchema,
    agentDefinitionId: nonEmptyStringSchema,
  }).strict(),
  collaborators: z.array(collaboratorEntryDtoSchema),
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
}).strict();

export const agentRunCollaborationEventDtoSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("agent_presentation"), member_address: agentAddressSchema, agent_run_id: nonEmptyStringSchema, message: agentPresentationMessageSchema }).strict(),
  z.object({
    kind: z.literal("task_execution_started"),
    host_kind: z.enum(["root", "team"]), host_run_id: nonEmptyStringSchema, execution: taskExecutionDtoSchema,
  }).strict(),
  z.object({ kind: z.literal("communication"), message: agentOrgCommunicationMessageDtoSchema }).strict(),
  z.object({ kind: z.literal("collaborator_added"), collaborator: collaboratorEntryDtoSchema }).strict(),
  taskExecutionsClosedEventDtoSchema,
]);

export type AgentRunCollaborationTreeDto = Readonly<z.infer<typeof agentRunCollaborationTreeDtoSchema>>;
export type AgentRunCollaborationViewDto = Readonly<z.infer<typeof agentRunCollaborationViewDtoSchema>>;
export type AgentRunCollaborationEventDto = Readonly<z.infer<typeof agentRunCollaborationEventDtoSchema>>;
