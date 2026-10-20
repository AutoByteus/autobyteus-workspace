import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { LaunchConfigurationSource } from "../../agent-collaboration/domain/launch-configuration-source.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";

export type IsoTimestamp = string;

/**
 * The user's model choice for one delegated copy (DEC-005): it replaces
 * only the model and its settings; the runtime, tool approval and workspace stay as started.
 * Recorded beside the started values, never over them, so extra and teammate copies still start
 * on the started values (AR-005).
 */
export type UserLaunchSelection = Readonly<{
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
  selectedAt: IsoTimestamp;
}>;

/** Optional on an agent-level copy record; absent truthfully means no user choice. */
export type RecordedUserLaunchSelection = Readonly<{ userLaunchSelection?: UserLaunchSelection }>;

/** Optional on a team-level copy record; followers of the team resolve to it. */
export type RecordedUserTeamLaunchSelection = Readonly<{ userTeamLaunchSelection?: UserLaunchSelection }>;

export type ConfiguredAgentExecutionNode = Readonly<{
  address: AgentTeamAddress;
  agentDefinitionId: string;
  role: string | null;
  description: string | null;
  agentRunId: string;
  platformAgentRunId: string | null;
  launchConfiguration: AgentLaunchConfiguration;
}>;

export type ConfiguredTeamExecutionNode = Readonly<{
  address: AgentTeamAddress;
  teamDefinitionId: string;
  role: string | null;
  description: string | null;
  teamRunId: string;
  coordinatorAddress: AgentTeamAddress;
  defaultLaunchConfiguration: AgentLaunchConfiguration;
  members: readonly ConfiguredAgentExecutionNode[];
  taskExecutions: readonly TaskExecution[];
}>;

export type ConfiguredExecutionNode = ConfiguredAgentExecutionNode | ConfiguredTeamExecutionNode;

/**
 * One member of a Team copy (D-5): `launchConfiguration` is the complete launch it started with, and
 * `followsTeam` says whether a Team-level user selection reaches it. `launchSource` is display provenance
 * only: present when the member's agent definition had a default (used or skipped), else the Team's
 * applies (`effectiveMemberLaunchSource`); it never decides the launch or the following.
 */
export type RecordedMemberLaunch = Readonly<{
  launchConfiguration: AgentLaunchConfiguration;
  followsTeam: boolean;
  launchSource?: LaunchConfigurationSource;
}>;

/** A recorded Team's own resolved launch; `defaultLaunchSource` is absent on records written before sources existed. */
export type RecordedTeamLaunch = Readonly<{
  defaultLaunchConfiguration: AgentLaunchConfiguration;
  defaultLaunchSource?: LaunchConfigurationSource;
}>;

/**
 * The snapshot a delegated copy runs with: its definition and the launch it started with, taken from the
 * catalog or from a configured placement of the coordinating run when it started, so it restores from its
 * own file alone. `launchSource` is absent on records written before sources existed ("not recorded").
 */
export type TaskAgentExecutionSource = Readonly<{
  kind: "agent";
  agentDefinitionId: string;
  launchConfiguration: AgentLaunchConfiguration;
  launchSource?: LaunchConfigurationSource;
}>;

export type TaskTeamExecutionSourceMember = Readonly<{ address: AgentTeamAddress; agentDefinitionId: string }> & RecordedMemberLaunch;

/**
 * The Team counterpart: its layout (mounted at the copy's address), the handoff rules of its members
 * (every rule starts at a member; it may lead to the coordinating run) and its settings.
 */
export type TaskTeamExecutionSource = Readonly<{
  kind: "agent_team";
  teamDefinitionId: string;
  coordinatorAddress: AgentTeamAddress;
  members: readonly TaskTeamExecutionSourceMember[];
  handoffs: readonly CollaborationHandoff[];
}> & RecordedTeamLaunch;

export type TaskExecutionSource = TaskAgentExecutionSource | TaskTeamExecutionSource;

/**
 * A delegated child Agent. Liveness (live / shut down) is runtime-only and never persisted.
 * `delegatorAgentRunId` is written for every new child; children recorded before it existed have none.
 * `source` is what the copy runs with (its snapshot); the configured placement at its address never is.
 */
export type TaskAgentExecution = Readonly<{
  address: AgentTeamAddress;
  agentRunId: string;
  platformAgentRunId: string | null;
  delegatorAgentRunId?: string;
  startedAt: IsoTimestamp;
  source: TaskAgentExecutionSource;
}> & RecordedUserLaunchSelection;

export type TaskTeamAgentExecution = Readonly<{
  address: AgentTeamAddress;
  agentRunId: string;
  platformAgentRunId: string | null;
}> & RecordedUserLaunchSelection;

/**
 * A delegated child Team. Teams are flat: its members are agents. Liveness is runtime-only;
 * `delegatorAgentRunId` and `source` as on `TaskAgentExecution`.
 */
export type TaskTeamExecution = Readonly<{
  address: AgentTeamAddress;
  teamRunId: string;
  members: readonly TaskTeamAgentExecution[];
  taskExecutions: readonly TaskExecution[];
  delegatorAgentRunId?: string;
  startedAt: IsoTimestamp;
  source: TaskTeamExecutionSource;
}> & RecordedUserTeamLaunchSelection;

export type TaskExecution = TaskAgentExecution | TaskTeamExecution;

export type TeamRunApplicationBinding = Readonly<{
  applicationId: string;
  bindingId: string;
}>;

export const isConfiguredAgentExecution = (
  value: ConfiguredExecutionNode,
): value is ConfiguredAgentExecutionNode => "agentRunId" in value;

export const isConfiguredTeamExecution = (
  value: ConfiguredExecutionNode,
): value is ConfiguredTeamExecutionNode => "teamRunId" in value;

export const isTaskAgentExecution = (value: TaskExecution): value is TaskAgentExecution =>
  "agentRunId" in value;

export const isTaskTeamExecution = (value: TaskExecution): value is TaskTeamExecution =>
  "teamRunId" in value;

export type EffectiveCopyAgentLaunch = Readonly<{
  launch: AgentLaunchConfiguration;
  /** Which user selection decided the model: the agent's own, its Team's, or none (started value). */
  selected: "agent" | "team" | null;
}>;

/**
 * The single launch rule of a delegated copy agent (DS-003): its own user
 * selection, else (when it follows its Team) the Team's user selection, else its started launch.
 * A selection replaces only the model and its settings. Every restore, hosting and view site uses
 * this; none combines selections and started values inline.
 */
export const effectiveCopyAgentLaunch = (input: Readonly<{
  started: AgentLaunchConfiguration;
  followsTeam?: boolean;
  teamSelection?: UserLaunchSelection | null;
  agentSelection?: UserLaunchSelection | null;
}>): EffectiveCopyAgentLaunch => {
  const team = input.followsTeam && input.teamSelection ? input.teamSelection : null;
  const selection = input.agentSelection ?? team;
  if (!selection) return Object.freeze({ launch: input.started, selected: null });
  return Object.freeze({
    launch: Object.freeze({
      ...input.started,
      llmModelIdentifier: selection.llmModelIdentifier,
      llmConfig: selection.llmConfig === null ? null : structuredClone(selection.llmConfig),
    }),
    selected: input.agentSelection ? "agent" : "team",
  });
};

/** The recorded source of a Team member's launch: its own, else the Team's; null when not recorded. */
export const effectiveMemberLaunchSource = (
  team: Pick<RecordedTeamLaunch, "defaultLaunchSource">,
  member: Pick<RecordedMemberLaunch, "launchSource">,
): LaunchConfigurationSource | null => member.launchSource ?? team.defaultLaunchSource ?? null;
