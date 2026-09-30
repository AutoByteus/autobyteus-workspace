import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";

export type IsoTimestamp = string;

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
 * A delegated child Agent. Liveness (live / shut down) is runtime-only and never persisted.
 * `delegatorAgentRunId` is written for every new child; children recorded before it existed have none.
 */
export type TaskAgentExecution = Readonly<{
  address: AgentTeamAddress;
  agentRunId: string;
  platformAgentRunId: string | null;
  delegatorAgentRunId?: string;
  startedAt: IsoTimestamp;
}>;

export type TaskTeamAgentExecution = Readonly<{
  address: AgentTeamAddress;
  agentRunId: string;
  platformAgentRunId: string | null;
}>;

export type TaskTeamNestedTeamExecution = Readonly<{
  address: AgentTeamAddress;
  teamRunId: string;
  members: readonly TaskTeamMemberExecution[];
  taskExecutions: readonly TaskExecution[];
}>;

export type TaskTeamMemberExecution = TaskTeamAgentExecution | TaskTeamNestedTeamExecution;

/** A delegated child Team. Liveness is runtime-only; `delegatorAgentRunId` as on `TaskAgentExecution`. */
export type TaskTeamExecution = Readonly<{
  address: AgentTeamAddress;
  teamRunId: string;
  members: readonly TaskTeamMemberExecution[];
  taskExecutions: readonly TaskExecution[];
  delegatorAgentRunId?: string;
  startedAt: IsoTimestamp;
}>;

export type TaskExecution = TaskAgentExecution | TaskTeamExecution;

/**
 * A collaborator of a run: a root-level record that makes one shared Agent definition
 * delegable in that run, with a snapshot of the run's root launch settings. It has no run
 * of its own; its runs are the task executions at its address.
 * `addedViaAgentRunId` is the focused agent whose user message carried the mention.
 */
export type CollaboratorAgentEntry = Readonly<{
  kind: "agent";
  address: AgentTeamAddress;
  agentDefinitionId: string;
  launchConfiguration: AgentLaunchConfiguration;
  addedAt: IsoTimestamp;
  addedViaAgentRunId: string;
}>;

/** Layout only: the Team's members share its `defaultLaunchConfiguration`. */
export type CollaboratorTeamMember = Readonly<{
  address: AgentTeamAddress;
  agentDefinitionId: string;
}>;

/** A collaborator Agent Team: its layout and rebased Team-local handoffs, snapshotted when added. */
export type CollaboratorTeamEntry = Readonly<{
  kind: "agent_team";
  address: AgentTeamAddress;
  teamDefinitionId: string;
  coordinatorAddress: AgentTeamAddress;
  members: readonly CollaboratorTeamMember[];
  handoffs: readonly CollaborationHandoff[];
  defaultLaunchConfiguration: AgentLaunchConfiguration;
  addedAt: IsoTimestamp;
  addedViaAgentRunId: string;
}>;

export type CollaboratorEntry = CollaboratorAgentEntry | CollaboratorTeamEntry;

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

export const isTaskTeamAgentExecution = (
  value: TaskTeamMemberExecution,
): value is TaskTeamAgentExecution => "agentRunId" in value;

export const isTaskTeamNestedTeamExecution = (
  value: TaskTeamMemberExecution,
): value is TaskTeamNestedTeamExecution => "teamRunId" in value;
