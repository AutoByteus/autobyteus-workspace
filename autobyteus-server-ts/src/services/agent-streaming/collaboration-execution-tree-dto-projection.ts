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
import type { StandaloneRootTreeSnapshot } from "../../standalone-agent-run-root/domain/standalone-root-tree.js";
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
const projectSource = (value: LaunchConfigurationSource): CollaborationLaunchConfigurationSourceDto => ({
  origin: value.origin,
  fallbacks: value.fallbacks.map(({ layer, runtimeKind, llmModelIdentifier, reason, detail }) =>
    ({ layer, runtimeKind, llmModelIdentifier, reason, detail })),
});
/** Optional launch fields, emitted only when recorded. */
const projectOptionalLaunch = <K extends "launchSource" | "defaultLaunchSource">(
  value: Readonly<{ launchConfiguration?: AgentLaunchConfiguration }> & Partial<Record<K, LaunchConfigurationSource>>,
  sourceKey: K,
  includeLaunch: boolean,
) => ({
  ...(includeLaunch && value.launchConfiguration ? { launchConfiguration: projectLaunch(value.launchConfiguration) } : {}),
  ...(value[sourceKey] ? { [sourceKey]: projectSource(value[sourceKey]!) } : {}),
});
const projectMemberLaunch = (member: RecordedMemberLaunch) => projectOptionalLaunch(member, "launchSource", true);
/** A user model choice, emitted only when recorded. */
const projectSelection = <K extends "userLaunchSelection" | "userTeamLaunchSelection">(key: K, selection: UserLaunchSelection | undefined) =>
  (selection ? { [key]: userLaunchSelectionDtoSchema.parse({
    llmModelIdentifier: selection.llmModelIdentifier, llmConfig: selection.llmConfig, selectedAt: selection.selectedAt,
  }) } : {}) as Partial<Record<K, UserLaunchSelectionDto>>;

/** A live Save's committed choices (DS-001): each record by its run ID, with its choice as now recorded. */
export const projectCollaborationSelectionsChanged = (records: readonly DelegatedLaunchSelectionRecord[]) => ({
  kind: "delegated_launch_selections_changed" as const,
  selections: records.map(({ reference, selection }) => ({ ...reference, selection: userLaunchSelectionDtoSchema.parse({
    llmModelIdentifier: selection.llmModelIdentifier, llmConfig: selection.llmConfig, selectedAt: selection.selectedAt,
  }) })),
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
    const source: TaskAgentExecutionSourceDto | undefined = execution.source && {
      kind: "agent", agentDefinitionId: execution.source.agentDefinitionId,
      launchConfiguration: projectLaunch(execution.source.launchConfiguration),
      ...projectOptionalLaunch(execution.source, "launchSource", false),
    };
    return { ...identity, agentRunId: execution.agentRunId, platformAgentRunId: execution.platformAgentRunId,
      ...(source === undefined ? {} : { source }), ...projectSelection("userLaunchSelection", execution.userLaunchSelection) };
  }
  const source: TaskTeamExecutionSourceDto | undefined = execution.source && {
    kind: "agent_team", teamDefinitionId: execution.source.teamDefinitionId,
    coordinatorAddress: execution.source.coordinatorAddress,
    members: execution.source.members.map((member) =>
      ({ address: member.address, agentDefinitionId: member.agentDefinitionId, ...projectMemberLaunch(member) })),
    handoffs: execution.source.handoffs.map(projectHandoff),
    defaultLaunchConfiguration: projectLaunch(execution.source.defaultLaunchConfiguration),
    ...projectOptionalLaunch(execution.source, "defaultLaunchSource", false),
  };
  return { ...identity, teamRunId: execution.teamRunId, members: execution.members.map(projectTaskMember),
    taskExecutions: execution.taskExecutions.map(projectCollaborationTaskExecution), ...(source === undefined ? {} : { source }),
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

export const projectAgentCollaborationTree = (tree: StandaloneRootTreeSnapshot): AgentRunCollaborationTreeDto => ({
  subjectKind: "agent", createdAt: tree.createdAt,
  host: { address: tree.host.address, agentRunId: tree.host.agentRunId, agentDefinitionId: tree.host.agentDefinitionId },
  taskExecutions: tree.taskExecutions.map(projectCollaborationTaskExecution),
});

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
