import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { PendingRuntimeSwitch } from "../store/agent-run-metadata-types.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { LaunchConfigurationSource } from "../../agent-collaboration/domain/launch-configuration-source.js";
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
  /** How its launch was resolved, when recorded (a delegated team's member, TC-12). */
  launchSource?: LaunchConfigurationSource;
}> & Readonly<{ pendingRuntimeSwitch?: PendingRuntimeSwitch }>;

export type ConfiguredTeamExecutionNode = Readonly<{
  address: AgentTeamAddress;
  teamDefinitionId: string;
  role: string | null;
  description: string | null;
  teamRunId: string;
  coordinatorAddress: AgentTeamAddress;
  defaultLaunchConfiguration: AgentLaunchConfiguration;
  members: readonly ConfiguredAgentExecutionNode[];
}>;

export type ConfiguredExecutionNode = ConfiguredAgentExecutionNode | ConfiguredTeamExecutionNode;

/**
 * One member of a delegated Team's source (D-5): `launchConfiguration` is the complete launch it starts with, and
 * `followsTeam` says whether it took the Team's launch. `launchSource` is display provenance
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

/** The snapshot with one folder for the whole copy: an Agent's launch; a Team's default and every member's. */
export const sourceInFolder = <TSource extends TaskExecutionSource>(source: TSource, workspaceRootPath: string): TSource => {
  const inFolder = (launch: AgentLaunchConfiguration): AgentLaunchConfiguration => Object.freeze({ ...launch, workspaceRootPath });
  return (source.kind === "agent"
    ? Object.freeze({ ...source, launchConfiguration: inFolder(source.launchConfiguration) })
    : Object.freeze({ ...source, defaultLaunchConfiguration: inFolder(source.defaultLaunchConfiguration),
      members: Object.freeze(source.members.map((member) => Object.freeze({ ...member, launchConfiguration: inFolder(member.launchConfiguration) }))) })) as TSource;
};

/**
 * One agent's launch on a peer node as the peer resolved it (autobyteus-32 REQ-009): its address there (mounted at the
 * catalog address), runtime, model and source (with the Model Router's reason and task kind when it chose).
 */
export type RemoteAgentLaunch = Readonly<{
  address: string;
  runtimeKind: string;
  llmModelIdentifier: string;
  source: LaunchConfigurationSource;
}>;

/** One member of a Team run on a peer node: its address in the Team and the run ID the peer gave it. */
export type RemoteTeamMember = Readonly<{ address: AgentTeamAddress; agentRunId: string }>;

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
