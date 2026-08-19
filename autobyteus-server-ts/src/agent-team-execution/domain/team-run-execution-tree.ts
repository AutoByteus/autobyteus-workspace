import type { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";

export type IsoTimestamp = string;

/** Exact persisted V1 runtime labels used by the normative TeamRun package. */
export type TeamRunRuntimeKind = "AUTOBYTEUS" | "CLAUDE" | "CODEX";

export const toTeamRunRuntimeKind = (
  runtimeKind: RuntimeKind,
): TeamRunRuntimeKind => {
  switch (runtimeKind) {
    case RuntimeKind.AUTOBYTEUS:
      return "AUTOBYTEUS";
    case RuntimeKind.CLAUDE_AGENT_SDK:
      return "CLAUDE";
    case RuntimeKind.CODEX_APP_SERVER:
      return "CODEX";
  }
};

export const fromTeamRunRuntimeKind = (
  runtimeKind: TeamRunRuntimeKind,
): RuntimeKind => {
  switch (runtimeKind) {
    case "AUTOBYTEUS":
      return RuntimeKind.AUTOBYTEUS;
    case "CLAUDE":
      return RuntimeKind.CLAUDE_AGENT_SDK;
    case "CODEX":
      return RuntimeKind.CODEX_APP_SERVER;
  }
};

export type AgentLaunchConfiguration = Readonly<{
  runtimeKind: TeamRunRuntimeKind;
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
  autoExecuteTools: boolean;
  skillAccessMode: SkillAccessMode;
  workspaceRootPath: string | null;
}>;

export type ConfiguredAgentExecution = Readonly<{
  address: AgentTeamAddress;
  agentDefinitionId: string;
  role: string | null;
  description: string | null;
  agentRunId: string;
  platformAgentRunId: string | null;
  launchConfiguration: AgentLaunchConfiguration;
}>;

export type ConfiguredTeamExecution = Readonly<{
  address: AgentTeamAddress;
  teamDefinitionId: string;
  role: string | null;
  description: string | null;
  teamRunId: string;
  coordinatorAddress: AgentTeamAddress;
  members: readonly ConfiguredMemberExecution[];
  taskExecutions: readonly TaskExecution[];
}>;

export type ConfiguredMemberExecution =
  | ConfiguredAgentExecution
  | ConfiguredTeamExecution;

export type TaskAgentExecution = Readonly<{
  address: AgentTeamAddress;
  agentRunId: string;
  platformAgentRunId: string | null;
  startedAt: IsoTimestamp;
  settledAt: IsoTimestamp | null;
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

export type TaskTeamMemberExecution =
  | TaskTeamAgentExecution
  | TaskTeamNestedTeamExecution;

export type TaskTeamExecution = Readonly<{
  address: AgentTeamAddress;
  teamRunId: string;
  members: readonly TaskTeamMemberExecution[];
  taskExecutions: readonly TaskExecution[];
  startedAt: IsoTimestamp;
  settledAt: IsoTimestamp | null;
}>;

export type TaskExecution = TaskAgentExecution | TaskTeamExecution;

export type RootConfiguredTeamExecution = Readonly<{
  teamDefinitionId: string;
  teamDefinitionName: string;
  teamRunId: string;
  coordinatorAddress: AgentTeamAddress;
  members: readonly ConfiguredMemberExecution[];
  taskExecutions: readonly TaskExecution[];
}>;

export type TeamRunApplicationBinding = Readonly<{
  applicationId: string;
  bindingId: string;
}>;

export type TeamRunExecutionTreeFileV1 = Readonly<{
  schemaVersion: 1;
  createdAt: IsoTimestamp;
  archivedAt: IsoTimestamp | null;
  applicationBinding: TeamRunApplicationBinding | null;
  handoffs: readonly CollaborationHandoff[];
  rootTeam: RootConfiguredTeamExecution;
}>;

export type TeamRunExecutionTreeSnapshot = TeamRunExecutionTreeFileV1;

export const isConfiguredAgentExecution = (
  value: ConfiguredMemberExecution,
): value is ConfiguredAgentExecution => "agentRunId" in value;

export const isConfiguredTeamExecution = (
  value: ConfiguredMemberExecution,
): value is ConfiguredTeamExecution => "teamRunId" in value;

export const isTaskAgentExecution = (
  value: TaskExecution,
): value is TaskAgentExecution => "agentRunId" in value;

export const isTaskTeamExecution = (
  value: TaskExecution,
): value is TaskTeamExecution => "teamRunId" in value;

export const isTaskTeamAgentExecution = (
  value: TaskTeamMemberExecution,
): value is TaskTeamAgentExecution => "agentRunId" in value;

export const isTaskTeamNestedTeamExecution = (
  value: TaskTeamMemberExecution,
): value is TaskTeamNestedTeamExecution => "teamRunId" in value;
