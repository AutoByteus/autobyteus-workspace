import { agentInputStateSchema, compactionRecoveryBlockSchema } from "@autobyteus/agent-presentation-contracts";
import { z } from "zod";
import { agentAddressSchema, agentPresentationMessageSchema, jsonValueSchema, nonEmptyStringSchema, } from "@autobyteus/agent-presentation-contracts";
const timestamp = nonEmptyStringSchema;
const nullableText = nonEmptyStringSchema.nullable();
export const agentOrgLaunchConfigurationDtoSchema = z.object({
    runtimeKind: z.enum(["autobyteus", "claude_agent_sdk", "codex_app_server", "antigravity_cli", "grok_build"]),
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
const taskAgent = z.object({
    address: agentAddressSchema, agentRunId: nonEmptyStringSchema, platformAgentRunId: nullableText,
    delegatorAgentRunId: nonEmptyStringSchema.optional(), startedAt: timestamp,
}).strict();
const taskTeamMember = z.lazy(() => z.union([
    z.object({ address: agentAddressSchema, agentRunId: nonEmptyStringSchema, platformAgentRunId: nullableText }).strict(),
    z.object({ address: agentAddressSchema, teamRunId: nonEmptyStringSchema, members: z.array(taskTeamMember), taskExecutions: z.array(taskExecution) }).strict(),
]));
const taskTeam = z.lazy(() => z.object({
    address: agentAddressSchema, teamRunId: nonEmptyStringSchema, members: z.array(taskTeamMember),
    taskExecutions: z.array(taskExecution), delegatorAgentRunId: nonEmptyStringSchema.optional(), startedAt: timestamp,
}).strict());
const taskExecution = z.lazy(() => z.union([taskAgent, taskTeam]));
/** Shared by every collaboration root view (Org and Agent roots). */
export const taskExecutionDtoSchema = taskExecution;
const configuredTeam = z.object({
    address: agentAddressSchema, teamDefinitionId: nonEmptyStringSchema,
    role: z.string().nullable(), description: z.string().nullable(), teamRunId: nonEmptyStringSchema,
    coordinatorAddress: agentAddressSchema, defaultLaunchConfiguration: agentOrgLaunchConfigurationDtoSchema,
    members: z.array(configuredAgent), taskExecutions: z.array(taskExecution),
}).strict().superRefine((team, context) => {
    if (!team.members.some((member) => member.address === team.coordinatorAddress)) {
        context.addIssue({
            code: "custom",
            path: ["coordinatorAddress"],
            message: `Configured Team '${team.address}' coordinator is not one of its direct Agent members.`,
        });
    }
});
const handoff = z.object({ from: agentAddressSchema, to: agentAddressSchema, rules: z.array(nonEmptyStringSchema).min(1) }).strict();
/**
 * One collaborator of a run: one instance of a shared Agent or Agent Team definition added
 * with `@`. Its run IDs are recorded in the entry; it starts on its first message.
 */
export const collaboratorEntryDtoSchema = z.discriminatedUnion("kind", [
    z.object({
        kind: z.literal("agent"), address: agentAddressSchema, agentDefinitionId: nonEmptyStringSchema,
        agentRunId: nonEmptyStringSchema, platformAgentRunId: nullableText,
        launchConfiguration: agentOrgLaunchConfigurationDtoSchema, addedAt: timestamp, addedViaAgentRunId: nonEmptyStringSchema,
    }).strict(),
    z.object({
        kind: z.literal("agent_team"), address: agentAddressSchema, teamDefinitionId: nonEmptyStringSchema,
        teamRunId: nonEmptyStringSchema, coordinatorAddress: agentAddressSchema,
        members: z.array(z.object({
            address: agentAddressSchema, agentDefinitionId: nonEmptyStringSchema,
            agentRunId: nonEmptyStringSchema, platformAgentRunId: nullableText,
        }).strict()).min(1),
        handoffs: z.array(handoff), defaultLaunchConfiguration: agentOrgLaunchConfigurationDtoSchema,
        taskExecutions: z.array(taskExecution),
        addedAt: timestamp, addedViaAgentRunId: nonEmptyStringSchema,
    }).strict(),
]);
export const agentOrgExecutionTreeDtoSchema = z.object({
    subjectKind: z.literal("agent_org"), createdAt: timestamp,
    archivedAt: timestamp.nullable(),
    applicationBinding: z.object({ applicationId: nonEmptyStringSchema, bindingId: nonEmptyStringSchema }).strict().nullable(),
    handoffs: z.array(handoff),
    rootOrg: z.object({
        address: z.literal("/"), orgDefinitionId: nonEmptyStringSchema, orgDefinitionName: nonEmptyStringSchema,
        orgRunId: nonEmptyStringSchema, defaultLaunchConfiguration: agentOrgLaunchConfigurationDtoSchema,
        members: z.array(z.union([configuredAgent, configuredTeam])),
        collaborators: z.array(collaboratorEntryDtoSchema), taskExecutions: z.array(taskExecution),
    }).strict(),
}).strict();
export const agentOrgCommunicationMessageDtoSchema = z.object({
    messageId: nonEmptyStringSchema, senderAgentRunId: nonEmptyStringSchema,
    receiverAgentRunId: nonEmptyStringSchema, content: nonEmptyStringSchema,
    messageType: nonEmptyStringSchema, referenceFiles: z.array(nonEmptyStringSchema), createdAt: timestamp,
}).strict();
export const agentOrgCommunicationMessagesDtoSchema = z.object({
    schemaVersion: z.literal(1), subjectKind: z.literal("agent_org"), orgRunId: nonEmptyStringSchema,
    messages: z.array(agentOrgCommunicationMessageDtoSchema),
}).strict();
export const agentOrgAgentStatusDtoSchema = z.object({
    member_address: agentAddressSchema, agent_run_id: nonEmptyStringSchema,
    status: z.enum(["offline", "initializing", "idle", "running", "error"]),
    trigger: nullableText, tool_name: nullableText, error_message: nullableText, error_details: nullableText,
    recoverableBlock: compactionRecoveryBlockSchema.nullable(),
}).strict();
export const agentOrgExecutionViewDtoSchema = z.object({
    base_change_sequence: z.number().int().nonnegative(), is_active: z.boolean(),
    execution_tree: agentOrgExecutionTreeDtoSchema,
    communication_messages: agentOrgCommunicationMessagesDtoSchema, agent_statuses: z.array(agentOrgAgentStatusDtoSchema),
    agent_input_states: z.array(z.object({ agent_run_id: z.string().min(1), state: agentInputStateSchema }).strict()),
}).strict();
export const agentOrgExecutionEventDtoSchema = z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("agent_presentation"), member_address: agentAddressSchema, agent_run_id: nonEmptyStringSchema, message: agentPresentationMessageSchema }).strict(),
    z.object({
        kind: z.literal("task_execution_started"),
        host_kind: z.enum(["root", "team"]), host_run_id: nonEmptyStringSchema, execution: taskExecution,
    }).strict(),
    z.object({ kind: z.literal("communication"), message: agentOrgCommunicationMessageDtoSchema }).strict(),
    z.object({ kind: z.literal("collaborator_added"), collaborator: collaboratorEntryDtoSchema }).strict(),
]);
//# sourceMappingURL=agent-org-execution-dtos.js.map