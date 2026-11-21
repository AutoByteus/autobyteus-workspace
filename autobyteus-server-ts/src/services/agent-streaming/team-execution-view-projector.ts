import { parseTeamStreamServerMessage, type AgentLaunchConfigurationDto, type ConfiguredAgentExecutionDto, type TeamCommunicationMessageDto, type TeamReferenceFileDto, type TeamRunExecutionTreeDto, type TeamStreamServerMessage } from "@autobyteus/team-stream-contracts";
import type { RootTeamRun, RootTeamRunPackageSnapshot } from "../../agent-team-execution/domain/root-team-run.js";
import type { ConfiguredExecutionNode, TeamRunExecutionTreeSnapshot } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../agent-team-execution/domain/team-run-event.js";
import type { SequencedRootEvent } from "../../agent-team-execution/services/team-run-event-publisher.js";
import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
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
  { snapshot, baseChangeSequence, liveSequenceId, lastMessageChangeSequence }: Readonly<{
    snapshot: Pick<RootTeamRunPackageSnapshot, "tree" | "statuses" | "inputStates" | "leavingMembers">; baseChangeSequence: number; liveSequenceId: string;
    lastMessageChangeSequence: number;
  }>,
): TeamStreamServerMessage => parseTeamStreamServerMessage({
  type: "TEAM_EXECUTION_VIEW_SNAPSHOT",
  payload: {
    root_team_run_id: rootTeamRunId,
    base_change_sequence: baseChangeSequence,
    live_sequence_id: liveSequenceId,
    last_message_change_sequence: lastMessageChangeSequence,
    // Its own members, and the ones leaving the team (still finishing their turn); the runs it delegated are its tree's
    // rows (`RUN_TREE_SNAPSHOT`, SR-084).
    execution_tree: projectExecutionTree(snapshot.tree, snapshot.leavingMembers),
    // The Team's own agents; a delegated or peer run's status is its own, read by its run ID (SR-083).
    agent_statuses: snapshot.statuses.map(projectTeamAgentStatusSnapshotDto),
    agent_input_states: snapshot.inputStates,
  },
});

/** One run event as its frame; null for the membership notice (the session takes a new snapshot instead, DS-007 a). */
export const projectSequencedTeamRunEvent = (
  sequenced: SequencedRootEvent<TeamRunEvent>,
): TeamStreamServerMessage | null => {
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
    case TeamRunEventSourceType.MEMBERSHIP:
      return null;
  }
};

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

/** A Team run's own tree: its members (the runs it delegated are its tree's rows, SR-084). */
export const projectExecutionTree = (
  tree: TeamRunExecutionTreeSnapshot,
  leavingMembers: readonly ConfiguredExecutionNode[] = [],
): TeamRunExecutionTreeDto => ({
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
    members: [...tree.rootTeam.members.map(projectConfiguredMember),
      ...leavingMembers.map((member) => ({ ...projectConfiguredMember(member), leaving: true as const }))],
  },
});

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
