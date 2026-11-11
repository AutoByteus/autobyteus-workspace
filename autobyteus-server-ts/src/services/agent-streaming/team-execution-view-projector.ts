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
import type { ChildRowsEvent } from "../../agent-collaboration/delegation/child-rows-feed.js";
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
    case TeamRunEventSourceType.REMOTE:
      // DS-8: a local child's output as a remote child's (its rows come from `ChildRowsFeed`).
      return projectTeamRemoteEvent(event.event, changeSequence);
  }
};

/** A Team run's child-row change (SR-043): local rows under the Team run, as its snapshot projects them; peer rows. */
export const projectTeamChildRunsChanged = (teamRunId: string, event: ChildRowsEvent): TeamStreamServerMessage => parseTeamStreamServerMessage({
  type: "CHILD_RUNS_CHANGED", payload: { run_id: teamRunId,
    added: event.added.map((record) => record.kind === "local" ? { parent_team_run_id: teamRunId, execution: teamTaskExecutionOf(record.row) } : record.row),
    removed: event.removed.map(projectTaskExecutionReference) },
});

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
