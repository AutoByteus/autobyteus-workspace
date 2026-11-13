import type { DelegatedRunIdentity } from "./child-run-identity.js";
import { agentOrgLaunchConfigurationDtoSchema, type CollaborationLaunchConfigurationSourceDto, type AgentOrgExecutionTreeDto, type AgentRunCollaborationTreeDto, type CollaborationTaskExecutionDto, type TaskAgentExecutionSourceDto } from "@autobyteus/collaboration-stream-contracts";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { LaunchConfigurationSource } from "../../agent-collaboration/domain/launch-configuration-source.js";
import type { StandaloneRootHost } from "../../standalone-agent-run-root/domain/standalone-root-host.js";
import type { AgentRunMetadata } from "../../run-history/store/agent-run-metadata-types.js";
import type { TeamRunExecutionTreeFile } from "../../agent-team-execution/domain/team-run-execution-tree.js";
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

/**
 * A child row for an agent run this run delegated to (DS-8): its identity (SR-056: from the tree's per-run data) and its
 * launch details, read fresh from its own `run_metadata.json` (a Settings save changes them, SR-039).
 */
export const projectDelegatedAgentRun = (identity: Extract<DelegatedRunIdentity, { kind: "agent" }>, metadata: AgentRunMetadata): CollaborationTaskExecutionDto => ({
  address: identity.address, startedAt: identity.startedAt, ...(identity.delegatorAgentRunId ? { delegatorAgentRunId: identity.delegatorAgentRunId } : {}),
  agentRunId: identity.agentRunId, platformAgentRunId: metadata.platformAgentRunId ?? null,
  source: { kind: "agent", agentDefinitionId: metadata.agentDefinitionId,
    launchConfiguration: projectLaunch({ runtimeKind: metadata.runtimeKind, llmModelIdentifier: metadata.llmModelIdentifier,
      llmConfig: metadata.llmConfig, autoExecuteTools: metadata.autoExecuteTools, workspaceRootPath: metadata.workspaceRootPath }),
    ...projectOptionalSource(metadata, "launchSource") },
});

/** A child row for a team run this run delegated to (DS-8): its identity and its launch details, read fresh from its own file. */
export const projectDelegatedTeamRun = (identity: Extract<DelegatedRunIdentity, { kind: "agent_team" }>, tree: TeamRunExecutionTreeFile): CollaborationTaskExecutionDto => {
  const team = tree.rootTeam;
  const platformRunOf = new Map(team.members.map((member) => [member.agentRunId, member.platformAgentRunId]));
  const sameLaunch = (member: ConfiguredAgentExecutionNode) => JSON.stringify(projectLaunch(member.launchConfiguration)) === JSON.stringify(projectLaunch(team.defaultLaunchConfiguration));
  return {
    address: identity.address, startedAt: identity.startedAt, ...(identity.delegatorAgentRunId ? { delegatorAgentRunId: identity.delegatorAgentRunId } : {}),
    teamRunId: identity.teamRunId,
    members: identity.members.map((member) => ({ address: member.address, agentRunId: member.agentRunId, platformAgentRunId: platformRunOf.get(member.agentRunId) ?? null })),
    taskExecutions: [],
    source: { kind: "agent_team", teamDefinitionId: team.teamDefinitionId, coordinatorAddress: team.coordinatorAddress,
      members: team.members.map((member) => ({ address: member.address, agentDefinitionId: member.agentDefinitionId,
        launchConfiguration: projectLaunch(member.launchConfiguration), followsTeam: sameLaunch(member), ...projectOptionalSource(member, "launchSource") })),
      handoffs: tree.handoffs.map(projectHandoff), defaultLaunchConfiguration: projectLaunch(team.defaultLaunchConfiguration),
      ...projectOptionalSource(team, "defaultLaunchSource") },
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
    // Every new run an Org delegates sits in its root, as at base (`agent-org-task-execution-adapter.ts:115`, rule 3, the
    // characterization of story 5.3); a run it delegated further nests under it. Nothing is hosted.
    taskExecutions: [...delegated],
  },
});
