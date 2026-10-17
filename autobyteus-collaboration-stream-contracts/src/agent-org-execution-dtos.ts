import { agentInputStateSchema, compactionRecoveryBlockSchema } from "@autobyteus/agent-presentation-contracts";
import { z } from "zod";
import {
  agentAddressSchema,
  agentPresentationMessageSchema,
  jsonValueSchema,
  nonEmptyStringSchema,
} from "@autobyteus/agent-presentation-contracts";

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

type LaunchConfigurationDto = Readonly<z.infer<typeof agentOrgLaunchConfigurationDtoSchema>>;

/**
 * Where an agent's (or a Team's) launch values came from and the configured layers skipped before
 * it. Absent on records written before sources existed ("not recorded").
 */
export const collaborationLaunchConfigurationSourceDtoSchema = z.object({
  origin: z.enum(["agent_default", "team_default", "inherited"]),
  fallbacks: z.array(z.object({
    layer: z.enum(["agent_default", "team_default"]),
    runtimeKind: nullableText,
    llmModelIdentifier: nullableText,
    reason: z.enum(["incomplete", "runtime_unavailable", "model_unavailable", "model_settings_invalid"]),
    detail: nonEmptyStringSchema,
  }).strict()),
}).strict();
export type CollaborationLaunchConfigurationSourceDto = Readonly<z.infer<typeof collaborationLaunchConfigurationSourceDtoSchema>>;

/** A recorded Team member's own launch: present only when it runs on its own agent default. */
type MemberLaunchDto = Readonly<{
  launchConfiguration?: LaunchConfigurationDto;
  launchSource?: CollaborationLaunchConfigurationSourceDto;
}>;
type TeamLaunchDto = Readonly<{
  defaultLaunchConfiguration: LaunchConfigurationDto;
  defaultLaunchSource?: CollaborationLaunchConfigurationSourceDto;
}>;

/**
 * The launch a catalog-Team-copy member runs with: its own, else its Team's.
 * Every reader of such a member's launch uses this, never the Team's value directly.
 */
export const collaborationMemberLaunchConfiguration = (
  team: Pick<TeamLaunchDto, "defaultLaunchConfiguration">,
  member: MemberLaunchDto,
): LaunchConfigurationDto => member.launchConfiguration ?? team.defaultLaunchConfiguration;

/** The recorded source of such a member's launch: its own, else its Team's; null when not recorded. */
export const collaborationMemberLaunchSource = (
  team: Pick<TeamLaunchDto, "defaultLaunchSource">,
  member: MemberLaunchDto,
): CollaborationLaunchConfigurationSourceDto | null => member.launchSource ?? team.defaultLaunchSource ?? null;

/**
 * The user's model choice for one delegated copy: it replaces only the
 * model and its settings. Absent when the user made no choice (every older record).
 */
export const userLaunchSelectionDtoSchema = z.object({
  llmModelIdentifier: nonEmptyStringSchema,
  llmConfig: z.record(z.string(), jsonValueSchema).nullable(),
  selectedAt: timestamp,
}).strict();
export type UserLaunchSelectionDto = Readonly<z.infer<typeof userLaunchSelectionDtoSchema>>;

/**
 * The single launch rule of a copy agent (mirrors the server's
 * `effectiveCopyAgentLaunch`): its own choice, else (when it follows its Team) the Team's choice,
 * else its started launch. `selected` tells which choice applied.
 */
export const collaborationCopyAgentLaunch = (input: Readonly<{
  started: LaunchConfigurationDto;
  followsTeam?: boolean;
  teamSelection?: UserLaunchSelectionDto | null;
  agentSelection?: UserLaunchSelectionDto | null;
}>): Readonly<{ launch: LaunchConfigurationDto; selected: "agent" | "team" | null }> => {
  const selection = input.agentSelection ?? (input.followsTeam ? input.teamSelection ?? null : null);
  if (!selection) return { launch: input.started, selected: null };
  return {
    launch: { ...input.started, llmModelIdentifier: selection.llmModelIdentifier, llmConfig: selection.llmConfig },
    selected: input.agentSelection ? "agent" : "team",
  };
};

/** A recorded Team member follows its Team's launch (and choice) iff it records no own launch. */
export const collaborationMemberFollowsTeam = (member: MemberLaunchDto): boolean => member.launchConfiguration === undefined;

/** The definition snapshot of a task copy started from the catalog (absent for every other copy). */
export type TaskAgentExecutionSourceDto = Readonly<{
  kind: "agent";
  agentDefinitionId: string;
  launchConfiguration: LaunchConfigurationDto;
  launchSource?: CollaborationLaunchConfigurationSourceDto;
}>;
export type TaskTeamExecutionSourceDto = Readonly<{
  kind: "agent_team";
  teamDefinitionId: string;
  coordinatorAddress: string;
  members: readonly (Readonly<{ address: string; agentDefinitionId: string }> & MemberLaunchDto)[];
  handoffs: readonly Readonly<{ from: string; to: string; rules: readonly string[] }>[];
}> & TeamLaunchDto;
type TaskAgentExecutionDto = Readonly<{
  address: string;
  agentRunId: string;
  platformAgentRunId: string | null;
  /** Absent for children recorded before the delegator was stored. */
  delegatorAgentRunId?: string;
  startedAt: string;
  source?: TaskAgentExecutionSourceDto;
  userLaunchSelection?: UserLaunchSelectionDto;
}>;
type TaskTeamAgentExecutionDto = Readonly<{
  address: string;
  agentRunId: string;
  platformAgentRunId: string | null;
  userLaunchSelection?: UserLaunchSelectionDto;
}>;
type TaskTeamExecutionDto = Readonly<{
  address: string;
  teamRunId: string;
  members: readonly TaskTeamAgentExecutionDto[];
  taskExecutions: readonly TaskExecutionDto[];
  /** Absent for children recorded before the delegator was stored. */
  delegatorAgentRunId?: string;
  startedAt: string;
  source?: TaskTeamExecutionSourceDto;
  userTeamLaunchSelection?: UserLaunchSelectionDto;
}>;
type TaskExecutionDto = TaskAgentExecutionDto | TaskTeamExecutionDto;

const handoff = z.object({ from: agentAddressSchema, to: agentAddressSchema, rules: z.array(nonEmptyStringSchema).min(1) }).strict();
const launchSource = collaborationLaunchConfigurationSourceDtoSchema.optional();
const memberLaunch = { launchConfiguration: agentOrgLaunchConfigurationDtoSchema.optional(), launchSource };
const agentSelection = { userLaunchSelection: userLaunchSelectionDtoSchema.optional() };
const teamSelection = { userTeamLaunchSelection: userLaunchSelectionDtoSchema.optional() };
const taskAgentSource: z.ZodType<TaskAgentExecutionSourceDto> = z.object({
  kind: z.literal("agent"), agentDefinitionId: nonEmptyStringSchema, launchConfiguration: agentOrgLaunchConfigurationDtoSchema,
  launchSource,
}).strict();
const taskTeamSource: z.ZodType<TaskTeamExecutionSourceDto> = z.object({
  kind: z.literal("agent_team"), teamDefinitionId: nonEmptyStringSchema, coordinatorAddress: agentAddressSchema,
  members: z.array(z.object({ address: agentAddressSchema, agentDefinitionId: nonEmptyStringSchema, ...memberLaunch }).strict()).min(1),
  handoffs: z.array(handoff), defaultLaunchConfiguration: agentOrgLaunchConfigurationDtoSchema,
  defaultLaunchSource: launchSource,
}).strict();
const taskAgent: z.ZodType<TaskAgentExecutionDto> = z.object({
  address: agentAddressSchema, agentRunId: nonEmptyStringSchema, platformAgentRunId: nullableText,
  delegatorAgentRunId: nonEmptyStringSchema.optional(), startedAt: timestamp, source: taskAgentSource.optional(), ...agentSelection,
}).strict();
const taskTeamMember: z.ZodType<TaskTeamAgentExecutionDto> = z.object({
  address: agentAddressSchema, agentRunId: nonEmptyStringSchema, platformAgentRunId: nullableText, ...agentSelection,
}).strict();
const taskTeam: z.ZodType<TaskTeamExecutionDto> = z.lazy(() => z.object({
  address: agentAddressSchema, teamRunId: nonEmptyStringSchema, members: z.array(taskTeamMember),
  taskExecutions: z.array(taskExecution), delegatorAgentRunId: nonEmptyStringSchema.optional(), startedAt: timestamp,
  source: taskTeamSource.optional(), ...teamSelection,
}).strict());
const taskExecution: z.ZodType<TaskExecutionDto> = z.lazy(() => z.union([taskAgent, taskTeam]));
/** Shared by every collaboration root view (Org and Agent roots). */
export const taskExecutionDtoSchema = taskExecution;
export type CollaborationTaskExecutionDto = TaskExecutionDto;

/** Identity of one task execution node (a task Agent or a task Team) of a root's execution tree. */
export const taskExecutionReferenceDtoSchema = z.union([
  z.object({ agentRunId: nonEmptyStringSchema }).strict(),
  z.object({ teamRunId: nonEmptyStringSchema }).strict(),
]);
export type TaskExecutionReferenceDto = Readonly<z.infer<typeof taskExecutionReferenceDtoSchema>>;
/** Task executions whose Task is DONE: the tree keeps them, the Workspaces listing leaves them out. */
export const closedTaskExecutionsDtoSchema = z.array(taskExecutionReferenceDtoSchema);
/** Live: these task executions of the root were closed (their Task became DONE). */
export const taskExecutionsClosedEventDtoSchema = z.object({
  kind: z.literal("task_executions_closed"), task_executions: z.array(taskExecutionReferenceDtoSchema).min(1),
}).strict();
/** Live: these closed task executions were reactivated by their assigner; the listing shows them again. */
export const taskExecutionsReopenedEventDtoSchema = z.object({
  kind: z.literal("task_executions_reopened"), task_executions: z.array(taskExecutionReferenceDtoSchema).min(1),
}).strict();
/**
 * Live: the user's model choices of these delegated copies were saved (DS-001).
 * Each names one record by its run ID (unique in the tree) with its choice as now recorded.
 */
export const delegatedLaunchSelectionsChangedEventDtoSchema = z.object({
  kind: z.literal("delegated_launch_selections_changed"),
  selections: z.array(z.union([
    z.object({ agentRunId: nonEmptyStringSchema, selection: userLaunchSelectionDtoSchema }).strict(),
    z.object({ teamRunId: nonEmptyStringSchema, selection: userLaunchSelectionDtoSchema }).strict(),
  ])).min(1),
}).strict();
export type DelegatedLaunchSelectionsChangedEventDto = Readonly<z.infer<typeof delegatedLaunchSelectionsChangedEventDtoSchema>>;

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


export const agentOrgExecutionTreeDtoSchema = z.object({
  subjectKind: z.literal("agent_org"), createdAt: timestamp,
  archivedAt: timestamp.nullable(),
  applicationBinding: z.object({ applicationId: nonEmptyStringSchema, bindingId: nonEmptyStringSchema }).strict().nullable(),
  handoffs: z.array(handoff),
  rootOrg: z.object({
    address: z.literal("/"), orgDefinitionId: nonEmptyStringSchema, orgDefinitionName: nonEmptyStringSchema,
    orgRunId: nonEmptyStringSchema, defaultLaunchConfiguration: agentOrgLaunchConfigurationDtoSchema,
    members: z.array(z.union([configuredAgent, configuredTeam])),
    taskExecutions: z.array(taskExecution),
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
  closed_task_executions: closedTaskExecutionsDtoSchema,
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
  taskExecutionsClosedEventDtoSchema,
  taskExecutionsReopenedEventDtoSchema,
  delegatedLaunchSelectionsChangedEventDtoSchema,
]);

export type AgentOrgExecutionTreeDto = Readonly<z.infer<typeof agentOrgExecutionTreeDtoSchema>>;
export type AgentOrgExecutionViewDto = Readonly<z.infer<typeof agentOrgExecutionViewDtoSchema>>;
export type AgentOrgExecutionEventDto = Readonly<z.infer<typeof agentOrgExecutionEventDtoSchema>>;
export type AgentOrgCommunicationMessageDto = Readonly<z.infer<typeof agentOrgCommunicationMessageDtoSchema>>;
