import { z } from "zod";
import { jsonValueSchema, nonEmptyStringSchema, nullableNonEmptyStringSchema } from "./schema-helpers.js";

const isCanonicalRootedAddress = (value: string): boolean => {
  if (!value.startsWith("/") || value.startsWith("./")) return false;
  if (value === "/") return true;
  if (value.endsWith("/") || value.includes("//") || value.includes("\\")) return false;
  return value.slice(1).split("/").every((part) =>
    part.length > 0 && part === part.trim() && part !== "." && part !== "..",
  );
};

export const agentTeamAddressDtoSchema = z.string().refine(isCanonicalRootedAddress, {
  message: "member_address must be one canonical rooted AgentTeam address.",
});

export const teamMemberExecutionIdentityDtoSchema = z.object({
  agent_run_id: nonEmptyStringSchema,
  member_address: agentTeamAddressDtoSchema,
}).strict();

export type AgentLaunchConfigurationDto = Readonly<{
  runtime_kind: "AUTOBYTEUS" | "CLAUDE" | "CODEX";
  llm_model_identifier: string;
  llm_config: Readonly<Record<string, import("./schema-helpers.js").JsonValue>> | null;
  auto_execute_tools: boolean;
  skill_access_mode: string;
  workspace_root_path: string | null;
}>;

export type ConfiguredAgentExecutionDto = Readonly<{
  kind: "configured_agent";
  address: string;
  agent_definition_id: string;
  role: string | null;
  description: string | null;
  agent_run_id: string;
  platform_agent_run_id: string | null;
  launch_configuration: AgentLaunchConfigurationDto;
}>;

export type TaskAgentExecutionDto = Readonly<{
  kind: "task_agent";
  address: string;
  agent_run_id: string;
  platform_agent_run_id: string | null;
  started_at: string;
  settled_at: string | null;
}>;

export type TaskTeamAgentExecutionDto = Readonly<{
  kind: "task_team_agent";
  address: string;
  agent_run_id: string;
  platform_agent_run_id: string | null;
}>;

export type TaskTeamNestedTeamExecutionDto = Readonly<{
  kind: "task_team_member";
  address: string;
  team_run_id: string;
  members: readonly TaskTeamMemberExecutionDto[];
  task_executions: readonly TaskExecutionDto[];
}>;

export type TaskTeamMemberExecutionDto = TaskTeamAgentExecutionDto | TaskTeamNestedTeamExecutionDto;

export type TaskTeamExecutionDto = Readonly<{
  kind: "task_team";
  address: string;
  team_run_id: string;
  members: readonly TaskTeamMemberExecutionDto[];
  task_executions: readonly TaskExecutionDto[];
  started_at: string;
  settled_at: string | null;
}>;

export type TaskExecutionDto = TaskAgentExecutionDto | TaskTeamExecutionDto;

export type ConfiguredTeamExecutionDto = Readonly<{
  kind: "configured_team";
  address: string;
  team_definition_id: string;
  role: string | null;
  description: string | null;
  team_run_id: string;
  coordinator_address: string;
  members: readonly ConfiguredMemberExecutionDto[];
  task_executions: readonly TaskExecutionDto[];
}>;

export type ConfiguredMemberExecutionDto = ConfiguredAgentExecutionDto | ConfiguredTeamExecutionDto;

const launchConfigurationSchema: z.ZodType<AgentLaunchConfigurationDto> = z.object({
  runtime_kind: z.enum(["AUTOBYTEUS", "CLAUDE", "CODEX"]),
  llm_model_identifier: nonEmptyStringSchema,
  llm_config: z.record(z.string(), jsonValueSchema).nullable(),
  auto_execute_tools: z.boolean(),
  skill_access_mode: nonEmptyStringSchema,
  workspace_root_path: nullableNonEmptyStringSchema,
}).strict();

const configuredAgentSchema: z.ZodType<ConfiguredAgentExecutionDto> = z.object({
  kind: z.literal("configured_agent"), address: agentTeamAddressDtoSchema,
  agent_definition_id: nonEmptyStringSchema, role: z.string().nullable(), description: z.string().nullable(),
  agent_run_id: nonEmptyStringSchema, platform_agent_run_id: nullableNonEmptyStringSchema,
  launch_configuration: launchConfigurationSchema,
}).strict();

export const taskAgentExecutionDtoSchema: z.ZodType<TaskAgentExecutionDto> = z.object({
  kind: z.literal("task_agent"), address: agentTeamAddressDtoSchema, agent_run_id: nonEmptyStringSchema,
  platform_agent_run_id: nullableNonEmptyStringSchema, started_at: nonEmptyStringSchema,
  settled_at: nullableNonEmptyStringSchema,
}).strict();

const taskTeamAgentSchema: z.ZodType<TaskTeamAgentExecutionDto> = z.object({
  kind: z.literal("task_team_agent"), address: agentTeamAddressDtoSchema,
  agent_run_id: nonEmptyStringSchema, platform_agent_run_id: nullableNonEmptyStringSchema,
}).strict();

const taskTeamNestedSchema: z.ZodType<TaskTeamNestedTeamExecutionDto> = z.lazy(() => z.object({
  kind: z.literal("task_team_member"), address: agentTeamAddressDtoSchema, team_run_id: nonEmptyStringSchema,
  members: z.array(z.union([taskTeamAgentSchema, taskTeamNestedSchema])),
  task_executions: z.array(z.union([taskAgentExecutionDtoSchema, taskTeamExecutionDtoSchema])),
}).strict());

export const taskTeamExecutionDtoSchema: z.ZodType<TaskTeamExecutionDto> = z.lazy(() => z.object({
  kind: z.literal("task_team"), address: agentTeamAddressDtoSchema, team_run_id: nonEmptyStringSchema,
  members: z.array(z.union([taskTeamAgentSchema, taskTeamNestedSchema])),
  task_executions: z.array(z.union([taskAgentExecutionDtoSchema, taskTeamExecutionDtoSchema])),
  started_at: nonEmptyStringSchema, settled_at: nullableNonEmptyStringSchema,
}).strict());

const configuredTeamSchema: z.ZodType<ConfiguredTeamExecutionDto> = z.lazy(() => z.object({
  kind: z.literal("configured_team"), address: agentTeamAddressDtoSchema,
  team_definition_id: nonEmptyStringSchema, role: z.string().nullable(), description: z.string().nullable(),
  team_run_id: nonEmptyStringSchema, coordinator_address: agentTeamAddressDtoSchema,
  members: z.array(z.union([configuredAgentSchema, configuredTeamSchema])),
  task_executions: z.array(z.union([taskAgentExecutionDtoSchema, taskTeamExecutionDtoSchema])),
}).strict());

export type TeamRunExecutionTreeDto = Readonly<{
  schema_version: 1;
  created_at: string;
  archived_at: string | null;
  application_binding: Readonly<{ application_id: string; binding_id: string }> | null;
  handoffs: readonly Readonly<{ from: string; to: string; rules: readonly string[] }>[];
  root_team: Readonly<{
    team_definition_id: string;
    team_definition_name: string;
    team_run_id: string;
    coordinator_address: string;
    members: readonly ConfiguredMemberExecutionDto[];
    task_executions: readonly TaskExecutionDto[];
  }>;
}>;

export const teamRunExecutionTreeDtoSchema: z.ZodType<TeamRunExecutionTreeDto> = z.object({
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

export type TeamMemberExecutionIdentityDto = Readonly<z.infer<typeof teamMemberExecutionIdentityDtoSchema>>;
export type TeamAgentStatusDto = Readonly<z.infer<typeof teamAgentStatusDtoSchema>>;
