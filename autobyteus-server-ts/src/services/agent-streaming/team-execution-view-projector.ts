import {
  parseTeamStreamServerMessage,
  type AgentLaunchConfigurationDto,
  type CollaboratorEntryDto,
  type ConfiguredMemberExecutionDto,
  type TaskExecutionDto,
  type TaskTeamMemberExecutionDto,
  type TeamCommunicationMessageDto,
  type TeamReferenceFileDto,
  type TeamRunExecutionTreeDto,
  type TeamStreamServerMessage,
} from "@autobyteus/team-stream-contracts";
import type { RootTeamRun, RootTeamRunPackageSnapshot } from "../../agent-team-execution/domain/root-team-run.js";
import type {
  CollaboratorEntry,
  ConfiguredExecutionNode,
  RootConfiguredTeamExecutionNode,
  TaskExecution,
  TaskTeamExecution,
  TaskTeamMemberExecution,
  TaskTeamNestedTeamExecution,
  TeamRunExecutionTreeSnapshot,
} from "../../agent-team-execution/domain/team-run-execution-tree.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../agent-team-execution/domain/team-run-event.js";
import type { SequencedRootEvent } from "../../agent-team-execution/services/team-run-event-publisher.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { TeamCommunicationMessageV1 } from "../../services/team-communication/team-communication-v1-types.js";
import { projectTeamAgentEventMessage } from "./team-agent-event-websocket-projector.js";
import { projectTeamAgentStatusSnapshotDto } from "./team-agent-status-websocket-projector.js";
import { projectTeamReferenceFile } from "../../agent-team-execution/services/team-reference-file-projection.js";

const projectReference = (ownerId: string, filePath: string, timestamp: string): TeamReferenceFileDto => {
  const reference = projectTeamReferenceFile(ownerId, filePath, timestamp);
  return {
    reference_id: reference.referenceId,
    path: reference.path,
    type: reference.type,
    created_at: reference.createdAt,
    updated_at: reference.updatedAt,
  };
};

export const projectTeamExecutionViewSnapshot = (
  rootTeamRunId: string,
  snapshot: RootTeamRunPackageSnapshot,
  baseChangeSequence: number,
): TeamStreamServerMessage => parseTeamStreamServerMessage({
  type: "TEAM_EXECUTION_VIEW_SNAPSHOT",
  payload: {
    root_team_run_id: rootTeamRunId,
    base_change_sequence: baseChangeSequence,
    execution_tree: projectExecutionTree(snapshot.tree),
    messages: snapshot.messages.messages.map(projectCommunicationMessage),
    agent_statuses: snapshot.statuses.map(projectTeamAgentStatusSnapshotDto),
  },
});

export const projectSequencedTeamRunEvent = (
  root: RootTeamRun,
  sequenced: SequencedRootEvent<TeamRunEvent>,
): TeamStreamServerMessage => {
  const { event, changeSequence } = sequenced;
  switch (event.eventSourceType) {
    case TeamRunEventSourceType.AGENT:
      return projectTeamAgentEventMessage(event.execution, event.payload, changeSequence);
    case TeamRunEventSourceType.COMMUNICATION:
      return parseTeamStreamServerMessage({ type: "TEAM_COMMUNICATION_MESSAGE", payload: {
        change_sequence: changeSequence,
        message: projectCommunicationMessage(event.payload),
      } });
    case TeamRunEventSourceType.MEMBER_INPUT:
      return parseTeamStreamServerMessage({ type: "MEMBER_INPUT_MESSAGE", payload: {
        change_sequence: changeSequence,
        recipient_agent_run_id: event.payload.recipientAgentRunId,
        message_id: event.payload.messageId,
        dedupe_key: event.payload.dedupeKey,
        content: event.payload.content,
        input_origin: event.payload.inputOrigin,
        received_at: event.payload.receivedAt,
        context_file_paths: event.payload.contextFilePaths.map((file) => ({ path: file.path, type: file.type })),
        sender_agent_run_id: event.payload.senderAgentRunId,
        parent_communication_message_id: event.payload.parentCommunicationMessageId,
      } });
    case TeamRunEventSourceType.TASK_EXECUTION:
      return projectTaskExecutionStarted(root, event.taskExecution, changeSequence);
    case TeamRunEventSourceType.COLLABORATOR:
      return parseTeamStreamServerMessage({ type: "COLLABORATOR_ADDED", payload: {
        change_sequence: changeSequence,
        collaborator: projectCollaboratorEntry(event.payload.collaborator),
      } });
  }
};

export const projectCommunicationMessage = (
  message: TeamCommunicationMessageV1,
): TeamCommunicationMessageDto => ({
  message_id: message.messageId,
  sender_agent_run_id: message.senderAgentRunId,
  receiver_agent_run_id: message.receiverAgentRunId,
  content: message.content,
  message_type: message.messageType,
  reference_files: message.referenceFiles.map((file) => projectReference(message.messageId, file, message.createdAt)),
  created_at: message.createdAt,
});

const projectTaskExecutionStarted = (
  root: RootTeamRun,
  reference: TaskExecutionReference,
  changeSequence: number,
): TeamStreamServerMessage => {
  const located = findTaskExecution(root.getExecutionTreeSnapshot(), reference);
  if (!located) throw new Error("Started task execution is not in the current execution tree.");
  return parseTeamStreamServerMessage({ type: "TASK_EXECUTION_STARTED", payload: {
    change_sequence: changeSequence,
    parent_team_run_id: located.parentTeamRunId,
    execution: projectTaskExecution(located.execution),
  } });
};

export const projectExecutionTree = (tree: TeamRunExecutionTreeSnapshot): TeamRunExecutionTreeDto => ({
  created_at: tree.createdAt,
  archived_at: tree.archivedAt,
  application_binding: tree.applicationBinding ? {
    application_id: tree.applicationBinding.applicationId,
    binding_id: tree.applicationBinding.bindingId,
  } : null,
  handoffs: tree.handoffs.map((handoff) => ({ from: handoff.from, to: handoff.to, rules: [...handoff.rules] })),
  root_team: {
    address: "/",
    team_definition_id: tree.rootTeam.teamDefinitionId,
    team_definition_name: tree.rootTeam.teamDefinitionName,
    team_run_id: tree.rootTeam.teamRunId,
    coordinator_address: tree.rootTeam.coordinatorAddress,
    default_launch_configuration: projectLaunchConfiguration(tree.rootTeam.defaultLaunchConfiguration),
    members: tree.rootTeam.members.map(projectConfiguredMember),
    collaborators: tree.rootTeam.collaborators.map(projectCollaboratorEntry),
    task_executions: tree.rootTeam.taskExecutions.map(projectTaskExecution),
  },
});

export const projectCollaboratorEntry = (entry: CollaboratorEntry): CollaboratorEntryDto => entry.kind === "agent"
  ? {
      kind: "agent", address: entry.address, agent_definition_id: entry.agentDefinitionId,
      launch_configuration: projectLaunchConfiguration(entry.launchConfiguration),
      added_at: entry.addedAt, added_via_agent_run_id: entry.addedViaAgentRunId,
    }
  : {
      kind: "agent_team", address: entry.address, team_definition_id: entry.teamDefinitionId,
      coordinator_address: entry.coordinatorAddress,
      members: entry.members.map((member) => ({ address: member.address, agent_definition_id: member.agentDefinitionId })),
      handoffs: entry.handoffs.map((handoff) => ({ from: handoff.from, to: handoff.to, rules: [...handoff.rules] })),
      default_launch_configuration: projectLaunchConfiguration(entry.defaultLaunchConfiguration),
      added_at: entry.addedAt, added_via_agent_run_id: entry.addedViaAgentRunId,
    };

const projectConfiguredMember = (member: ConfiguredExecutionNode): ConfiguredMemberExecutionDto => {
  return {
    kind: "configured_agent", address: member.address, agent_definition_id: member.agentDefinitionId,
    role: member.role, description: member.description, agent_run_id: member.agentRunId,
    platform_agent_run_id: member.platformAgentRunId,
    launch_configuration: projectLaunchConfiguration(member.launchConfiguration),
  };
};

const projectLaunchConfiguration = (
  configuration: import("../../agent-team-execution/domain/team-run-config.js").AgentLaunchConfiguration,
): AgentLaunchConfigurationDto => ({
  runtime_kind: configuration.runtimeKind,
  llm_model_identifier: configuration.llmModelIdentifier,
  llm_config: configuration.llmConfig as Record<string, import("@autobyteus/team-stream-contracts").JsonValue> | null,
  auto_execute_tools: configuration.autoExecuteTools,
  workspace_root_path: configuration.workspaceRootPath,
});

const projectTaskExecution = (execution: TaskExecution): TaskExecutionDto => {
  if ("agentRunId" in execution) return {
    kind: "task_agent", address: execution.address, agent_run_id: execution.agentRunId,
    platform_agent_run_id: execution.platformAgentRunId,
    delegator_agent_run_id: execution.delegatorAgentRunId ?? null, started_at: execution.startedAt,
  };
  return {
    kind: "task_team", address: execution.address, team_run_id: execution.teamRunId,
    members: execution.members.map(projectTaskTeamMember),
    task_executions: execution.taskExecutions.map(projectTaskExecution),
    delegator_agent_run_id: execution.delegatorAgentRunId ?? null, started_at: execution.startedAt,
  };
};

const projectTaskTeamMember = (member: TaskTeamMemberExecution): TaskTeamMemberExecutionDto => {
  if ("agentRunId" in member) return {
    kind: "task_team_agent", address: member.address, agent_run_id: member.agentRunId,
    platform_agent_run_id: member.platformAgentRunId,
  };
  return projectNestedTaskTeam(member);
};

const projectNestedTaskTeam = (team: TaskTeamNestedTeamExecution): TaskTeamMemberExecutionDto => ({
  kind: "task_team_member", address: team.address, team_run_id: team.teamRunId,
  members: team.members.map(projectTaskTeamMember),
  task_executions: team.taskExecutions.map(projectTaskExecution),
});

const findTaskExecution = (
  tree: TeamRunExecutionTreeSnapshot,
  reference: TaskExecutionReference,
): { parentTeamRunId: string; execution: TaskExecution } | null => {
  const visit = (
    team: RootConfiguredTeamExecutionNode | TaskTeamExecution | TaskTeamNestedTeamExecution,
  ): { parentTeamRunId: string; execution: TaskExecution } | null => {
    const own = team.taskExecutions.find((execution) =>
      "agentRunId" in reference
        ? "agentRunId" in execution && execution.agentRunId === reference.agentRunId
        : "teamRunId" in execution && execution.teamRunId === reference.teamRunId);
    if (own) return { parentTeamRunId: team.teamRunId, execution: own };
    if (!("teamDefinitionName" in team)) for (const member of team.members) {
      if (!("teamRunId" in member)) continue;
      const nested = visit(member);
      if (nested) return nested;
    }
    for (const task of team.taskExecutions) {
      if ("teamRunId" in task) {
        const nested = visit(task);
        if (nested) return nested;
      }
    }
    return null;
  };
  return visit(tree.rootTeam);
};
