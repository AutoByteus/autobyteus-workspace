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
const runtimeKindSchema = z.enum(["autobyteus", "claude_agent_sdk", "codex_app_server", "antigravity_cli", "grok_build", "deepseek_harness"]);
const launchConfigurationSchema = z.object({
    runtime_kind: runtimeKindSchema,
    llm_model_identifier: nonEmptyStringSchema,
    llm_config: z.record(z.string(), jsonValueSchema).nullable(),
    auto_execute_tools: z.boolean(),
    workspace_root_path: nullableNonEmptyStringSchema,
}).strict();
const handoffDtoSchema = z.object({ from: nonEmptyStringSchema, to: nonEmptyStringSchema, rules: z.array(nonEmptyStringSchema).min(1) }).strict();
const configuredAgentSchema = z.object({
    kind: z.literal("configured_agent"), address: agentTeamAddressDtoSchema,
    agent_definition_id: nonEmptyStringSchema, role: z.string().nullable(), description: z.string().nullable(),
    agent_run_id: nonEmptyStringSchema, platform_agent_run_id: nullableNonEmptyStringSchema,
    launch_configuration: launchConfigurationSchema,
    leaving: z.literal(true).optional(),
}).strict();
export const teamRunExecutionTreeDtoSchema = z.object({
    created_at: nonEmptyStringSchema, archived_at: nullableNonEmptyStringSchema,
    application_binding: z.object({ application_id: nonEmptyStringSchema, binding_id: nonEmptyStringSchema }).strict().nullable(),
    handoffs: z.array(handoffDtoSchema),
    root_team: z.object({
        address: z.literal("/"),
        team_definition_id: nonEmptyStringSchema, team_definition_name: nonEmptyStringSchema,
        team_run_id: nonEmptyStringSchema, coordinator_address: agentTeamAddressDtoSchema,
        default_launch_configuration: launchConfigurationSchema,
        members: z.array(configuredAgentSchema),
    }).strict(),
}).strict();
export const teamAgentStatusDtoSchema = z.object({
    agent_run_id: nonEmptyStringSchema, member_address: agentTeamAddressDtoSchema,
    status: z.enum(["offline", "initializing", "idle", "running", "error"]),
    background_tasks_running: z.number().int().nonnegative(),
    trigger: nullableNonEmptyStringSchema, tool_name: nullableNonEmptyStringSchema,
    error_message: nullableNonEmptyStringSchema, error_details: nullableNonEmptyStringSchema,
    recoverableBlock: compactionRecoveryBlockSchema.nullable(),
}).strict();
//# sourceMappingURL=team-execution-view-dtos.js.map