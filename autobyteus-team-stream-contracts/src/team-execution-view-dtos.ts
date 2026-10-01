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
  runtime_kind: "autobyteus" | "claude_agent_sdk" | "codex_app_server" | "antigravity_cli" | "grok_build";
  llm_model_identifier: string;
  llm_config: Readonly<Record<string, import("./schema-helpers.js").JsonValue>> | null;
  auto_execute_tools: boolean;
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

/** A delegated child Agent; `delegator_agent_run_id` is the AgentRun that started it (null when not recorded). */
export type TaskAgentExecutionDto = Readonly<{
  kind: "task_agent";
  address: string;
  agent_run_id: string;
  platform_agent_run_id: string | null;
  delegator_agent_run_id: string | null;
  started_at: string;
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

/** A delegated child Team; `delegator_agent_run_id` is the AgentRun that started it (null when not recorded). */
export type TaskTeamExecutionDto = Readonly<{
  kind: "task_team";
  address: string;
  team_run_id: string;
  members: readonly TaskTeamMemberExecutionDto[];
  task_executions: readonly TaskExecutionDto[];
  delegator_agent_run_id: string | null;
  started_at: string;
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
  default_launch_configuration: AgentLaunchConfigurationDto;
  members: readonly ConfiguredMemberExecutionDto[];
  task_executions: readonly TaskExecutionDto[];
}>;

export type ConfiguredMemberExecutionDto = ConfiguredAgentExecutionDto | ConfiguredTeamExecutionDto;

/**
 * One collaborator of the run: one instance of a shared Agent or Agent Team definition added
 * with `@`. Its run IDs are recorded in the entry; it starts on its first message.
 */
export type CollaboratorEntryDto =
  | Readonly<{
      kind: "agent";
      address: string;
      agent_definition_id: string;
      agent_run_id: string;
      platform_agent_run_id: string | null;
      launch_configuration: AgentLaunchConfigurationDto;
      added_at: string;
      added_via_agent_run_id: string;
    }>
  | Readonly<{
      kind: "agent_team";
      address: string;
      team_definition_id: string;
      team_run_id: string;
      coordinator_address: string;
      members: readonly Readonly<{
        address: string;
        agent_definition_id: string;
        agent_run_id: string;
        platform_agent_run_id: string | null;
      }>[];
      handoffs: readonly Readonly<{ from: string; to: string; rules: readonly string[] }>[];
      default_launch_configuration: AgentLaunchConfigurationDto;
      task_executions: readonly TaskExecutionDto[];
      added_at: string;
      added_via_agent_run_id: string;
    }>;

const launchConfigurationSchema: z.ZodType<AgentLaunchConfigurationDto> = z.object({
  runtime_kind: z.enum(["autobyteus", "claude_agent_sdk", "codex_app_server", "antigravity_cli", "grok_build"]),
  llm_model_identifier: nonEmptyStringSchema,
  llm_config: z.record(z.string(), jsonValueSchema).nullable(),
  auto_execute_tools: z.boolean(),
  workspace_root_path: nullableNonEmptyStringSchema,
}).strict();

const handoffDtoSchema = z.object({ from: nonEmptyStringSchema, to: nonEmptyStringSchema, rules: z.array(nonEmptyStringSchema).min(1) }).strict();

const configuredAgentSchema: z.ZodType<ConfiguredAgentExecutionDto> = z.object({
  kind: z.literal("configured_agent"), address: agentTeamAddressDtoSchema,
  agent_definition_id: nonEmptyStringSchema, role: z.string().nullable(), description: z.string().nullable(),
  agent_run_id: nonEmptyStringSchema, platform_agent_run_id: nullableNonEmptyStringSchema,
  launch_configuration: launchConfigurationSchema,
}).strict();

export const taskAgentExecutionDtoSchema: z.ZodType<TaskAgentExecutionDto> = z.object({
  kind: z.literal("task_agent"), address: agentTeamAddressDtoSchema, agent_run_id: nonEmptyStringSchema,
  platform_agent_run_id: nullableNonEmptyStringSchema, delegator_agent_run_id: nullableNonEmptyStringSchema,
  started_at: nonEmptyStringSchema,
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
  delegator_agent_run_id: nullableNonEmptyStringSchema, started_at: nonEmptyStringSchema,
}).strict());

export const collaboratorEntryDtoSchema: z.ZodType<CollaboratorEntryDto> = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("agent"), address: agentTeamAddressDtoSchema, agent_definition_id: nonEmptyStringSchema,
    agent_run_id: nonEmptyStringSchema, platform_agent_run_id: nullableNonEmptyStringSchema,
    launch_configuration: launchConfigurationSchema, added_at: nonEmptyStringSchema,
    added_via_agent_run_id: nonEmptyStringSchema,
  }).strict(),
  z.object({
    kind: z.literal("agent_team"), address: agentTeamAddressDtoSchema, team_definition_id: nonEmptyStringSchema,
    team_run_id: nonEmptyStringSchema, coordinator_address: agentTeamAddressDtoSchema,
    members: z.array(z.object({
      address: agentTeamAddressDtoSchema, agent_definition_id: nonEmptyStringSchema,
      agent_run_id: nonEmptyStringSchema, platform_agent_run_id: nullableNonEmptyStringSchema,
    }).strict()).min(1),
    handoffs: z.array(handoffDtoSchema), default_launch_configuration: launchConfigurationSchema,
    task_executions: z.array(z.union([taskAgentExecutionDtoSchema, taskTeamExecutionDtoSchema])),
    added_at: nonEmptyStringSchema, added_via_agent_run_id: nonEmptyStringSchema,
  }).strict(),
]);

const configuredTeamSchema: z.ZodType<ConfiguredTeamExecutionDto> = z.lazy(() => z.object({
  kind: z.literal("configured_team"), address: agentTeamAddressDtoSchema,
  team_definition_id: nonEmptyStringSchema, role: z.string().nullable(), description: z.string().nullable(),
  team_run_id: nonEmptyStringSchema, coordinator_address: agentTeamAddressDtoSchema,
  default_launch_configuration: launchConfigurationSchema,
  members: z.array(z.union([configuredAgentSchema, configuredTeamSchema])),
  task_executions: z.array(z.union([taskAgentExecutionDtoSchema, taskTeamExecutionDtoSchema])),
}).strict());

export type TeamRunExecutionTreeDto = Readonly<{
  created_at: string;
  archived_at: string | null;
  application_binding: Readonly<{ application_id: string; binding_id: string }> | null;
  handoffs: readonly Readonly<{ from: string; to: string; rules: readonly string[] }>[];
  root_team: Readonly<{
    address: "/";
    team_definition_id: string;
    team_definition_name: string;
    team_run_id: string;
    coordinator_address: string;
    default_launch_configuration: AgentLaunchConfigurationDto;
    members: readonly ConfiguredMemberExecutionDto[];
    collaborators: readonly CollaboratorEntryDto[];
    task_executions: readonly TaskExecutionDto[];
  }>;
}>;

export const teamRunExecutionTreeDtoSchema: z.ZodType<TeamRunExecutionTreeDto> = z.object({
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
}).strict();

export type TeamMemberExecutionIdentityDto = Readonly<z.infer<typeof teamMemberExecutionIdentityDtoSchema>>;
export type TeamAgentStatusDto = Readonly<z.infer<typeof teamAgentStatusDtoSchema>>;
