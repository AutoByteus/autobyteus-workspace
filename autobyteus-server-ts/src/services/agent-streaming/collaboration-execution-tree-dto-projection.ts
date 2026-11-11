import { agentOrgLaunchConfigurationDtoSchema, type CollaborationLaunchConfigurationSourceDto, type AgentOrgExecutionTreeDto, type AgentRunCollaborationTreeDto, type CollaborationTaskExecutionDto, type TaskAgentExecutionSourceDto } from "@autobyteus/collaboration-stream-contracts";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { LaunchConfigurationSource } from "../../agent-collaboration/domain/launch-configuration-source.js";
import type { StandaloneRootHost } from "../../standalone-agent-run-root/domain/standalone-root-host.js";
import type { AgentRunMetadata } from "../../run-history/store/agent-run-metadata-types.js";
import type { TeamRunExecutionTreeFile } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import type { DelegatedChild } from "../../agent-collaboration/delegation/delegation-tree.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../../agent-org-execution/domain/agent-org-run-execution-tree.js";
import type { ConfiguredAgentExecutionNode, ConfiguredExecutionNode } from "../../run-history/domain/run-execution-tree-shared-records.js";

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
const projectConfiguredAgent = (member: ConfiguredAgentExecutionNode) => ({
  address: member.address, agentDefinitionId: member.agentDefinitionId, role: member.role, description: member.description,
  agentRunId: member.agentRunId, platformAgentRunId: member.platformAgentRunId, launchConfiguration: projectLaunch(member.launchConfiguration),
});
const projectConfigured = (member: ConfiguredExecutionNode): AgentOrgExecutionTreeDto["rootOrg"]["members"][number] =>
  "agentRunId" in member ? projectConfiguredAgent(member) : {
    address: member.address, teamDefinitionId: member.teamDefinitionId, role: member.role, description: member.description,
    teamRunId: member.teamRunId, coordinatorAddress: member.coordinatorAddress,
    defaultLaunchConfiguration: projectLaunch(member.defaultLaunchConfiguration), members: member.members.map(projectConfiguredAgent),
    taskExecutions: [],
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

export const projectAgentOrgExecutionTree = (tree: AgentOrgRunExecutionTreeSnapshot, delegated: readonly CollaborationTaskExecutionDto[] = []): AgentOrgExecutionTreeDto => ({
  subjectKind: "agent_org", createdAt: tree.createdAt, archivedAt: tree.archivedAt,
  applicationBinding: tree.applicationBinding === null ? null : {
    applicationId: tree.applicationBinding.applicationId, bindingId: tree.applicationBinding.bindingId,
  },
  handoffs: tree.handoffs.map(projectHandoff),
  rootOrg: {
    address: tree.rootOrg.address, orgDefinitionId: tree.rootOrg.orgDefinitionId, orgDefinitionName: tree.rootOrg.orgDefinitionName,
    orgRunId: tree.rootOrg.orgRunId, defaultLaunchConfiguration: projectLaunch(tree.rootOrg.defaultLaunchConfiguration),
    members: tree.rootOrg.members.map(projectConfigured),
    // DS-8: its child rows are the runs its agents delegated to (one hop); nothing is hosted.
    taskExecutions: [...delegated],
  },
});
