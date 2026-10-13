import { compactionRecoveryBlockSchema } from "@autobyteus/agent-presentation-contracts";
import { z } from "zod";
import { jsonValueSchema, nonEmptyStringSchema, nullableNonEmptyStringSchema } from "./schema-helpers.js";
const isCanonicalRootedAddress = (value) => {
    if (!value.startsWith("/") || value.startsWith("./"))
        return false;
    if (value === "/")
        return true;
    if (value.endsWith("/") || value.includes("//") || value.includes("\\"))
        return false;
    return value.slice(1).split("/").every((part) => part.length > 0 && part === part.trim() && part !== "." && part !== "..");
};
export const agentTeamAddressDtoSchema = z.string().refine(isCanonicalRootedAddress, {
    message: "member_address must be one canonical rooted AgentTeam address.",
});
export const teamMemberExecutionIdentityDtoSchema = z.object({
    agent_run_id: nonEmptyStringSchema,
    member_address: agentTeamAddressDtoSchema,
}).strict();
/**
 * The launch a collaborator-Team or catalog-Team-copy member runs with: its own, else its Team's.
 * Every reader of such a member's launch uses this, never the Team's value directly.
 */
export const teamMemberLaunchConfiguration = (team, member) => member.launch_configuration ?? team.default_launch_configuration;
/** The recorded source of such a member's launch: its own, else its Team's; null when not recorded. */
export const teamMemberLaunchSource = (team, member) => member.launch_source ?? team.default_launch_source ?? null;
/**
 * The single launch rule of a copy or collaborator agent (mirrors the server's
 * `effectiveCopyAgentLaunch`): its own choice, else (when it follows its Team) the Team's choice,
 * else its started launch. `selected` tells which choice applied.
 */
export const teamCopyAgentLaunch = (input) => {
    const selection = input.agentSelection ?? (input.followsTeam ? input.teamSelection ?? null : null);
    if (!selection)
        return { launch: input.started, selected: null };
    return {
        launch: { ...input.started, llm_model_identifier: selection.llm_model_identifier, llm_config: selection.llm_config },
        selected: input.agentSelection ? "agent" : "team",
    };
};
/** A recorded Team member follows its Team's launch (and choice) iff it records no own launch. */
export const teamMemberFollowsTeam = (member) => member.launch_configuration === undefined;
const launchConfigurationSchema = z.object({
    runtime_kind: z.enum(["autobyteus", "claude_agent_sdk", "codex_app_server", "antigravity_cli", "grok_build"]),
    llm_model_identifier: nonEmptyStringSchema,
    llm_config: z.record(z.string(), jsonValueSchema).nullable(),
    auto_execute_tools: z.boolean(),
    workspace_root_path: nullableNonEmptyStringSchema,
}).strict();
const launchSourceSchema = z.object({
    origin: z.enum(["agent_default", "team_default", "inherited"]),
    fallbacks: z.array(z.object({
        layer: z.enum(["agent_default", "team_default"]),
        runtime_kind: nullableNonEmptyStringSchema,
        llm_model_identifier: nullableNonEmptyStringSchema,
        reason: z.enum(["incomplete", "runtime_unavailable", "model_unavailable", "model_settings_invalid"]),
        detail: nonEmptyStringSchema,
    }).strict()),
}).strict();
const memberLaunchSchema = { launch_configuration: launchConfigurationSchema.optional(), launch_source: launchSourceSchema.optional() };
const userLaunchSelectionSchema = z.object({
    llm_model_identifier: nonEmptyStringSchema,
    llm_config: z.record(z.string(), jsonValueSchema).nullable(),
    selected_at: nonEmptyStringSchema,
}).strict();
const agentSelectionSchema = { user_launch_selection: userLaunchSelectionSchema.optional() };
const teamSelectionSchema = { user_team_launch_selection: userLaunchSelectionSchema.optional() };
const handoffDtoSchema = z.object({ from: nonEmptyStringSchema, to: nonEmptyStringSchema, rules: z.array(nonEmptyStringSchema).min(1) }).strict();
const configuredAgentSchema = z.object({
    kind: z.literal("configured_agent"), address: agentTeamAddressDtoSchema,
    agent_definition_id: nonEmptyStringSchema, role: z.string().nullable(), description: z.string().nullable(),
    agent_run_id: nonEmptyStringSchema, platform_agent_run_id: nullableNonEmptyStringSchema,
    launch_configuration: launchConfigurationSchema,
}).strict();
const taskAgentSourceSchema = z.object({
    kind: z.literal("agent"), agent_definition_id: nonEmptyStringSchema, launch_configuration: launchConfigurationSchema,
    launch_source: launchSourceSchema.optional(),
}).strict();
const taskTeamSourceSchema = z.object({
    kind: z.literal("agent_team"), team_definition_id: nonEmptyStringSchema, coordinator_address: agentTeamAddressDtoSchema,
    members: z.array(z.object({
        address: agentTeamAddressDtoSchema, agent_definition_id: nonEmptyStringSchema, ...memberLaunchSchema,
    }).strict()).min(1),
    handoffs: z.array(handoffDtoSchema), default_launch_configuration: launchConfigurationSchema,
    default_launch_source: launchSourceSchema.optional(),
}).strict();
export const taskAgentExecutionDtoSchema = z.object({
    kind: z.literal("task_agent"), address: agentTeamAddressDtoSchema, agent_run_id: nonEmptyStringSchema,
    platform_agent_run_id: nullableNonEmptyStringSchema, delegator_agent_run_id: nullableNonEmptyStringSchema,
    started_at: nonEmptyStringSchema, source: taskAgentSourceSchema.optional(), ...agentSelectionSchema,
}).strict();
const taskTeamAgentSchema = z.object({
    kind: z.literal("task_team_agent"), address: agentTeamAddressDtoSchema,
    agent_run_id: nonEmptyStringSchema, platform_agent_run_id: nullableNonEmptyStringSchema, ...agentSelectionSchema,
}).strict();
const taskTeamNestedSchema = z.lazy(() => z.object({
    kind: z.literal("task_team_member"), address: agentTeamAddressDtoSchema, team_run_id: nonEmptyStringSchema,
    members: z.array(z.union([taskTeamAgentSchema, taskTeamNestedSchema])),
    task_executions: z.array(z.union([taskAgentExecutionDtoSchema, taskTeamExecutionDtoSchema])),
}).strict());
export const taskTeamExecutionDtoSchema = z.lazy(() => z.object({
    kind: z.literal("task_team"), address: agentTeamAddressDtoSchema, team_run_id: nonEmptyStringSchema,
    members: z.array(z.union([taskTeamAgentSchema, taskTeamNestedSchema])),
    task_executions: z.array(z.union([taskAgentExecutionDtoSchema, taskTeamExecutionDtoSchema])),
    delegator_agent_run_id: nullableNonEmptyStringSchema, started_at: nonEmptyStringSchema,
    source: taskTeamSourceSchema.optional(), ...teamSelectionSchema,
}).strict());
export const collaboratorEntryDtoSchema = z.discriminatedUnion("kind", [
    z.object({
        kind: z.literal("agent"), address: agentTeamAddressDtoSchema, agent_definition_id: nonEmptyStringSchema,
        agent_run_id: nonEmptyStringSchema, platform_agent_run_id: nullableNonEmptyStringSchema,
        launch_configuration: launchConfigurationSchema, launch_source: launchSourceSchema.optional(),
        added_at: nonEmptyStringSchema, added_via_agent_run_id: nonEmptyStringSchema, ...agentSelectionSchema,
    }).strict(),
    z.object({
        kind: z.literal("agent_team"), address: agentTeamAddressDtoSchema, team_definition_id: nonEmptyStringSchema,
        team_run_id: nonEmptyStringSchema, coordinator_address: agentTeamAddressDtoSchema,
        members: z.array(z.object({
            address: agentTeamAddressDtoSchema, agent_definition_id: nonEmptyStringSchema,
            agent_run_id: nonEmptyStringSchema, platform_agent_run_id: nullableNonEmptyStringSchema, ...memberLaunchSchema,
            ...agentSelectionSchema,
        }).strict()).min(1),
        handoffs: z.array(handoffDtoSchema), default_launch_configuration: launchConfigurationSchema,
        default_launch_source: launchSourceSchema.optional(),
        task_executions: z.array(z.union([taskAgentExecutionDtoSchema, taskTeamExecutionDtoSchema])),
        added_at: nonEmptyStringSchema, added_via_agent_run_id: nonEmptyStringSchema, ...teamSelectionSchema,
    }).strict(),
]);
const configuredTeamSchema = z.lazy(() => z.object({
    kind: z.literal("configured_team"), address: agentTeamAddressDtoSchema,
    team_definition_id: nonEmptyStringSchema, role: z.string().nullable(), description: z.string().nullable(),
    team_run_id: nonEmptyStringSchema, coordinator_address: agentTeamAddressDtoSchema,
    default_launch_configuration: launchConfigurationSchema,
    members: z.array(z.union([configuredAgentSchema, configuredTeamSchema])),
    task_executions: z.array(z.union([taskAgentExecutionDtoSchema, taskTeamExecutionDtoSchema])),
}).strict());
export const teamRunExecutionTreeDtoSchema = z.object({
    created_at: nonEmptyStringSchema, archived_at: nullableNonEmptyStringSchema,
    application_binding: z.object({ application_id: nonEmptyStringSchema, binding_id: nonEmptyStringSchema }).strict().nullable(),
    handoffs: z.array(handoffDtoSchema),
    root_team: z.object({
        address: z.literal("/"),
        team_definition_id: nonEmptyStringSchema, team_definition_name: nonEmptyStringSchema,
        team_run_id: nonEmptyStringSchema, coordinator_address: agentTeamAddressDtoSchema,
        default_launch_configuration: launchConfigurationSchema,
        members: z.array(z.union([configuredAgentSchema, configuredTeamSchema])),
        collaborators: z.array(collaboratorEntryDtoSchema),
        task_executions: z.array(z.union([taskAgentExecutionDtoSchema, taskTeamExecutionDtoSchema])),
    }).strict(),
}).strict();
export const teamAgentStatusDtoSchema = z.object({
    agent_run_id: nonEmptyStringSchema, member_address: agentTeamAddressDtoSchema,
    status: z.enum(["offline", "initializing", "idle", "running", "error"]),
    trigger: nullableNonEmptyStringSchema, tool_name: nullableNonEmptyStringSchema,
    error_message: nullableNonEmptyStringSchema, error_details: nullableNonEmptyStringSchema,
    recoverableBlock: compactionRecoveryBlockSchema.nullable(),
}).strict();
//# sourceMappingURL=team-execution-view-dtos.js.map