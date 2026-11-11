import {
  agentOrgLaunchConfigurationDtoSchema,
  userLaunchSelectionDtoSchema,
  type UserLaunchSelectionDto,
  type CollaborationLaunchConfigurationSourceDto,
  type AgentOrgExecutionTreeDto,
  type AgentRunCollaborationTreeDto,
  type CollaborationTaskExecutionDto,
  type TaskAgentExecutionSourceDto,
  type TaskTeamExecutionSourceDto,
} from "@autobyteus/collaboration-stream-contracts";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { DelegatedLaunchSelectionRecord } from "../../agent-collaboration/domain/delegated-launch-selection.js";
import type { LaunchConfigurationSource } from "../../agent-collaboration/domain/launch-configuration-source.js";
import type { StandaloneRootHost } from "../../standalone-agent-run-root/domain/standalone-root-host.js";
import type { AgentRunMetadata } from "../../run-history/store/agent-run-metadata-types.js";
import type { TeamRunExecutionTreeFile } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import type { DelegatedChild } from "../../agent-collaboration/delegation/delegation-tree.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../../agent-org-execution/domain/agent-org-run-execution-tree.js";
import type {
  ConfiguredAgentExecutionNode, ConfiguredExecutionNode,
  RecordedMemberLaunch, TaskExecution, TaskTeamAgentExecution, UserLaunchSelection,
} from "../../run-history/domain/run-execution-tree-shared-records.js";

type TaskTeamDto = Extract<CollaborationTaskExecutionDto, { teamRunId: string }>;

// Agent/Org camel-case wire ownership only. Internal-only tree facts remain in
// the current tree; every public concrete child is projected, never filtered.
const projectLaunch = (value: AgentLaunchConfiguration): TaskAgentExecutionSourceDto["launchConfiguration"] =>
  agentOrgLaunchConfigurationDtoSchema.parse({
    runtimeKind: value.runtimeKind, llmModelIdentifier: value.llmModelIdentifier,
    llmConfig: value.llmConfig, autoExecuteTools: value.autoExecuteTools,
    workspaceRootPath: value.workspaceRootPath,
  });
const projectHandoff = ({ from, to, rules }: CollaborationHandoff) => ({ from, to, rules: [...rules] });
const projectSource = (value: LaunchConfigurationSource): CollaborationLaunchConfigurationSourceDto => {
  const fallbacks = value.fallbacks.map(({ layer, runtimeKind, llmModelIdentifier, reason, detail }) =>
    ({ layer, runtimeKind, llmModelIdentifier, reason, detail }));
  return value.origin === "model_router"
    ? { origin: value.origin, fallbacks, choiceReason: value.choiceReason, taskKind: value.taskKind }
    : { origin: value.origin, fallbacks };
};
/** An optional launch source, emitted only when recorded. */
const projectOptionalSource = <K extends "launchSource" | "defaultLaunchSource">(
  value: Partial<Record<K, LaunchConfigurationSource>>,
  sourceKey: K,
) => (value[sourceKey] ? { [sourceKey]: projectSource(value[sourceKey]!) } : {}) as Partial<Record<K, CollaborationLaunchConfigurationSourceDto>>;
/** A Team copy member's complete launch and follower fact; its own launch source only when recorded. */
const projectMemberLaunch = (member: RecordedMemberLaunch) => ({
  launchConfiguration: projectLaunch(member.launchConfiguration),
  followsTeam: member.followsTeam,
  ...projectOptionalSource(member, "launchSource"),
});
/** A user model choice, emitted only when recorded. */
const projectSelection = <K extends "userLaunchSelection" | "userTeamLaunchSelection">(key: K, selection: UserLaunchSelection | undefined) =>
  (selection ? { [key]: projectUserLaunchSelection(selection) } : {}) as Partial<Record<K, UserLaunchSelectionDto>>;

/** A choice on the wire: its agent runtime only when the user chose one (the pending switch is not on the wire). */
const projectUserLaunchSelection = (selection: UserLaunchSelection): UserLaunchSelectionDto => userLaunchSelectionDtoSchema.parse({
  ...(selection.runtimeKind === undefined ? {} : { runtimeKind: selection.runtimeKind }),
  llmModelIdentifier: selection.llmModelIdentifier, llmConfig: selection.llmConfig, selectedAt: selection.selectedAt,
});

/** A live Save's committed choices (DS-001): each record by its run ID, with its choice as now recorded. */
export const projectCollaborationSelectionsChanged = (records: readonly DelegatedLaunchSelectionRecord[]) => ({
  kind: "delegated_launch_selections_changed" as const,
  selections: records.map(({ reference, selection }) => ({ ...reference, selection: projectUserLaunchSelection(selection) })),
});

const projectTaskMember = (member: TaskTeamAgentExecution): TaskTeamDto["members"][number] => ({
  address: member.address, agentRunId: member.agentRunId, platformAgentRunId: member.platformAgentRunId,
  ...projectSelection("userLaunchSelection", member.userLaunchSelection),
});

export const projectCollaborationTaskExecution = (execution: TaskExecution): CollaborationTaskExecutionDto => {
  const identity = {
    address: execution.address, startedAt: execution.startedAt,
    ...(execution.delegatorAgentRunId === undefined ? {} : { delegatorAgentRunId: execution.delegatorAgentRunId }),
  };
  if ("agentRunId" in execution) {
    const source: TaskAgentExecutionSourceDto = {
      kind: "agent", agentDefinitionId: execution.source.agentDefinitionId,
      launchConfiguration: projectLaunch(execution.source.launchConfiguration),
      ...projectOptionalSource(execution.source, "launchSource"),
    };
    return { ...identity, agentRunId: execution.agentRunId, platformAgentRunId: execution.platformAgentRunId,
      source, ...projectSelection("userLaunchSelection", execution.userLaunchSelection) };
  }
  const source: TaskTeamExecutionSourceDto = {
    kind: "agent_team", teamDefinitionId: execution.source.teamDefinitionId,
    coordinatorAddress: execution.source.coordinatorAddress,
    members: execution.source.members.map((member) =>
      ({ address: member.address, agentDefinitionId: member.agentDefinitionId, ...projectMemberLaunch(member) })),
    handoffs: execution.source.handoffs.map(projectHandoff),
    defaultLaunchConfiguration: projectLaunch(execution.source.defaultLaunchConfiguration),
    ...projectOptionalSource(execution.source, "defaultLaunchSource"),
  };
  return { ...identity, teamRunId: execution.teamRunId, members: execution.members.map(projectTaskMember),
    taskExecutions: execution.taskExecutions.map(projectCollaborationTaskExecution), source,
    ...projectSelection("userTeamLaunchSelection", execution.userTeamLaunchSelection) };
};

const projectConfiguredAgent = (member: ConfiguredAgentExecutionNode) => ({
  address: member.address, agentDefinitionId: member.agentDefinitionId, role: member.role, description: member.description,
  agentRunId: member.agentRunId, platformAgentRunId: member.platformAgentRunId, launchConfiguration: projectLaunch(member.launchConfiguration),
});
const projectConfigured = (member: ConfiguredExecutionNode): AgentOrgExecutionTreeDto["rootOrg"]["members"][number] =>
  "agentRunId" in member ? projectConfiguredAgent(member) : {
    address: member.address, teamDefinitionId: member.teamDefinitionId, role: member.role, description: member.description,
    teamRunId: member.teamRunId, coordinatorAddress: member.coordinatorAddress,
    defaultLaunchConfiguration: projectLaunch(member.defaultLaunchConfiguration), members: member.members.map(projectConfiguredAgent),
    taskExecutions: member.taskExecutions.map(projectCollaborationTaskExecution),
  };

/** A standalone run's view tree: its own agent and its child rows (the runs it delegated to, DS-8). */
export const projectAgentCollaborationTree = (input: Readonly<{
  host: StandaloneRootHost; createdAt: string; taskExecutions: readonly CollaborationTaskExecutionDto[];
}>): AgentRunCollaborationTreeDto => ({
  subjectKind: "agent", createdAt: input.createdAt,
  host: { address: input.host.address, agentRunId: input.host.agentRunId, agentDefinitionId: input.host.agentDefinitionId },
  taskExecutions: [...input.taskExecutions],
});

/** A child row for a run this run delegated to (DS-8): an agent run, from its own `run_metadata.json`. */
export const projectDelegatedAgentRun = (child: DelegatedChild, metadata: AgentRunMetadata): CollaborationTaskExecutionDto => ({
  address: (metadata.address ?? child.recipientAddress) as never, startedAt: child.linkedAt, delegatorAgentRunId: child.delegatorAgentRunId,
  agentRunId: metadata.runId, platformAgentRunId: metadata.platformAgentRunId ?? null,
  source: { kind: "agent", agentDefinitionId: metadata.agentDefinitionId,
    launchConfiguration: projectLaunch({ runtimeKind: metadata.runtimeKind, llmModelIdentifier: metadata.llmModelIdentifier,
      llmConfig: metadata.llmConfig, autoExecuteTools: metadata.autoExecuteTools, workspaceRootPath: metadata.workspaceRootPath }),
    ...projectOptionalSource(metadata, "launchSource") },
});

/** A child row for a team run this run delegated to (DS-8), from its own file; its members at their own addresses. */
export const projectDelegatedTeamRun = (child: DelegatedChild, tree: TeamRunExecutionTreeFile): CollaborationTaskExecutionDto => {
  const team = tree.rootTeam;
  const sameLaunch = (member: ConfiguredAgentExecutionNode) => JSON.stringify(projectLaunch(member.launchConfiguration)) === JSON.stringify(projectLaunch(team.defaultLaunchConfiguration));
  return {
    address: child.recipientAddress as never, startedAt: child.linkedAt, delegatorAgentRunId: child.delegatorAgentRunId, teamRunId: team.teamRunId,
    members: team.members.map((member) => ({ address: member.address, agentRunId: member.agentRunId, platformAgentRunId: member.platformAgentRunId })),
    taskExecutions: [],
    source: { kind: "agent_team", teamDefinitionId: team.teamDefinitionId, coordinatorAddress: team.coordinatorAddress,
      members: team.members.map((member) => ({ address: member.address, agentDefinitionId: member.agentDefinitionId,
        launchConfiguration: projectLaunch(member.launchConfiguration), followsTeam: sameLaunch(member), ...projectOptionalSource(member, "launchSource") })),
      handoffs: tree.handoffs.map(projectHandoff), defaultLaunchConfiguration: projectLaunch(team.defaultLaunchConfiguration) },
  };
};

export const projectAgentOrgExecutionTree = (tree: AgentOrgRunExecutionTreeSnapshot): AgentOrgExecutionTreeDto => ({
  subjectKind: "agent_org", createdAt: tree.createdAt, archivedAt: tree.archivedAt,
  applicationBinding: tree.applicationBinding === null ? null : {
    applicationId: tree.applicationBinding.applicationId, bindingId: tree.applicationBinding.bindingId,
  },
  handoffs: tree.handoffs.map(projectHandoff),
  rootOrg: {
    address: tree.rootOrg.address, orgDefinitionId: tree.rootOrg.orgDefinitionId, orgDefinitionName: tree.rootOrg.orgDefinitionName,
    orgRunId: tree.rootOrg.orgRunId, defaultLaunchConfiguration: projectLaunch(tree.rootOrg.defaultLaunchConfiguration),
    members: tree.rootOrg.members.map(projectConfigured),
    taskExecutions: tree.rootOrg.taskExecutions.map(projectCollaborationTaskExecution),
  },
});
