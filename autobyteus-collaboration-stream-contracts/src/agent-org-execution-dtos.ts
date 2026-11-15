import { agentInputStateSchema, compactionRecoveryBlockSchema } from "@autobyteus/agent-presentation-contracts";
import { z } from "zod";
import {
  agentAddressSchema,
  agentPresentationMessageSchema,
  agentPresentationPayloadSchemas,
  jsonValueSchema,
  nonEmptyStringSchema,
} from "@autobyteus/agent-presentation-contracts";
import { runTreeChangedEventDtoSchema } from "./run-tree-dtos.js";

const timestamp = nonEmptyStringSchema;
const nullableText = nonEmptyStringSchema.nullable();

export const agentOrgLaunchConfigurationDtoSchema = z.object({
  runtimeKind: z.enum(["autobyteus", "claude_agent_sdk", "codex_app_server", "antigravity_cli", "grok_build", "deepseek_harness"]),
  llmModelIdentifier: nonEmptyStringSchema,
  llmConfig: z.record(z.string(), jsonValueSchema).nullable(),
  autoExecuteTools: z.boolean(),
  workspaceRootPath: nullableText,
}).strict();

const configuredAgent = z.object({
  address: agentAddressSchema, agentDefinitionId: nonEmptyStringSchema,
  role: z.string().nullable(), description: z.string().nullable(), agentRunId: nonEmptyStringSchema,
  platformAgentRunId: nullableText, launchConfiguration: agentOrgLaunchConfigurationDtoSchema,
}).strict();

const handoff = z.object({ from: agentAddressSchema, to: agentAddressSchema, rules: z.array(nonEmptyStringSchema).min(1) }).strict();
// A run's delegated runs are its tree's rows (`run-tree-dtos.ts`, autobyteus-461 SR-084): no view carries them.

/**
 * Live: response text a chat socket coalesced over one content window. Each item is the
 * concatenated text of one agent segment, in order of first appearance. The envelope covers the
 * contiguous root sequences `[change_sequence, change_sequence_through]`, including absorbed
 * identical status repeats; nothing outside that range is regrouped.
 */
export const agentPresentationBatchEventDtoSchema = z.object({
  kind: z.literal("agent_presentation_batch"),
  items: z.array(z.object({
    member_address: agentAddressSchema, agent_run_id: nonEmptyStringSchema,
    message: z.object({ type: z.literal("SEGMENT_CONTENT"), payload: agentPresentationPayloadSchemas.SEGMENT_CONTENT }).strict(),
  }).strict()).min(1),
}).strict();
export type AgentPresentationBatchEventDto = Readonly<z.infer<typeof agentPresentationBatchEventDtoSchema>>;

const configuredTeam = z.object({
  address: agentAddressSchema, teamDefinitionId: nonEmptyStringSchema,
  role: z.string().nullable(), description: z.string().nullable(), teamRunId: nonEmptyStringSchema,
  coordinatorAddress: agentAddressSchema, defaultLaunchConfiguration: agentOrgLaunchConfigurationDtoSchema,
  members: z.array(configuredAgent),
}).strict().superRefine((team, context) => {
  if (!team.members.some((member) => member.address === team.coordinatorAddress)) {
    context.addIssue({
      code: "custom",
      path: ["coordinatorAddress"],
      message: `Configured Team '${team.address}' coordinator is not one of its direct Agent members.`,
    });
  }
});


export const agentOrgExecutionTreeDtoSchema = z.object({
  subjectKind: z.literal("agent_org"), createdAt: timestamp,
  archivedAt: timestamp.nullable(),
  applicationBinding: z.object({ applicationId: nonEmptyStringSchema, bindingId: nonEmptyStringSchema }).strict().nullable(),
  handoffs: z.array(handoff),
  rootOrg: z.object({
    address: z.literal("/"), orgDefinitionId: nonEmptyStringSchema, orgDefinitionName: nonEmptyStringSchema,
    orgRunId: nonEmptyStringSchema, defaultLaunchConfiguration: agentOrgLaunchConfigurationDtoSchema,
    members: z.array(z.union([configuredAgent, configuredTeam])),
  }).strict(),
}).strict();

export const agentOrgCommunicationMessageDtoSchema = z.object({
  messageId: nonEmptyStringSchema, senderAgentRunId: nonEmptyStringSchema,
  receiverAgentRunId: nonEmptyStringSchema, content: nonEmptyStringSchema,
  messageType: nonEmptyStringSchema, referenceFiles: z.array(nonEmptyStringSchema), createdAt: timestamp,
}).strict();

export const agentOrgAgentStatusDtoSchema = z.object({
  member_address: agentAddressSchema, agent_run_id: nonEmptyStringSchema,
  status: z.enum(["offline", "initializing", "idle", "running", "error"]),
  trigger: nullableText, tool_name: nullableText, error_message: nullableText, error_details: nullableText,
  recoverableBlock: compactionRecoveryBlockSchema.nullable(),
}).strict();

export const agentOrgExecutionViewDtoSchema = z.object({
  base_change_sequence: z.number().int().nonnegative(), is_active: z.boolean(),
  /** The live sequence `base_change_sequence` counts in (one per root event publisher); null for a stored view. */
  live_sequence_id: nonEmptyStringSchema.nullable(),
  /** The sequence of the root's latest message through `base_change_sequence` (0 when none); null for a stored view. */
  last_message_change_sequence: z.number().int().nonnegative().nullable(),
  execution_tree: agentOrgExecutionTreeDtoSchema,
  agent_statuses: z.array(agentOrgAgentStatusDtoSchema),
  agent_input_states: z.array(z.object({ agent_run_id: z.string().min(1), state: agentInputStateSchema }).strict()),
}).strict();

export const agentOrgExecutionEventDtoSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("agent_presentation"), member_address: agentAddressSchema, agent_run_id: nonEmptyStringSchema, message: agentPresentationMessageSchema }).strict(),
  agentPresentationBatchEventDtoSchema,
  z.object({ kind: z.literal("communication"), message: agentOrgCommunicationMessageDtoSchema }).strict(),
  runTreeChangedEventDtoSchema,
]);

export type AgentOrgExecutionTreeDto = Readonly<z.infer<typeof agentOrgExecutionTreeDtoSchema>>;
export type AgentOrgExecutionViewDto = Readonly<z.infer<typeof agentOrgExecutionViewDtoSchema>>;
export type AgentOrgExecutionEventDto = Readonly<z.infer<typeof agentOrgExecutionEventDtoSchema>>;
export type AgentOrgCommunicationMessageDto = Readonly<z.infer<typeof agentOrgCommunicationMessageDtoSchema>>;
