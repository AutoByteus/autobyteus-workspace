import { z } from "zod";
import { nonEmptyStringSchema } from "@autobyteus/agent-presentation-contracts";
import { agentOrgExecutionEventDtoSchema, agentOrgExecutionViewDtoSchema } from "./agent-org-execution-dtos.js";

type AgentIdentityNode = Readonly<{ address: string; agentRunId: string }>;
type TeamIdentityNode = Readonly<{
  address: string;
  teamRunId: string;
  members: readonly IdentityNode[];
  taskExecutions: readonly IdentityNode[];
}>;
type IdentityNode = AgentIdentityNode | TeamIdentityNode;

type TaskAgentIdentityNode = AgentIdentityNode & Readonly<{ settledAt: string | null }>;
type TaskTeamIdentityNode = TeamIdentityNode & Readonly<{ settledAt?: string | null }>;

const addCorrelationIssue = (context: z.RefinementCtx, message: string): void => {
  context.addIssue({ code: "custom", message });
};

const positiveSequence = z.number().int().positive();
export const AgentTeamRootExecutionViewDtoSchema = z.object({
  root_subject_kind: z.literal("agent_team"), root_run_id: nonEmptyStringSchema,
  schema_version: z.literal(2), root_team: z.record(z.string(), z.unknown()),
}).strict();

export const AgentOrgRootExecutionViewDtoSchema = z.object({
  root_subject_kind: z.literal("agent_org"), root_run_id: nonEmptyStringSchema,
  schema_version: z.literal(1), root_org: agentOrgExecutionViewDtoSchema,
}).strict();

export const RootExecutionViewDtoSchema = z.discriminatedUnion("root_subject_kind", [
  AgentTeamRootExecutionViewDtoSchema, AgentOrgRootExecutionViewDtoSchema,
]).superRefine((value, context) => {
  if (value.root_subject_kind !== "agent_org") return;
  const correlated = [value.root_org.execution_tree.rootOrg.orgRunId, value.root_org.task_records.orgRunId, value.root_org.communication_messages.orgRunId];
  if (correlated.some((id) => id !== value.root_run_id)) addCorrelationIssue(context, "AgentOrg snapshot root correlation mismatch.");

  const addressesByRunId = new Map<string, string>();
  const addressesByTeamRunId = new Map<string, string>();
  const configuredAgentAddresses = new Set<string>();
  const configuredTeamAddresses = new Set<string>();
  const taskAgentAddressesByRunId = new Map<string, string>();
  const taskTeamAddressesByRunId = new Map<string, string>();
  const liveAgentRunIds = new Set<string>();
  const addConfiguredAddress = (address: string, kind: "Agent" | "Team"): void => {
    if (configuredAgentAddresses.has(address) || configuredTeamAddresses.has(address)) {
      addCorrelationIssue(context, `AgentOrg configured address '${address}' is duplicated.`);
    }
    (kind === "Agent" ? configuredAgentAddresses : configuredTeamAddresses).add(address);
  };
  const addAgent = (agent: AgentIdentityNode, live: boolean, scope: "configured" | "task_member" | "task_execution"): void => {
    const addressForRun = addressesByRunId.get(agent.agentRunId);
    if (addressForRun !== undefined) addCorrelationIssue(context, `AgentOrg AgentRun identity '${agent.agentRunId}' is duplicated.`);
    addressesByRunId.set(agent.agentRunId, agent.address);
    if (scope === "configured") addConfiguredAddress(agent.address, "Agent");
    if (scope === "task_execution") taskAgentAddressesByRunId.set(agent.agentRunId, agent.address);
    if (live) liveAgentRunIds.add(agent.agentRunId);
  };
  const addTeam = (team: TeamIdentityNode, scope: "configured" | "task_member" | "task_execution"): void => {
    if (addressesByTeamRunId.has(team.teamRunId)) addCorrelationIssue(context, `AgentOrg TeamRun identity '${team.teamRunId}' is duplicated.`);
    addressesByTeamRunId.set(team.teamRunId, team.address);
    if (scope === "configured") addConfiguredAddress(team.address, "Team");
    if (scope === "task_execution") taskTeamAddressesByRunId.set(team.teamRunId, team.address);
  };
  const taskIdentities = (tasks: readonly IdentityNode[], ancestorLive: boolean): void => {
    for (const task of tasks) {
      const live = ancestorLive && (task as TaskAgentIdentityNode | TaskTeamIdentityNode).settledAt === null;
      if ("agentRunId" in task) addAgent(task, live, "task_execution");
      else {
        addTeam(task, "task_execution");
        memberIdentities(task.members, live, "task_member");
        taskIdentities(task.taskExecutions, live);
      }
    }
  };
  const memberIdentities = (
    members: readonly IdentityNode[],
    live: boolean,
    scope: "configured" | "task_member",
  ): void => {
    for (const member of members) {
      if ("agentRunId" in member) addAgent(member, live, scope);
      else {
        addTeam(member, scope);
        memberIdentities(member.members, live, scope);
        taskIdentities(member.taskExecutions, live);
      }
    }
  };
  const rootLive = value.root_org.is_active;
  for (const member of value.root_org.execution_tree.rootOrg.members) {
    if ("agentRunId" in member) addAgent(member, rootLive, "configured");
    else {
      addTeam(member as unknown as TeamIdentityNode, "configured");
      memberIdentities(member.members as readonly IdentityNode[], rootLive, "configured");
      taskIdentities(member.taskExecutions as readonly IdentityNode[], rootLive);
    }
  }
  taskIdentities(value.root_org.execution_tree.rootOrg.taskExecutions as readonly IdentityNode[], rootLive);

  for (const task of value.root_org.task_records.records) {
    const executionRunId = "agentRunId" in task.taskExecution ? task.taskExecution.agentRunId : task.taskExecution.teamRunId;
    if (!addressesByRunId.has(task.delegatorAgentRunId)) {
      addCorrelationIssue(context, `AgentOrg task '${task.taskId}' delegator identity mismatch.`);
    }
    const executionAddress = "agentRunId" in task.taskExecution
      ? taskAgentAddressesByRunId.get(executionRunId)
      : taskTeamAddressesByRunId.get(executionRunId);
    const configuredRecipientMatches = "agentRunId" in task.taskExecution
      ? configuredAgentAddresses.has(task.recipientAddress)
      : configuredTeamAddresses.has(task.recipientAddress);
    if (!configuredRecipientMatches || executionAddress !== task.recipientAddress) {
      addCorrelationIssue(context, `AgentOrg task '${task.taskId}' execution identity mismatch.`);
    }
  }
  for (const message of value.root_org.communication_messages.messages) {
    if (!addressesByRunId.has(message.senderAgentRunId) || !addressesByRunId.has(message.receiverAgentRunId)) {
      addCorrelationIssue(context, `AgentOrg communication message '${message.messageId}' identity mismatch.`);
    }
  }

  const statusRunIds = new Set<string>();
  for (const status of value.root_org.agent_statuses) {
    if (statusRunIds.has(status.agent_run_id)) addCorrelationIssue(context, `AgentOrg status for AgentRun '${status.agent_run_id}' is duplicated.`);
    statusRunIds.add(status.agent_run_id);
    if (addressesByRunId.get(status.agent_run_id) !== status.member_address || !liveAgentRunIds.has(status.agent_run_id)) {
      addCorrelationIssue(context, "AgentOrg status identity mismatch.");
    }
  }
  for (const liveAgentRunId of liveAgentRunIds) {
    if (!statusRunIds.has(liveAgentRunId)) addCorrelationIssue(context, `AgentOrg live AgentRun '${liveAgentRunId}' has no status record.`);
  }
});

export const RootExecutionEventDtoSchema = z.discriminatedUnion("root_subject_kind", [
  z.object({ root_subject_kind: z.literal("agent_team"), root_run_id: nonEmptyStringSchema, change_sequence: positiveSequence, event: z.unknown() }).strict(),
  z.object({ root_subject_kind: z.literal("agent_org"), root_run_id: nonEmptyStringSchema, change_sequence: positiveSequence, event: agentOrgExecutionEventDtoSchema }).strict(),
]);

const commandType = z.enum(["SEND_MESSAGE", "INTERRUPT_GENERATION", "APPROVE_TOOL", "DENY_TOOL"]);
const commandAck = z.object({
  root_subject_kind: z.literal("agent_org"), root_run_id: nonEmptyStringSchema,
  command_id: nonEmptyStringSchema, command_type: commandType, target_agent_run_id: nonEmptyStringSchema,
  state: z.enum(["accepted", "rejected", "failed"]), code: nonEmptyStringSchema.nullable(), message: z.string().nullable(),
}).strict();
export const CollaborationStreamServerMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("CONNECTED"), payload: z.object({ root_subject_kind: z.enum(["agent_team", "agent_org"]), root_run_id: nonEmptyStringSchema, session_id: nonEmptyStringSchema }).strict() }).strict(),
  z.object({ type: z.literal("ROOT_EXECUTION_VIEW_SNAPSHOT"), payload: RootExecutionViewDtoSchema }).strict(),
  z.object({ type: z.literal("ROOT_EXECUTION_EVENT"), payload: RootExecutionEventDtoSchema }).strict(),
  z.object({ type: z.literal("ROOT_LIFECYCLE"), payload: z.object({ root_subject_kind: z.enum(["agent_team", "agent_org"]), root_run_id: nonEmptyStringSchema, is_active: z.boolean() }).strict() }).strict(),
  z.object({ type: z.literal("AGENT_COMMAND_ACK"), payload: commandAck }).strict(),
  z.object({ type: z.literal("ERROR"), payload: z.object({ code: nonEmptyStringSchema, message: nonEmptyStringSchema }).strict() }).strict(),
]);

const commandRoot = { root_subject_kind: z.literal("agent_org"), root_run_id: nonEmptyStringSchema, target_agent_run_id: nonEmptyStringSchema, command_id: nonEmptyStringSchema };
export const CollaborationStreamClientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("SEND_MESSAGE"), payload: z.object({ ...commandRoot, content: z.string(), context_file_paths: z.array(z.string()), image_urls: z.array(z.string()), message_id: nonEmptyStringSchema, dedupe_key: nonEmptyStringSchema }).strict() }).strict(),
  z.object({ type: z.literal("INTERRUPT_GENERATION"), payload: z.object(commandRoot).strict() }).strict(),
  z.object({ type: z.literal("APPROVE_TOOL"), payload: z.object({ ...commandRoot, invocation_id: nonEmptyStringSchema, reason: z.string().nullable() }).strict() }).strict(),
  z.object({ type: z.literal("DENY_TOOL"), payload: z.object({ ...commandRoot, invocation_id: nonEmptyStringSchema, reason: z.string().nullable() }).strict() }).strict(),
]);

export type AgentTeamRootExecutionViewDto = z.infer<typeof AgentTeamRootExecutionViewDtoSchema>;
export type AgentOrgRootExecutionViewDto = z.infer<typeof AgentOrgRootExecutionViewDtoSchema>;
export type RootExecutionViewDto = z.infer<typeof RootExecutionViewDtoSchema>;
export type RootExecutionEventDto = z.infer<typeof RootExecutionEventDtoSchema>;
export type CollaborationStreamServerMessage = z.infer<typeof CollaborationStreamServerMessageSchema>;
export type CollaborationStreamClientMessage = z.infer<typeof CollaborationStreamClientMessageSchema>;
