import { compactionRecoveryBlockSchema } from "@autobyteus/agent-presentation-contracts";
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

/**
 * Where an agent's (or a Team's) launch values came from and the configured layers skipped before
 * it. Absent on records written before sources existed ("not recorded").
 */
export type LaunchConfigurationSourceDto = Readonly<{
  origin: "agent_default" | "team_default" | "inherited";
  fallbacks: readonly Readonly<{
    layer: "agent_default" | "team_default";
    runtime_kind: string | null;
    llm_model_identifier: string | null;
    reason: "incomplete" | "runtime_unavailable" | "model_unavailable" | "model_settings_invalid";
    detail: string;
  }>[];
}>;

/** A recorded Team member's own launch: present only when it runs on its own agent default. */
type MemberLaunchDto = Readonly<{
  launch_configuration?: AgentLaunchConfigurationDto;
  launch_source?: LaunchConfigurationSourceDto;
}>;
type TeamLaunchDto = Readonly<{
  default_launch_configuration: AgentLaunchConfigurationDto;
  default_launch_source?: LaunchConfigurationSourceDto;
}>;

/**
 * The launch a catalog-Team-copy member runs with: its own, else its Team's.
 * Every reader of such a member's launch uses this, never the Team's value directly.
 */
export const teamMemberLaunchConfiguration = (
  team: Pick<TeamLaunchDto, "default_launch_configuration">,
  member: MemberLaunchDto,
): AgentLaunchConfigurationDto => member.launch_configuration ?? team.default_launch_configuration;

/** The recorded source of such a member's launch: its own, else its Team's; null when not recorded. */
export const teamMemberLaunchSource = (
  team: Pick<TeamLaunchDto, "default_launch_source">,
  member: MemberLaunchDto,
): LaunchConfigurationSourceDto | null => member.launch_source ?? team.default_launch_source ?? null;

/**
 * The user's model choice for one delegated copy: it replaces only the
 * model and its settings. Absent when the user made no choice (every older record).
 */
export type UserLaunchSelectionDto = Readonly<{
  llm_model_identifier: string;
  llm_config: Readonly<Record<string, import("./schema-helpers.js").JsonValue>> | null;
  selected_at: string;
}>;

/**
 * The single launch rule of a copy agent (mirrors the server's
 * `effectiveCopyAgentLaunch`): its own choice, else (when it follows its Team) the Team's choice,
 * else its started launch. `selected` tells which choice applied.
 */
export const teamCopyAgentLaunch = (input: Readonly<{
  started: AgentLaunchConfigurationDto;
  followsTeam?: boolean;
  teamSelection?: UserLaunchSelectionDto | null;
  agentSelection?: UserLaunchSelectionDto | null;
}>): Readonly<{ launch: AgentLaunchConfigurationDto; selected: "agent" | "team" | null }> => {
  const selection = input.agentSelection ?? (input.followsTeam ? input.teamSelection ?? null : null);
  if (!selection) return { launch: input.started, selected: null };
  return {
    launch: { ...input.started, llm_model_identifier: selection.llm_model_identifier, llm_config: selection.llm_config },
    selected: input.agentSelection ? "agent" : "team",
  };
};

/** A recorded Team member follows its Team's launch (and choice) iff it records no own launch. */
export const teamMemberFollowsTeam = (member: MemberLaunchDto): boolean => member.launch_configuration === undefined;

/** The definition snapshot of a task copy started from the catalog (absent for every other copy). */
export type TaskAgentExecutionSourceDto = Readonly<{
  kind: "agent";
  agent_definition_id: string;
  launch_configuration: AgentLaunchConfigurationDto;
  launch_source?: LaunchConfigurationSourceDto;
}>;

export type TaskTeamExecutionSourceDto = Readonly<{
  kind: "agent_team";
  team_definition_id: string;
  coordinator_address: string;
  members: readonly (Readonly<{ address: string; agent_definition_id: string }> & MemberLaunchDto)[];
  handoffs: readonly Readonly<{ from: string; to: string; rules: readonly string[] }>[];
}> & TeamLaunchDto;

/** A delegated child Agent; `delegator_agent_run_id` is the AgentRun that started it (null when not recorded). */
export type TaskAgentExecutionDto = Readonly<{
  kind: "task_agent";
  address: string;
  agent_run_id: string;
  platform_agent_run_id: string | null;
  delegator_agent_run_id: string | null;
  started_at: string;
  source?: TaskAgentExecutionSourceDto;
  user_launch_selection?: UserLaunchSelectionDto;
}>;

export type TaskTeamAgentExecutionDto = Readonly<{
  kind: "task_team_agent";
  address: string;
  agent_run_id: string;
  platform_agent_run_id: string | null;
  user_launch_selection?: UserLaunchSelectionDto;
}>;

/** A delegated child Team; `delegator_agent_run_id` is the AgentRun that started it (null when not recorded). */
export type TaskTeamExecutionDto = Readonly<{
  kind: "task_team";
  address: string;
  team_run_id: string;
  members: readonly TaskTeamAgentExecutionDto[];
  task_executions: readonly TaskExecutionDto[];
  delegator_agent_run_id: string | null;
  started_at: string;
  source?: TaskTeamExecutionSourceDto;
  user_team_launch_selection?: UserLaunchSelectionDto;
}>;

export type TaskExecutionDto = TaskAgentExecutionDto | TaskTeamExecutionDto;

const launchConfigurationSchema: z.ZodType<AgentLaunchConfigurationDto> = z.object({
  runtime_kind: z.enum(["autobyteus", "claude_agent_sdk", "codex_app_server", "antigravity_cli", "grok_build"]),
  llm_model_identifier: nonEmptyStringSchema,
  llm_config: z.record(z.string(), jsonValueSchema).nullable(),
  auto_execute_tools: z.boolean(),
  workspace_root_path: nullableNonEmptyStringSchema,
}).strict();

const launchSourceSchema: z.ZodType<LaunchConfigurationSourceDto> = z.object({
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
export const userLaunchSelectionDtoSchema: z.ZodType<UserLaunchSelectionDto> = z.object({
  llm_model_identifier: nonEmptyStringSchema,
  llm_config: z.record(z.string(), jsonValueSchema).nullable(),
  selected_at: nonEmptyStringSchema,
}).strict();
const agentSelectionSchema = { user_launch_selection: userLaunchSelectionDtoSchema.optional() };
const teamSelectionSchema = { user_team_launch_selection: userLaunchSelectionDtoSchema.optional() };

const handoffDtoSchema = z.object({ from: nonEmptyStringSchema, to: nonEmptyStringSchema, rules: z.array(nonEmptyStringSchema).min(1) }).strict();

const configuredAgentSchema: z.ZodType<ConfiguredAgentExecutionDto> = z.object({
  kind: z.literal("configured_agent"), address: agentTeamAddressDtoSchema,
  agent_definition_id: nonEmptyStringSchema, role: z.string().nullable(), description: z.string().nullable(),
  agent_run_id: nonEmptyStringSchema, platform_agent_run_id: nullableNonEmptyStringSchema,
  launch_configuration: launchConfigurationSchema,
}).strict();

const taskAgentSourceSchema: z.ZodType<TaskAgentExecutionSourceDto> = z.object({
  kind: z.literal("agent"), agent_definition_id: nonEmptyStringSchema, launch_configuration: launchConfigurationSchema,
  launch_source: launchSourceSchema.optional(),
}).strict();

const taskTeamSourceSchema: z.ZodType<TaskTeamExecutionSourceDto> = z.object({
  kind: z.literal("agent_team"), team_definition_id: nonEmptyStringSchema, coordinator_address: agentTeamAddressDtoSchema,
  members: z.array(z.object({
    address: agentTeamAddressDtoSchema, agent_definition_id: nonEmptyStringSchema, ...memberLaunchSchema,
  }).strict()).min(1),
  handoffs: z.array(handoffDtoSchema), default_launch_configuration: launchConfigurationSchema,
  default_launch_source: launchSourceSchema.optional(),
}).strict();

export const taskAgentExecutionDtoSchema: z.ZodType<TaskAgentExecutionDto> = z.object({
  kind: z.literal("task_agent"), address: agentTeamAddressDtoSchema, agent_run_id: nonEmptyStringSchema,
  platform_agent_run_id: nullableNonEmptyStringSchema, delegator_agent_run_id: nullableNonEmptyStringSchema,
  started_at: nonEmptyStringSchema, source: taskAgentSourceSchema.optional(), ...agentSelectionSchema,
}).strict();

const taskTeamAgentSchema: z.ZodType<TaskTeamAgentExecutionDto> = z.object({
  kind: z.literal("task_team_agent"), address: agentTeamAddressDtoSchema,
  agent_run_id: nonEmptyStringSchema, platform_agent_run_id: nullableNonEmptyStringSchema, ...agentSelectionSchema,
}).strict();

export const taskTeamExecutionDtoSchema: z.ZodType<TaskTeamExecutionDto> = z.lazy(() => z.object({
  kind: z.literal("task_team"), address: agentTeamAddressDtoSchema, team_run_id: nonEmptyStringSchema,
  members: z.array(taskTeamAgentSchema),
  task_executions: z.array(z.union([taskAgentExecutionDtoSchema, taskTeamExecutionDtoSchema])),
  delegator_agent_run_id: nullableNonEmptyStringSchema, started_at: nonEmptyStringSchema,
  source: taskTeamSourceSchema.optional(), ...teamSelectionSchema,
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
    members: readonly ConfiguredAgentExecutionDto[];
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
    members: z.array(configuredAgentSchema),
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

export type TeamMemberExecutionIdentityDto = Readonly<z.infer<typeof teamMemberExecutionIdentityDtoSchema>>;
export type TeamAgentStatusDto = Readonly<z.infer<typeof teamAgentStatusDtoSchema>>;
