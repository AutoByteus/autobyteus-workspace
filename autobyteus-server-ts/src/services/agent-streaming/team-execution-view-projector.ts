import {
  parseTeamStreamServerMessage,
  type ConfiguredMemberExecutionDto,
  type TaskDelegationRecordDto,
  type TaskExecutionDto,
  type TaskExecutionReferenceDto,
  type TaskTeamMemberExecutionDto,
  type TeamCommunicationMessageDto,
  type TeamReferenceFileDto,
  type TeamRunExecutionTreeDto,
  type TeamStreamServerMessage,
} from "@autobyteus/team-stream-contracts";
import type { RootTeamRun, RootTeamRunPackageSnapshot } from "../../agent-team-execution/domain/root-team-run.js";
import type {
  ConfiguredMemberExecution,
  ConfiguredTeamExecution,
  RootConfiguredTeamExecution,
  TaskExecution,
  TaskTeamExecution,
  TaskTeamMemberExecution,
  TaskTeamNestedTeamExecution,
  TeamRunExecutionTreeSnapshot,
} from "../../agent-team-execution/domain/team-run-execution-tree.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../agent-team-execution/domain/team-run-event.js";
import type { SequencedRootEvent } from "../../agent-team-execution/services/team-run-event-publisher.js";
import type { TaskDelegationRecordV1, TaskExecutionReference } from "../../agent-team-execution/task-delegation/task-delegation-record-v1.js";
import type { TeamCommunicationMessageV1 } from "../../services/team-communication/team-communication-v1-types.js";
import { projectTeamAgentEventMessage, projectTeamAgentStatusDto } from "./team-agent-event-websocket-projector.js";
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
    tasks: snapshot.tasks.records.map(projectTaskRecord),
    messages: snapshot.messages.messages.map(projectCommunicationMessage),
    agent_statuses: snapshot.statuses.map(projectTeamAgentStatusDto),
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
    case TeamRunEventSourceType.TASK_DELEGATION:
      return projectTaskEvent(root, Object.freeze({ changeSequence, event }));
  }
};

export const projectTaskRecord = (task: TaskDelegationRecordV1): TaskDelegationRecordDto => ({
  task_id: task.taskId,
  delegator_agent_run_id: task.delegatorAgentRunId,
  recipient_address: task.recipientAddress,
  task_execution: projectTaskExecutionReference(task.taskExecution),
  description: task.description,
  reference_files: task.referenceFiles.map((file) => projectReference(task.taskId, file, task.createdAt)),
  status: task.status,
  updates: task.updates.map((update) => {
    if ("submissionId" in update) return {
      kind: "submission" as const, submission_id: update.submissionId, message: update.message,
      reference_files: update.referenceFiles.map((file) => projectReference(update.submissionId, file, update.createdAt)), created_at: update.createdAt,
    };
    if ("reviewId" in update) return {
      kind: "review" as const, review_id: update.reviewId,
      reviewed_submission_id: update.reviewedSubmissionId, decision: update.decision,
      comment: update.comment, reference_files: update.referenceFiles.map((file) => projectReference(update.reviewId, file, update.createdAt)), created_at: update.createdAt,
    };
    return { kind: "interruption" as const, interruption_id: update.interruptionId, reason: update.reason, created_at: update.createdAt };
  }),
  created_at: task.createdAt,
});

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

const projectTaskEvent = (
  root: RootTeamRun,
  sequenced: SequencedRootEvent<Extract<TeamRunEvent, { eventSourceType: TeamRunEventSourceType.TASK_DELEGATION }>>,
): TeamStreamServerMessage => {
  const taskId = sequenced.event.payload.details.taskId;
  const task = root.getTaskRecordsSnapshot().records.find((entry) => entry.taskId === taskId);
  if (!task) throw new Error(`Task event '${taskId}' has no current task record.`);
  const taskDto = projectTaskRecord(task);
  if (sequenced.event.payload.eventType === "TASK_DELEGATION_ACTIVATED") {
    const located = findTaskExecution(root.getExecutionTreeSnapshot(), task.taskExecution);
    if (!located) throw new Error(`Task event '${taskId}' has no current execution.`);
    const execution = projectTaskExecution(located.execution);
    return execution.kind === "task_agent"
      ? parseTeamStreamServerMessage({ type: "TASK_DELEGATION_EVENT", payload: {
          event_type: "TASK_AGENT_ACTIVATED", change_sequence: sequenced.changeSequence,
          parent_team_run_id: located.parentTeamRunId, execution, task: taskDto,
        } })
      : parseTeamStreamServerMessage({ type: "TASK_DELEGATION_EVENT", payload: {
          event_type: "TASK_TEAM_ACTIVATED", change_sequence: sequenced.changeSequence,
          parent_team_run_id: located.parentTeamRunId, execution, task: taskDto,
        } });
  }
  if (sequenced.event.payload.eventType === "TASK_DELEGATION_SETTLED") {
    return parseTeamStreamServerMessage({ type: "TASK_DELEGATION_EVENT", payload: {
      event_type: "TASK_EXECUTION_SETTLED", change_sequence: sequenced.changeSequence,
      execution: projectTaskExecutionReference(task.taskExecution), task: taskDto,
      settled_at: sequenced.event.payload.details.settledAt,
    } });
  }
  return parseTeamStreamServerMessage({ type: "TASK_DELEGATION_EVENT", payload: {
    event_type: "TASK_CHANGED", change_sequence: sequenced.changeSequence, task: taskDto,
  } });
};

const projectTaskExecutionReference = (reference: TaskExecutionReference): TaskExecutionReferenceDto =>
  "agentRunId" in reference ? { agent_run_id: reference.agentRunId } : { team_run_id: reference.teamRunId };

export const projectExecutionTree = (tree: TeamRunExecutionTreeSnapshot): TeamRunExecutionTreeDto => ({
  schema_version: 1,
  created_at: tree.createdAt,
  archived_at: tree.archivedAt,
  application_binding: tree.applicationBinding ? {
    application_id: tree.applicationBinding.applicationId,
    binding_id: tree.applicationBinding.bindingId,
  } : null,
  handoffs: tree.handoffs.map((handoff) => ({ from: handoff.from, to: handoff.to, rules: [...handoff.rules] })),
  root_team: {
    team_definition_id: tree.rootTeam.teamDefinitionId,
    team_definition_name: tree.rootTeam.teamDefinitionName,
    team_run_id: tree.rootTeam.teamRunId,
    coordinator_address: tree.rootTeam.coordinatorAddress,
    members: tree.rootTeam.members.map(projectConfiguredMember),
    task_executions: tree.rootTeam.taskExecutions.map(projectTaskExecution),
  },
});

const projectConfiguredMember = (member: ConfiguredMemberExecution): ConfiguredMemberExecutionDto => {
  if ("agentRunId" in member) return {
    kind: "configured_agent", address: member.address, agent_definition_id: member.agentDefinitionId,
    role: member.role, description: member.description, agent_run_id: member.agentRunId,
    platform_agent_run_id: member.platformAgentRunId,
    launch_configuration: {
      runtime_kind: member.launchConfiguration.runtimeKind,
      llm_model_identifier: member.launchConfiguration.llmModelIdentifier,
      llm_config: member.launchConfiguration.llmConfig as Record<string, import("@autobyteus/team-stream-contracts").JsonValue> | null,
      auto_execute_tools: member.launchConfiguration.autoExecuteTools,
      skill_access_mode: member.launchConfiguration.skillAccessMode,
      workspace_root_path: member.launchConfiguration.workspaceRootPath,
    },
  };
  return projectConfiguredTeam(member);
};

const projectConfiguredTeam = (team: ConfiguredTeamExecution): ConfiguredMemberExecutionDto => ({
  kind: "configured_team", address: team.address, team_definition_id: team.teamDefinitionId,
  role: team.role, description: team.description, team_run_id: team.teamRunId,
  coordinator_address: team.coordinatorAddress,
  members: team.members.map(projectConfiguredMember),
  task_executions: team.taskExecutions.map(projectTaskExecution),
});

const projectTaskExecution = (execution: TaskExecution): TaskExecutionDto => {
  if ("agentRunId" in execution) return {
    kind: "task_agent", address: execution.address, agent_run_id: execution.agentRunId,
    platform_agent_run_id: execution.platformAgentRunId, started_at: execution.startedAt,
    settled_at: execution.settledAt,
  };
  return {
    kind: "task_team", address: execution.address, team_run_id: execution.teamRunId,
    members: execution.members.map(projectTaskTeamMember),
    task_executions: execution.taskExecutions.map(projectTaskExecution),
    started_at: execution.startedAt, settled_at: execution.settledAt,
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
    team: RootConfiguredTeamExecution | ConfiguredTeamExecution | TaskTeamExecution | TaskTeamNestedTeamExecution,
  ): { parentTeamRunId: string; execution: TaskExecution } | null => {
    const own = team.taskExecutions.find((execution) =>
      "agentRunId" in reference
        ? "agentRunId" in execution && execution.agentRunId === reference.agentRunId
        : "teamRunId" in execution && execution.teamRunId === reference.teamRunId);
    if (own) return { parentTeamRunId: team.teamRunId, execution: own };
    for (const member of team.members) {
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
