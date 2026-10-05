import {
  agentOrgLaunchConfigurationDtoSchema,
  type AgentOrgExecutionTreeDto,
  type AgentRunCollaborationTreeDto,
  type CollaborationTaskExecutionDto,
  type CollaboratorEntryDto,
  type TaskAgentExecutionSourceDto,
  type TaskTeamExecutionSourceDto,
} from "@autobyteus/collaboration-stream-contracts";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { AgentRunCollaborationTreeSnapshot } from "../../agent-run-collaboration/domain/agent-run-collaboration-tree.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../../agent-org-execution/domain/agent-org-run-execution-tree.js";
import type {
  CollaboratorEntry, ConfiguredAgentExecutionNode, ConfiguredExecutionNode,
  TaskExecution, TaskTeamMemberExecution,
} from "../../run-history/domain/run-execution-tree-shared-records.js";

type TaskTeamDto = Extract<CollaborationTaskExecutionDto, { teamRunId: string }>;

// Agent/Org camel-case wire ownership only. Internal lifetime stamps remain in
// the current tree; every public concrete child is projected, never filtered.
const projectLaunch = (value: AgentLaunchConfiguration): TaskAgentExecutionSourceDto["launchConfiguration"] =>
  agentOrgLaunchConfigurationDtoSchema.parse({
    runtimeKind: value.runtimeKind, llmModelIdentifier: value.llmModelIdentifier,
    llmConfig: value.llmConfig, autoExecuteTools: value.autoExecuteTools,
    workspaceRootPath: value.workspaceRootPath,
  });
const projectHandoff = ({ from, to, rules }: CollaborationHandoff) => ({ from, to, rules: [...rules] });

const projectTaskMember = (member: TaskTeamMemberExecution): TaskTeamDto["members"][number] =>
  "agentRunId" in member
    ? { address: member.address, agentRunId: member.agentRunId, platformAgentRunId: member.platformAgentRunId }
    : { address: member.address, teamRunId: member.teamRunId,
        members: member.members.map(projectTaskMember), taskExecutions: member.taskExecutions.map(projectCollaborationTaskExecution) };

export const projectCollaborationTaskExecution = (execution: TaskExecution): CollaborationTaskExecutionDto => {
  const identity = {
    address: execution.address, startedAt: execution.startedAt,
    ...(execution.delegatorAgentRunId === undefined ? {} : { delegatorAgentRunId: execution.delegatorAgentRunId }),
  };
  if ("agentRunId" in execution) {
    const source: TaskAgentExecutionSourceDto | undefined = execution.source && {
      kind: "agent", agentDefinitionId: execution.source.agentDefinitionId,
      launchConfiguration: projectLaunch(execution.source.launchConfiguration),
    };
    return { ...identity, agentRunId: execution.agentRunId, platformAgentRunId: execution.platformAgentRunId,
      ...(source === undefined ? {} : { source }) };
  }
  const source: TaskTeamExecutionSourceDto | undefined = execution.source && {
    kind: "agent_team", teamDefinitionId: execution.source.teamDefinitionId,
    coordinatorAddress: execution.source.coordinatorAddress,
    members: execution.source.members.map(({ address, agentDefinitionId }) => ({ address, agentDefinitionId })),
    handoffs: execution.source.handoffs.map(projectHandoff),
    defaultLaunchConfiguration: projectLaunch(execution.source.defaultLaunchConfiguration),
  };
  return { ...identity, teamRunId: execution.teamRunId, members: execution.members.map(projectTaskMember),
    taskExecutions: execution.taskExecutions.map(projectCollaborationTaskExecution), ...(source === undefined ? {} : { source }) };
};

export const projectCollaborationCollaborator = (entry: CollaboratorEntry): CollaboratorEntryDto => {
  const identity = { address: entry.address, addedAt: entry.addedAt, addedViaAgentRunId: entry.addedViaAgentRunId };
  if (entry.kind === "agent") return {
    ...identity, kind: "agent", agentDefinitionId: entry.agentDefinitionId, agentRunId: entry.agentRunId,
    platformAgentRunId: entry.platformAgentRunId, launchConfiguration: projectLaunch(entry.launchConfiguration),
  };
  return {
    ...identity, kind: "agent_team", teamDefinitionId: entry.teamDefinitionId, teamRunId: entry.teamRunId,
    coordinatorAddress: entry.coordinatorAddress,
    members: entry.members.map(({ address, agentDefinitionId, agentRunId, platformAgentRunId }) =>
      ({ address, agentDefinitionId, agentRunId, platformAgentRunId })),
    handoffs: entry.handoffs.map(projectHandoff), defaultLaunchConfiguration: projectLaunch(entry.defaultLaunchConfiguration),
    taskExecutions: entry.taskExecutions.map(projectCollaborationTaskExecution),
  };
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

export const projectAgentCollaborationTree = (tree: AgentRunCollaborationTreeSnapshot): AgentRunCollaborationTreeDto => ({
  subjectKind: "agent", createdAt: tree.createdAt,
  host: { address: tree.host.address, agentRunId: tree.host.agentRunId, agentDefinitionId: tree.host.agentDefinitionId },
  collaborators: tree.collaborators.map(projectCollaborationCollaborator),
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
    members: tree.rootOrg.members.map(projectConfigured), collaborators: tree.rootOrg.collaborators.map(projectCollaborationCollaborator),
    taskExecutions: tree.rootOrg.taskExecutions.map(projectCollaborationTaskExecution),
  },
});
