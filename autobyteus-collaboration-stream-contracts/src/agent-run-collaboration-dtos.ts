import { z } from "zod";
import {
  agentAddressSchema,
  agentPresentationMessageSchema,
  nonEmptyStringSchema,
} from "@autobyteus/agent-presentation-contracts";
import {
  agentPresentationBatchEventDtoSchema,
  agentOrgCommunicationMessageDtoSchema,
} from "./agent-org-execution-dtos.js";
import { runTreeChangedEventDtoSchema } from "./run-tree-dtos.js";

const timestamp = nonEmptyStringSchema;

/**
 * The collaboration package of one standalone Agent run (root kind `agent`): its host Agent. The runs it delegated are
 * its tree's rows (`RUN_TREE_SNAPSHOT`, autobyteus-461 SR-084).
 */
export const agentRunCollaborationTreeDtoSchema = z.object({
  subjectKind: z.literal("agent"),
  createdAt: timestamp,
  host: z.object({
    address: agentAddressSchema,
    agentRunId: nonEmptyStringSchema,
    agentDefinitionId: nonEmptyStringSchema,
  }).strict(),
}).strict();

/** The host's view; the host reports on its own Agent stream, its delegated runs on `/ws/run-status` (SR-083). */
export const agentRunCollaborationViewDtoSchema = z.object({
  base_change_sequence: z.number().int().nonnegative(),
  /** The live sequence `base_change_sequence` counts in (one per root event publisher); null for a stored view. */
  live_sequence_id: nonEmptyStringSchema.nullable(),
  /** The sequence of the root's latest message through `base_change_sequence` (0 when none); null for a stored view. */
  last_message_change_sequence: z.number().int().nonnegative().nullable(),
  is_active: z.boolean(),
  execution_tree: agentRunCollaborationTreeDtoSchema,
}).strict();

export const agentRunCollaborationEventDtoSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("agent_presentation"), member_address: agentAddressSchema, agent_run_id: nonEmptyStringSchema, message: agentPresentationMessageSchema }).strict(),
  agentPresentationBatchEventDtoSchema,
  z.object({ kind: z.literal("communication"), message: agentOrgCommunicationMessageDtoSchema }).strict(),
  runTreeChangedEventDtoSchema,
]);

export type AgentRunCollaborationTreeDto = Readonly<z.infer<typeof agentRunCollaborationTreeDtoSchema>>;
export type AgentRunCollaborationViewDto = Readonly<z.infer<typeof agentRunCollaborationViewDtoSchema>>;
export type AgentRunCollaborationEventDto = Readonly<z.infer<typeof agentRunCollaborationEventDtoSchema>>;
