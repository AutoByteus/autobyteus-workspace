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
const launchConfigurationSchema = z.object({
    runtime_kind: z.enum(["AUTOBYTEUS", "CLAUDE", "CODEX"]),
    llm_model_identifier: nonEmptyStringSchema,
    llm_config: z.record(z.string(), jsonValueSchema).nullable(),
    auto_execute_tools: z.boolean(),
    skill_access_mode: nonEmptyStringSchema,
    workspace_root_path: nullableNonEmptyStringSchema,
}).strict();
const configuredAgentSchema = z.object({
    kind: z.literal("configured_agent"), address: agentTeamAddressDtoSchema,
    agent_definition_id: nonEmptyStringSchema, role: z.string().nullable(), description: z.string().nullable(),
    agent_run_id: nonEmptyStringSchema, platform_agent_run_id: nullableNonEmptyStringSchema,
    launch_configuration: launchConfigurationSchema,
}).strict();
export const taskAgentExecutionDtoSchema = z.object({
    kind: z.literal("task_agent"), address: agentTeamAddressDtoSchema, agent_run_id: nonEmptyStringSchema,
    platform_agent_run_id: nullableNonEmptyStringSchema, started_at: nonEmptyStringSchema,
    settled_at: nullableNonEmptyStringSchema,
}).strict();
const taskTeamAgentSchema = z.object({
    kind: z.literal("task_team_agent"), address: agentTeamAddressDtoSchema,
    agent_run_id: nonEmptyStringSchema, platform_agent_run_id: nullableNonEmptyStringSchema,
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
    started_at: nonEmptyStringSchema, settled_at: nullableNonEmptyStringSchema,
}).strict());
const configuredTeamSchema = z.lazy(() => z.object({
    kind: z.literal("configured_team"), address: agentTeamAddressDtoSchema,
    team_definition_id: nonEmptyStringSchema, role: z.string().nullable(), description: z.string().nullable(),
    team_run_id: nonEmptyStringSchema, coordinator_address: agentTeamAddressDtoSchema,
    members: z.array(z.union([configuredAgentSchema, configuredTeamSchema])),
    task_executions: z.array(z.union([taskAgentExecutionDtoSchema, taskTeamExecutionDtoSchema])),
}).strict());
export const teamRunExecutionTreeDtoSchema = z.object({
    schema_version: z.literal(1), created_at: nonEmptyStringSchema, archived_at: nullableNonEmptyStringSchema,
    application_binding: z.object({ application_id: nonEmptyStringSchema, binding_id: nonEmptyStringSchema }).strict().nullable(),
    handoffs: z.array(z.object({ from: nonEmptyStringSchema, to: nonEmptyStringSchema, rules: z.array(nonEmptyStringSchema).min(1) }).strict()),
    root_team: z.object({
        team_definition_id: nonEmptyStringSchema, team_definition_name: nonEmptyStringSchema,
        team_run_id: nonEmptyStringSchema, coordinator_address: agentTeamAddressDtoSchema,
        members: z.array(z.union([configuredAgentSchema, configuredTeamSchema])),
        task_executions: z.array(z.union([taskAgentExecutionDtoSchema, taskTeamExecutionDtoSchema])),
    }).strict(),
}).strict();
export const teamAgentStatusDtoSchema = z.object({
    agent_run_id: nonEmptyStringSchema, member_address: agentTeamAddressDtoSchema,
    status: z.enum(["offline", "initializing", "idle", "running", "error"]),
    trigger: nullableNonEmptyStringSchema, tool_name: nullableNonEmptyStringSchema,
    error_message: nullableNonEmptyStringSchema, error_details: nullableNonEmptyStringSchema,
}).strict();
//# sourceMappingURL=team-execution-view-dtos.js.map