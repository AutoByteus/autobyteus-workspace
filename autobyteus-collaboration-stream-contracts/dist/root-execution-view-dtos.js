import { z } from "zod";
import { collaboratorMentionsDtoSchema, nonEmptyStringSchema } from "@autobyteus/agent-presentation-contracts";
import { agentOrgExecutionEventDtoSchema, agentOrgExecutionViewDtoSchema } from "./agent-org-execution-dtos.js";
import { agentRunCollaborationEventDtoSchema, agentRunCollaborationViewDtoSchema, } from "./agent-run-collaboration-dtos.js";
const addCorrelationIssue = (context, message) => {
    context.addIssue({ code: "custom", message });
};
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
const validateAgentRootCorrelation = (value, context) => {
    const view = value.root_agent;
    if (view.execution_tree.host.agentRunId !== value.root_run_id || view.communication_messages.hostRunId !== value.root_run_id) {
        addCorrelationIssue(context, "Agent root snapshot host correlation mismatch.");
    }
    const addresses = new Map([[view.execution_tree.host.agentRunId, view.execution_tree.host.address]]);
    const childRunIds = new Set();
    const visit = (nodes) => {
        for (const node of nodes) {
            if ("agentRunId" in node) {
                if (addresses.has(node.agentRunId))
                    addCorrelationIssue(context, `Agent root AgentRun identity '${node.agentRunId}' is duplicated.`);
                addresses.set(node.agentRunId, node.address);
                childRunIds.add(node.agentRunId);
            }
            else {
                visit(node.members);
                visit(node.taskExecutions);
            }
        }
    };
    visit(view.execution_tree.taskExecutions);
    const collaboratorAddresses = new Set(view.execution_tree.collaborators.map((entry) => entry.address));
    if (collaboratorAddresses.size !== view.execution_tree.collaborators.length || collaboratorAddresses.has(view.execution_tree.host.address)) {
        addCorrelationIssue(context, "Agent root collaborator addresses must be unique and differ from the host address.");
    }
    for (const message of view.communication_messages.messages) {
        if (!addresses.has(message.senderAgentRunId) || !addresses.has(message.receiverAgentRunId)) {
            addCorrelationIssue(context, `Agent root communication message '${message.messageId}' identity mismatch.`);
        }
    }
    for (const status of view.agent_statuses) {
        if (!childRunIds.has(status.agent_run_id) || addresses.get(status.agent_run_id) !== status.member_address) {
            addCorrelationIssue(context, "Agent root status identity mismatch.");
        }
    }
};
export const RootExecutionViewDtoSchema = z.discriminatedUnion("root_subject_kind", [
    AgentTeamRootExecutionViewDtoSchema, AgentOrgRootExecutionViewDtoSchema, AgentRootExecutionViewDtoSchema,
]).superRefine((value, context) => {
    if (value.root_subject_kind === "agent") {
        validateAgentRootCorrelation(value, context);
        return;
    }
    if (value.root_subject_kind !== "agent_org")
        return;
    const correlated = [value.root_org.execution_tree.rootOrg.orgRunId, value.root_org.communication_messages.orgRunId];
    if (correlated.some((id) => id !== value.root_run_id))
        addCorrelationIssue(context, "AgentOrg snapshot root correlation mismatch.");
    const addressesByRunId = new Map();
    const addressesByTeamRunId = new Map();
    const configuredAgentAddresses = new Set();
    const configuredTeamAddresses = new Set();
    // In an active root every tree agent reports a status (shut-down children report `offline`).
    const statusRequiredAgentRunIds = new Set();
    const addConfiguredAddress = (address, kind) => {
        if (configuredAgentAddresses.has(address) || configuredTeamAddresses.has(address)) {
            addCorrelationIssue(context, `AgentOrg configured address '${address}' is duplicated.`);
        }
        (kind === "Agent" ? configuredAgentAddresses : configuredTeamAddresses).add(address);
    };
    const addAgent = (agent, active, scope) => {
        const addressForRun = addressesByRunId.get(agent.agentRunId);
        if (addressForRun !== undefined)
            addCorrelationIssue(context, `AgentOrg AgentRun identity '${agent.agentRunId}' is duplicated.`);
        addressesByRunId.set(agent.agentRunId, agent.address);
        if (scope === "configured")
            addConfiguredAddress(agent.address, "Agent");
        if (active)
            statusRequiredAgentRunIds.add(agent.agentRunId);
    };
    const addTeam = (team, scope) => {
        if (addressesByTeamRunId.has(team.teamRunId))
            addCorrelationIssue(context, `AgentOrg TeamRun identity '${team.teamRunId}' is duplicated.`);
        addressesByTeamRunId.set(team.teamRunId, team.address);
        if (scope === "configured")
            addConfiguredAddress(team.address, "Team");
    };
    const taskIdentities = (tasks, active) => {
        for (const task of tasks) {
            if ("agentRunId" in task)
                addAgent(task, active, "task_execution");
            else {
                addTeam(task, "task_execution");
                memberIdentities(task.members, active, "task_member");
                taskIdentities(task.taskExecutions, active);
            }
        }
    };
    const memberIdentities = (members, live, scope) => {
        for (const member of members) {
            if ("agentRunId" in member)
                addAgent(member, live, scope);
            else {
                addTeam(member, scope);
                memberIdentities(member.members, live, scope);
                taskIdentities(member.taskExecutions, live);
            }
        }
    };
    const rootLive = value.root_org.is_active;
    for (const member of value.root_org.execution_tree.rootOrg.members) {
        if ("agentRunId" in member)
            addAgent(member, rootLive, "configured");
        else {
            addTeam(member, "configured");
            memberIdentities(member.members, rootLive, "configured");
            taskIdentities(member.taskExecutions, rootLive);
        }
    }
    taskIdentities(value.root_org.execution_tree.rootOrg.taskExecutions, rootLive);
    for (const message of value.root_org.communication_messages.messages) {
        if (!addressesByRunId.has(message.senderAgentRunId) || !addressesByRunId.has(message.receiverAgentRunId)) {
            addCorrelationIssue(context, `AgentOrg communication message '${message.messageId}' identity mismatch.`);
        }
    }
    const statusRunIds = new Set();
    for (const status of value.root_org.agent_statuses) {
        if (statusRunIds.has(status.agent_run_id))
            addCorrelationIssue(context, `AgentOrg status for AgentRun '${status.agent_run_id}' is duplicated.`);
        statusRunIds.add(status.agent_run_id);
        if (addressesByRunId.get(status.agent_run_id) !== status.member_address || !statusRequiredAgentRunIds.has(status.agent_run_id)) {
            addCorrelationIssue(context, "AgentOrg status identity mismatch.");
        }
    }
    for (const agentRunId of statusRequiredAgentRunIds) {
        if (!statusRunIds.has(agentRunId))
            addCorrelationIssue(context, `AgentOrg AgentRun '${agentRunId}' has no status record.`);
    }
});
export const RootExecutionEventDtoSchema = z.discriminatedUnion("root_subject_kind", [
    z.object({ root_subject_kind: z.literal("agent_team"), root_run_id: nonEmptyStringSchema, change_sequence: positiveSequence, event: z.unknown() }).strict(),
    z.object({ root_subject_kind: z.literal("agent_org"), root_run_id: nonEmptyStringSchema, change_sequence: positiveSequence, event: agentOrgExecutionEventDtoSchema }).strict(),
    z.object({ root_subject_kind: z.literal("agent"), root_run_id: nonEmptyStringSchema, change_sequence: positiveSequence, event: agentRunCollaborationEventDtoSchema }).strict(),
]);
const rootSubjectKind = z.enum(["agent_team", "agent_org", "agent"]);
/** Roots that accept per-agent commands on the collaboration stream. */
const commandRootSubjectKind = z.enum(["agent_org", "agent"]);
const commandType = z.enum(["SEND_MESSAGE", "INTERRUPT_GENERATION", "APPROVE_TOOL", "DENY_TOOL"]);
const commandAck = z.object({
    root_subject_kind: commandRootSubjectKind, root_run_id: nonEmptyStringSchema,
    command_id: nonEmptyStringSchema, command_type: commandType, target_agent_run_id: nonEmptyStringSchema,
    state: z.enum(["accepted", "rejected", "failed"]), code: nonEmptyStringSchema.nullable(), message: z.string().nullable(),
}).strict();
export const CollaborationStreamServerMessageSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("CONNECTED"), payload: z.object({ root_subject_kind: rootSubjectKind, root_run_id: nonEmptyStringSchema, session_id: nonEmptyStringSchema }).strict() }).strict(),
    z.object({ type: z.literal("ROOT_EXECUTION_VIEW_SNAPSHOT"), payload: RootExecutionViewDtoSchema }).strict(),
    z.object({ type: z.literal("ROOT_EXECUTION_EVENT"), payload: RootExecutionEventDtoSchema }).strict(),
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
//# sourceMappingURL=root-execution-view-dtos.js.map