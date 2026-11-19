import { z } from "zod";
import { collaboratorMentionsDtoSchema, nonEmptyStringSchema } from "@autobyteus/agent-presentation-contracts";
import { agentOrgExecutionEventDtoSchema, agentOrgExecutionViewDtoSchema } from "./agent-org-execution-dtos.js";
import {
  agentRunCollaborationEventDtoSchema,
  agentRunCollaborationViewDtoSchema,
} from "./agent-run-collaboration-dtos.js";
import { runTreeRowDtoSchema } from "./run-tree-dtos.js";

type AgentIdentityNode = Readonly<{ address: string; agentRunId: string }>;
type TeamIdentityNode = Readonly<{ address: string; teamRunId: string; members: readonly IdentityNode[] }>;
type IdentityNode = AgentIdentityNode | TeamIdentityNode;

const addCorrelationIssue = (context: z.RefinementCtx, message: string): void => {
  context.addIssue({ code: "custom", message });
};

type TaskExecutionReference = Readonly<{ agentRunId: string }> | Readonly<{ teamRunId: string }>;
/** The one key of a task execution, `agent:<agentRunId>` or `team:<teamRunId>`, used by the node and the client. */
export const taskExecutionReferenceKey = (reference: TaskExecutionReference): string =>
  "agentRunId" in reference ? `agent:${reference.agentRunId}` : `team:${reference.teamRunId}`;

const positiveSequence = z.number().int().positive();
export const AgentTeamRootExecutionViewDtoSchema = z.object({
  root_subject_kind: z.literal("agent_team"), root_run_id: nonEmptyStringSchema,
  root_team: z.record(z.string(), z.unknown()),
}).strict();

export const AgentOrgRootExecutionViewDtoSchema = z.object({
  root_subject_kind: z.literal("agent_org"), root_run_id: nonEmptyStringSchema,
  root_org: agentOrgExecutionViewDtoSchema,
}).strict();

export const AgentRootExecutionViewDtoSchema = z.object({
  root_subject_kind: z.literal("agent"), root_run_id: nonEmptyStringSchema,
  root_agent: agentRunCollaborationViewDtoSchema,
}).strict();

/** An Agent root's view is its own agent's: the runs it delegated are its tree's rows (SR-084). */
const validateAgentRootCorrelation = (value: AgentRootExecutionViewDto, context: z.RefinementCtx): void => {
  if (value.root_agent.execution_tree.agent.agentRunId !== value.root_run_id) {
    addCorrelationIssue(context, "Agent root snapshot agent correlation mismatch.");
  }
};

/** A live view names its live sequence and its latest message sequence (at most its base); a stored view neither. */
const validateLivePosition = (view: Readonly<{ base_change_sequence: number; live_sequence_id: string | null;
  last_message_change_sequence: number | null }>, context: z.RefinementCtx): void => {
  if ((view.live_sequence_id === null) !== (view.last_message_change_sequence === null)) {
    addCorrelationIssue(context, "A view names its live sequence and its latest message sequence together.");
  } else if (view.last_message_change_sequence !== null && view.last_message_change_sequence > view.base_change_sequence) {
    addCorrelationIssue(context, "A view's latest message sequence is past its base change sequence.");
  }
};

export const RootExecutionViewDtoSchema = z.discriminatedUnion("root_subject_kind", [
  AgentTeamRootExecutionViewDtoSchema, AgentOrgRootExecutionViewDtoSchema, AgentRootExecutionViewDtoSchema,
]).superRefine((value, context) => {
  if (value.root_subject_kind === "agent") validateLivePosition(value.root_agent, context);
  if (value.root_subject_kind === "agent_org") validateLivePosition(value.root_org, context);
  if (value.root_subject_kind === "agent") {
    validateAgentRootCorrelation(value, context);
    return;
  }
  if (value.root_subject_kind !== "agent_org") return;
  if (value.root_org.execution_tree.rootOrg.orgRunId !== value.root_run_id) addCorrelationIssue(context, "AgentOrg snapshot root correlation mismatch.");

  const addressesByRunId = new Map<string, string>();
  const addressesByTeamRunId = new Map<string, string>();
  const configuredAgentAddresses = new Set<string>();
  const configuredTeamAddresses = new Set<string>();
  // In an active root every tree agent reports a status (shut-down children report `offline`).
  const statusRequiredAgentRunIds = new Set<string>();
  const addConfiguredAddress = (address: string, kind: "Agent" | "Team"): void => {
    if (configuredAgentAddresses.has(address) || configuredTeamAddresses.has(address)) {
      addCorrelationIssue(context, `AgentOrg configured address '${address}' is duplicated.`);
    }
    (kind === "Agent" ? configuredAgentAddresses : configuredTeamAddresses).add(address);
  };
  const addAgent = (agent: AgentIdentityNode, active: boolean, scope: "configured"): void => {
    const addressForRun = addressesByRunId.get(agent.agentRunId);
    if (addressForRun !== undefined) addCorrelationIssue(context, `AgentOrg AgentRun identity '${agent.agentRunId}' is duplicated.`);
    addressesByRunId.set(agent.agentRunId, agent.address);
    if (scope === "configured") addConfiguredAddress(agent.address, "Agent");
    // The Org's own agents report in its view; a delegated run's agents report through their own runs (SR-083).
    if (active) statusRequiredAgentRunIds.add(agent.agentRunId);
  };
  const addTeam = (team: TeamIdentityNode): void => {
    if (addressesByTeamRunId.has(team.teamRunId)) addCorrelationIssue(context, `AgentOrg TeamRun identity '${team.teamRunId}' is duplicated.`);
    addressesByTeamRunId.set(team.teamRunId, team.address);
    addConfiguredAddress(team.address, "Team");
  };
  const memberIdentities = (members: readonly IdentityNode[], live: boolean): void => {
    for (const member of members) {
      if ("agentRunId" in member) addAgent(member, live, "configured");
      else {
        addTeam(member);
        memberIdentities(member.members, live);
      }
    }
  };
  // The Org's own parts; the runs it delegated are its tree's rows (SR-084).
  memberIdentities(value.root_org.execution_tree.rootOrg.members as readonly IdentityNode[], value.root_org.is_active);

  const inputIds = new Set<string>();
  for (const input of value.root_org.agent_input_states) {
    if (!statusRequiredAgentRunIds.has(input.agent_run_id) || inputIds.has(input.agent_run_id)) {
      addCorrelationIssue(context, 'AgentOrg input-state identity mismatch.');
    }
    inputIds.add(input.agent_run_id);
  }
  const statusRunIds = new Set<string>();
  for (const status of value.root_org.agent_statuses) {
    if (statusRunIds.has(status.agent_run_id)) addCorrelationIssue(context, `AgentOrg status for AgentRun '${status.agent_run_id}' is duplicated.`);
    statusRunIds.add(status.agent_run_id);
    if (addressesByRunId.get(status.agent_run_id) !== status.member_address || !statusRequiredAgentRunIds.has(status.agent_run_id)) {
      addCorrelationIssue(context, "AgentOrg status identity mismatch.");
    }
  }
  for (const agentRunId of statusRequiredAgentRunIds) {
    if (!statusRunIds.has(agentRunId)) addCorrelationIssue(context, `AgentOrg AgentRun '${agentRunId}' has no status record.`);
  }
});

/**
 * One root event, or a batch covering the contiguous root sequences
 * `[change_sequence, change_sequence_through]`. `change_sequence_through` is required with and only
 * allowed with the `agent_presentation_batch` event kind.
 */
export const RootExecutionEventDtoSchema = z.discriminatedUnion("root_subject_kind", [
  z.object({ root_subject_kind: z.literal("agent_team"), root_run_id: nonEmptyStringSchema, change_sequence: positiveSequence, event: z.unknown() }).strict(),
  z.object({ root_subject_kind: z.literal("agent_org"), root_run_id: nonEmptyStringSchema, change_sequence: positiveSequence, change_sequence_through: positiveSequence.optional(), event: agentOrgExecutionEventDtoSchema }).strict(),
  z.object({ root_subject_kind: z.literal("agent"), root_run_id: nonEmptyStringSchema, change_sequence: positiveSequence, event: agentRunCollaborationEventDtoSchema }).strict(),
]).superRefine((value, context) => {
  if (value.root_subject_kind !== "agent_org") return;
  const batch = value.event.kind === "agent_presentation_batch";
  if (batch !== (value.change_sequence_through !== undefined)) {
    addCorrelationIssue(context, "change_sequence_through is required with and only allowed with an agent_presentation_batch event.");
  } else if (value.change_sequence_through !== undefined && value.change_sequence_through < value.change_sequence) {
    addCorrelationIssue(context, "change_sequence_through must not be lower than change_sequence.");
  }
});

const rootSubjectKind = z.enum(["agent_team", "agent_org", "agent"]);
/** Roots that accept per-agent commands on the collaboration stream. */
const commandRootSubjectKind = z.enum(["agent_org", "agent"]);

const commandType = z.enum(["SEND_MESSAGE", "INTERRUPT_GENERATION", "APPROVE_TOOL", "DENY_TOOL"]);
const commandAck = z.object({
  root_subject_kind: commandRootSubjectKind, root_run_id: nonEmptyStringSchema,
  command_id: nonEmptyStringSchema, command_type: commandType, target_agent_run_id: nonEmptyStringSchema,
  state: z.enum(["accepted", "rejected", "failed"]), code: nonEmptyStringSchema.nullable(), message: z.string().nullable(),
  /** With `COLLABORATOR_ADD_FAILED`: the mentioned definition that could not be involved (the message is the reason). */
  collaborator_name: nonEmptyStringSchema.optional(),
}).strict();
export const CollaborationStreamServerMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("CONNECTED"), payload: z.object({ root_subject_kind: rootSubjectKind, root_run_id: nonEmptyStringSchema, session_id: nonEmptyStringSchema }).strict() }).strict(),
  z.object({ type: z.literal("ROOT_EXECUTION_VIEW_SNAPSHOT"), payload: RootExecutionViewDtoSchema }).strict(),
  z.object({ type: z.literal("ROOT_EXECUTION_EVENT"), payload: RootExecutionEventDtoSchema }).strict(),
  /** The view's tree at the snapshot's base (autobyteus-461 SR-084), sent right after it; its changes are `run_tree_changed` events. */
  z.object({ type: z.literal("RUN_TREE_SNAPSHOT"), payload: z.object({ root_subject_kind: commandRootSubjectKind, root_run_id: nonEmptyStringSchema,
    base_change_sequence: z.number().int().nonnegative(), rows: z.array(runTreeRowDtoSchema) }).strict() }).strict(),
  z.object({ type: z.literal("ROOT_LIFECYCLE"), payload: z.object({ root_subject_kind: rootSubjectKind, root_run_id: nonEmptyStringSchema, is_active: z.boolean() }).strict() }).strict(),
  z.object({ type: z.literal("AGENT_COMMAND_ACK"), payload: commandAck }).strict(),
  z.object({ type: z.literal("ERROR"), payload: z.object({ code: nonEmptyStringSchema, message: nonEmptyStringSchema }).strict() }).strict(),
]);

const commandRoot = { root_subject_kind: commandRootSubjectKind, root_run_id: nonEmptyStringSchema, target_agent_run_id: nonEmptyStringSchema, command_id: nonEmptyStringSchema };
export const CollaborationStreamClientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("SEND_MESSAGE"), payload: z.object({ ...commandRoot, content: z.string(), context_file_paths: z.array(z.string()), image_urls: z.array(z.string()), message_id: nonEmptyStringSchema, dedupe_key: nonEmptyStringSchema, mentions: collaboratorMentionsDtoSchema.optional() }).strict() }).strict(),
  z.object({ type: z.literal("INTERRUPT_GENERATION"), payload: z.object(commandRoot).strict() }).strict(),
  z.object({ type: z.literal("APPROVE_TOOL"), payload: z.object({ ...commandRoot, invocation_id: nonEmptyStringSchema, reason: z.string().nullable() }).strict() }).strict(),
  z.object({ type: z.literal("DENY_TOOL"), payload: z.object({ ...commandRoot, invocation_id: nonEmptyStringSchema, reason: z.string().nullable() }).strict() }).strict(),
]);

export type AgentTeamRootExecutionViewDto = z.infer<typeof AgentTeamRootExecutionViewDtoSchema>;
export type AgentOrgRootExecutionViewDto = z.infer<typeof AgentOrgRootExecutionViewDtoSchema>;
export type AgentRootExecutionViewDto = z.infer<typeof AgentRootExecutionViewDtoSchema>;
export type RootExecutionViewDto = z.infer<typeof RootExecutionViewDtoSchema>;
export type RootExecutionEventDto = z.infer<typeof RootExecutionEventDtoSchema>;
export type CollaborationStreamServerMessage = z.infer<typeof CollaborationStreamServerMessageSchema>;
export type CollaborationStreamClientMessage = z.infer<typeof CollaborationStreamClientMessageSchema>;
