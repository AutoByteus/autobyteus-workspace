import type { CollaborationTaskExecutionDto, CollaborationLaunchConfigurationSourceDto } from "@autobyteus/collaboration-stream-contracts";
import {
  parseTeamStreamServerMessage,
  type AgentLaunchConfigurationDto,
  type ConfiguredAgentExecutionDto,
  type LaunchConfigurationSourceDto,
  type TaskExecutionDto,
  type TaskTeamAgentExecutionDto,
  type TeamCommunicationMessageDto,
  type TeamReferenceFileDto,
  type TeamRunExecutionTreeDto,
  type TeamStreamServerMessage,
  type TeamTaskExecutionReferenceDto,
  type UserLaunchSelectionDto,
} from "@autobyteus/team-stream-contracts";
import type { RootTeamRun, RootTeamRunPackageSnapshot } from "../../agent-team-execution/domain/root-team-run.js";
import type { RecordedMemberLaunch, UserLaunchSelection } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { LaunchConfigurationSource } from "../../agent-collaboration/domain/launch-configuration-source.js";
import type {
  ConfiguredExecutionNode,
  TaskExecution,
  TaskTeamAgentExecution,
  TeamRunExecutionTreeSnapshot,
} from "../../agent-team-execution/domain/team-run-execution-tree.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../agent-team-execution/domain/team-run-event.js";
import { findTeamTaskExecution } from "../../agent-team-execution/domain/team-task-execution-lookup.js";
import type { SequencedRootEvent } from "../../agent-team-execution/services/team-run-event-publisher.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import { projectTeamAgentEventMessage } from "./team-agent-event-websocket-projector.js";
import { projectTeamAgentStatusSnapshotDto } from "./team-agent-status-websocket-projector.js";
import { projectTeamReferenceFile } from "../../agent-team-execution/services/team-reference-file-projection.js";
import { projectTeamRemoteEvent } from "./team-remote-event-projector.js";
import type { RemoteTaskExecutionDto } from "@autobyteus/agent-presentation-contracts";

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
  { snapshot, baseChangeSequence, liveSequenceId, lastMessageChangeSequence }: Readonly<{
    snapshot: RootTeamRunPackageSnapshot; baseChangeSequence: number; liveSequenceId: string; lastMessageChangeSequence: number;
  }>,
  /** autobyteus-278: the runs this Team delegated to other nodes, with their nodes' names. */
  remoteTaskExecutions: readonly RemoteTaskExecutionDto[],
  /** autobyteus-461 DS-8: the runs on this node it delegated to (`delegatedChildrenDtos`). */
  delegated: readonly CollaborationTaskExecutionDto[] = [],
): TeamStreamServerMessage => parseTeamStreamServerMessage({
  type: "TEAM_EXECUTION_VIEW_SNAPSHOT",
  payload: {
    root_team_run_id: rootTeamRunId,
    base_change_sequence: baseChangeSequence,
    live_sequence_id: liveSequenceId,
    last_message_change_sequence: lastMessageChangeSequence,
    execution_tree: projectExecutionTree(snapshot.tree, delegated),
    closed_task_executions: snapshot.closedTaskExecutions.map(projectTaskExecutionReference),
    agent_statuses: snapshot.statuses.map(projectTeamAgentStatusSnapshotDto),
    agent_input_states: snapshot.inputStates,
    remote_task_executions: remoteTaskExecutions,
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
    case TeamRunEventSourceType.TASK_EXECUTIONS_CLOSED:
      return parseTeamStreamServerMessage({ type: "TASK_EXECUTIONS_CLOSED", payload: {
        change_sequence: changeSequence,
        task_executions: event.taskExecutions.map(projectTaskExecutionReference),
      } });
    case TeamRunEventSourceType.TASK_EXECUTIONS_REOPENED:
      // Each record as the loaded tree held it after the add-back (D-8): a view that does not hold it inserts it.
      return parseTeamStreamServerMessage({ type: "TASK_EXECUTIONS_REOPENED", payload: {
        change_sequence: changeSequence,
        executions: event.executions.map(({ parentTeamRunId, execution }) => ({
          parent_team_run_id: parentTeamRunId, execution: projectTaskExecution(execution) })),
      } });
    case TeamRunEventSourceType.REMOTE:
      return projectTeamRemoteEvent(event.event, changeSequence);
    case TeamRunEventSourceType.DELEGATED_LAUNCH_SELECTIONS:
      return parseTeamStreamServerMessage({ type: "DELEGATED_LAUNCH_SELECTIONS_CHANGED", payload: {
        change_sequence: changeSequence,
        selections: event.selections.map(({ reference, selection }) => ({
          ...projectTaskExecutionReference(reference),
          ...optionalSelection("selection", selection),
        })),
      } });
  }
};

const projectTaskExecutionReference = (reference: TaskExecutionReference): TeamTaskExecutionReferenceDto =>
  "agentRunId" in reference ? { agent_run_id: reference.agentRunId } : { team_run_id: reference.teamRunId };

const projectCommunicationMessage = (
  message: CollaborationCommunicationMessage,
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
  const located = findTeamTaskExecution(root.getExecutionTreeSnapshot(), reference);
  if (!located) throw new Error("Started task execution is not in the current execution tree.");
  return parseTeamStreamServerMessage({ type: "TASK_EXECUTION_STARTED", payload: {
    change_sequence: changeSequence,
    parent_team_run_id: located.parentTeamRunId,
    execution: projectTaskExecution(located.execution),
  } });
};

export const projectExecutionTree = (tree: TeamRunExecutionTreeSnapshot, delegated: readonly CollaborationTaskExecutionDto[] = []): TeamRunExecutionTreeDto => ({
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
    // DS-8: its child rows are the runs it delegated to; nothing is hosted.
    task_executions: delegated.map(teamTaskExecutionOf),
  },
});

const sourceOf = (source: CollaborationLaunchConfigurationSourceDto | undefined): LaunchConfigurationSourceDto | undefined => {
  if (!source) return undefined;
  const fallbacks = source.fallbacks.map((fallback) => ({ layer: fallback.layer, runtime_kind: fallback.runtimeKind,
    llm_model_identifier: fallback.llmModelIdentifier, reason: fallback.reason, detail: fallback.detail }));
  return source.origin === "model_router"
    ? { origin: source.origin, fallbacks, choice_reason: source.choiceReason, task_kind: source.taskKind } as LaunchConfigurationSourceDto
    : { origin: source.origin, fallbacks } as LaunchConfigurationSourceDto;
};
const launchOf = (launch: Readonly<{ runtimeKind: string; llmModelIdentifier: string; llmConfig: unknown; autoExecuteTools: boolean;
  workspaceRootPath: string | null }>): AgentLaunchConfigurationDto => ({
  runtime_kind: launch.runtimeKind as AgentLaunchConfigurationDto["runtime_kind"], llm_model_identifier: launch.llmModelIdentifier,
  llm_config: launch.llmConfig as Record<string, import("@autobyteus/team-stream-contracts").JsonValue> | null,
  auto_execute_tools: launch.autoExecuteTools, workspace_root_path: launch.workspaceRootPath,
});
/** A child row of the team view, from the shared child-row DTO (the team stream's snake-case shape). */
const teamTaskExecutionOf = (child: CollaborationTaskExecutionDto): TaskExecutionDto => {
  if ("agentRunId" in child) {
    const source = child.source as Extract<CollaborationTaskExecutionDto, { agentRunId: string }>["source"];
    const launchSource = sourceOf(source.launchSource);
    return { kind: "task_agent", address: child.address, agent_run_id: child.agentRunId, platform_agent_run_id: child.platformAgentRunId,
      delegator_agent_run_id: child.delegatorAgentRunId ?? null, started_at: child.startedAt,
      source: { kind: "agent", agent_definition_id: source.agentDefinitionId, launch_configuration: launchOf(source.launchConfiguration),
        ...(launchSource ? { launch_source: launchSource } : {}) } };
  }
  const source = child.source;
  return { kind: "task_team", address: child.address, team_run_id: child.teamRunId,
    members: child.members.map((member) => ({ kind: "task_team_agent", address: member.address, agent_run_id: member.agentRunId, platform_agent_run_id: member.platformAgentRunId })),
    task_executions: [], delegator_agent_run_id: child.delegatorAgentRunId ?? null, started_at: child.startedAt,
    source: { kind: "agent_team", team_definition_id: source.teamDefinitionId, coordinator_address: source.coordinatorAddress,
      members: source.members.map((member) => {
        const memberSource = sourceOf(member.launchSource);
        return { address: member.address, agent_definition_id: member.agentDefinitionId, launch_configuration: launchOf(member.launchConfiguration),
          follows_team: member.followsTeam, ...(memberSource ? { launch_source: memberSource } : {}) };
      }),
      handoffs: source.handoffs.map((handoff) => ({ from: handoff.from, to: handoff.to, rules: [...handoff.rules] })),
      default_launch_configuration: launchOf(source.defaultLaunchConfiguration) } } as TaskExecutionDto;
};

const projectLaunchSource = (source: LaunchConfigurationSource): LaunchConfigurationSourceDto => {
  const fallbacks = source.fallbacks.map((fallback) => ({
    layer: fallback.layer, runtime_kind: fallback.runtimeKind, llm_model_identifier: fallback.llmModelIdentifier,
    reason: fallback.reason, detail: fallback.detail,
  }));
  return source.origin === "model_router"
    ? { origin: source.origin, fallbacks, choice_reason: source.choiceReason, task_kind: source.taskKind }
    : { origin: source.origin, fallbacks };
};
/** A Team copy member's complete launch and follower fact; its own launch source only when recorded. */
const projectMemberLaunch = (member: RecordedMemberLaunch) => ({
  launch_configuration: projectLaunchConfiguration(member.launchConfiguration),
  follows_team: member.followsTeam,
  ...optionalSource("launch_source", member.launchSource),
});
/** A user model choice, emitted only when recorded. */
const optionalSelection = <K extends "user_launch_selection" | "user_team_launch_selection" | "selection">(key: K, selection: UserLaunchSelection | undefined) =>
  (selection ? { [key]: {
    ...(selection.runtimeKind === undefined ? {} : { runtime_kind: selection.runtimeKind }),
    llm_model_identifier: selection.llmModelIdentifier,
    llm_config: selection.llmConfig as Record<string, import("@autobyteus/team-stream-contracts").JsonValue> | null,
    selected_at: selection.selectedAt,
  } } : {}) as Partial<Record<K, UserLaunchSelectionDto>>;
const optionalSource = <K extends string>(key: K, source: LaunchConfigurationSource | undefined) =>
  (source ? { [key]: projectLaunchSource(source) } : {}) as Partial<Record<K, LaunchConfigurationSourceDto>>;

const projectConfiguredMember = (member: ConfiguredExecutionNode): ConfiguredAgentExecutionDto => {
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
    source: {
      kind: "agent", agent_definition_id: execution.source.agentDefinitionId,
      launch_configuration: projectLaunchConfiguration(execution.source.launchConfiguration),
      ...optionalSource("launch_source", execution.source.launchSource),
    },
    ...optionalSelection("user_launch_selection", execution.userLaunchSelection),
  };
  return {
    kind: "task_team", address: execution.address, team_run_id: execution.teamRunId,
    members: execution.members.map(projectTaskTeamMember),
    task_executions: execution.taskExecutions.map(projectTaskExecution),
    delegator_agent_run_id: execution.delegatorAgentRunId ?? null, started_at: execution.startedAt,
    source: {
      kind: "agent_team", team_definition_id: execution.source.teamDefinitionId,
      coordinator_address: execution.source.coordinatorAddress,
      members: execution.source.members.map((member) => ({
        address: member.address, agent_definition_id: member.agentDefinitionId, ...projectMemberLaunch(member),
      })),
      handoffs: execution.source.handoffs.map((handoff) => ({ from: handoff.from, to: handoff.to, rules: [...handoff.rules] })),
      default_launch_configuration: projectLaunchConfiguration(execution.source.defaultLaunchConfiguration),
      ...optionalSource("default_launch_source", execution.source.defaultLaunchSource),
    },
    ...optionalSelection("user_team_launch_selection", execution.userTeamLaunchSelection),
  };
};

const projectTaskTeamMember = (member: TaskTeamAgentExecution): TaskTeamAgentExecutionDto => ({
  kind: "task_team_agent", address: member.address, agent_run_id: member.agentRunId,
  platform_agent_run_id: member.platformAgentRunId,
  ...optionalSelection("user_launch_selection", member.userLaunchSelection),
});
