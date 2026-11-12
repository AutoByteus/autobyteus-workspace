import type { CollaborationTaskExecutionDto, CollaborationLaunchConfigurationSourceDto } from "@autobyteus/collaboration-stream-contracts";
import { parseTeamStreamServerMessage, type AgentLaunchConfigurationDto, type ConfiguredAgentExecutionDto, type LaunchConfigurationSourceDto, type TaskExecutionDto, type TeamCommunicationMessageDto, type TeamReferenceFileDto, type TeamRunExecutionTreeDto, type TeamStreamServerMessage, type TeamTaskExecutionReferenceDto } from "@autobyteus/team-stream-contracts";
import type { RootTeamRun, RootTeamRunPackageSnapshot } from "../../agent-team-execution/domain/root-team-run.js";
import type { LaunchConfigurationSource } from "../../agent-collaboration/domain/launch-configuration-source.js";
import type { ConfiguredExecutionNode, TeamRunExecutionTreeSnapshot } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../agent-team-execution/domain/team-run-event.js";
import type { SequencedRootEvent } from "../../agent-team-execution/services/team-run-event-publisher.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import { projectTeamAgentEventMessage } from "./team-agent-event-websocket-projector.js";
import { projectTeamAgentStatusSnapshotDto } from "./team-agent-status-websocket-projector.js";
import { projectTeamReferenceFile } from "../../agent-team-execution/services/team-reference-file-projection.js";
import { projectTeamRemoteEvent } from "./team-remote-event-projector.js";
import type { ProjectedRowEvent, ViewRows } from "./run-view-rows.js";
import type { LocalChildAgentStatus } from "../../agent-collaboration/execution/delegation/local-child-observation.js";

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
    snapshot: Pick<RootTeamRunPackageSnapshot, "tree" | "statuses" | "inputStates">; baseChangeSequence: number; liveSequenceId: string;
    lastMessageChangeSequence: number;
  }>,
  /** The rows under the run in base's shapes (SR-061): nested by placement, the peer rows, the closed set. */
  rows: ViewRows,
  /** The rows' agents' statuses, each from its own run (SR-061 rule 1): the view reports one for every agent it lists. */
  childStatuses: readonly LocalChildAgentStatus[] = [],
): TeamStreamServerMessage => parseTeamStreamServerMessage({
  type: "TEAM_EXECUTION_VIEW_SNAPSHOT",
  payload: {
    root_team_run_id: rootTeamRunId,
    base_change_sequence: baseChangeSequence,
    live_sequence_id: liveSequenceId,
    last_message_change_sequence: lastMessageChangeSequence,
    execution_tree: projectExecutionTree(snapshot.tree, rows.taskExecutions),
    closed_task_executions: rows.closedTaskExecutions.map(projectTaskExecutionReference),
    agent_statuses: [...snapshot.statuses.map(projectTeamAgentStatusSnapshotDto), ...childStatusDtos(snapshot.statuses, childStatuses)],
    agent_input_states: snapshot.inputStates,
    remote_task_executions: rows.remoteTaskExecutions,
  },
});

const childStatusDtos = (own: Pick<RootTeamRunPackageSnapshot, "statuses">["statuses"], children: readonly LocalChildAgentStatus[]) => {
  const listed = new Set(own.map((status) => status.execution.agentRunId));
  return children.filter((child) => !listed.has(child.agentRunId)).map((child) => ({
    agent_run_id: child.agentRunId, member_address: child.memberAddress, status: child.status,
    trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null,
  }));
};

export const projectSequencedTeamRunEvent = (
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
  }
};

/** Base's row events on the team stream (SR-061), with their records read. */
export const projectTeamRowEvent = (event: ProjectedRowEvent, changeSequence: number): TeamStreamServerMessage => {
  switch (event.kind) {
    case "task_execution_started":
      return parseTeamStreamServerMessage({ type: "TASK_EXECUTION_STARTED", payload: { change_sequence: changeSequence,
        parent_team_run_id: event.host.hostRunId, execution: teamTaskExecutionOf(event.execution) } });
    case "remote_task_execution_started":
      return parseTeamStreamServerMessage({ type: "REMOTE_TASK_EXECUTION_STARTED", payload: { change_sequence: changeSequence, execution: event.execution } });
    case "task_executions_closed":
      return parseTeamStreamServerMessage({ type: "TASK_EXECUTIONS_CLOSED", payload: { change_sequence: changeSequence,
        task_executions: event.taskExecutions.map(projectTaskExecutionReference) } });
    case "task_executions_reopened":
      return parseTeamStreamServerMessage({ type: "TASK_EXECUTIONS_REOPENED", payload: { change_sequence: changeSequence,
        executions: event.executions.map(({ host, execution }) => ({ parent_team_run_id: host.hostRunId, execution: teamTaskExecutionOf(execution) })) } });
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
    // Its rows (its open subtree and closed set, SR-061), nested by placement as at base; nothing is hosted.
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
    task_executions: child.taskExecutions.map(teamTaskExecutionOf), delegator_agent_run_id: child.delegatorAgentRunId ?? null, started_at: child.startedAt,
    source: { kind: "agent_team", team_definition_id: source.teamDefinitionId, coordinator_address: source.coordinatorAddress,
      members: source.members.map((member) => {
        const memberSource = sourceOf(member.launchSource);
        return { address: member.address, agent_definition_id: member.agentDefinitionId, launch_configuration: launchOf(member.launchConfiguration),
          follows_team: member.followsTeam, ...(memberSource ? { launch_source: memberSource } : {}) };
      }),
      handoffs: source.handoffs.map((handoff) => ({ from: handoff.from, to: handoff.to, rules: [...handoff.rules] })),
      default_launch_configuration: launchOf(source.defaultLaunchConfiguration),
      ...(sourceOf(source.defaultLaunchSource) ? { default_launch_source: sourceOf(source.defaultLaunchSource) } : {}) } } as TaskExecutionDto;
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
