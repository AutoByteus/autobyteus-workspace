import { projectAgentCollaborationTree } from "./collaboration-execution-tree-dto-projection.js";
import {
  RootExecutionEventDtoSchema,
  RootExecutionViewDtoSchema,
  type RootExecutionEventDto,
  type RootExecutionViewDto,
} from "@autobyteus/collaboration-stream-contracts";
import type { SequencedRootEvent } from "../../agent-collaboration/delegation/run-view-stream.js";
import type { StandaloneRootPackageSnapshot } from "../../standalone-agent-run-root/domain/standalone-agent-run-root.js";
import type { StandaloneRootEvent } from "../../standalone-agent-run-root/domain/standalone-root-event.js";
import { projectRemoteTaskExecutionSummary } from "./remote-task-execution-dto-projection.js";
import type { LocalChildAgentStatus } from "../../agent-collaboration/execution/delegation/local-child-observation.js";
import type { ProjectedRowEvent, ViewRows } from "./run-view-rows.js";

/** Agent-root view (root kind `agent`) on the collaboration-stream contracts. */
export const projectAgentCollaborationView = (input: Readonly<{
  hostRunId: string;
  isActive: boolean;
  snapshot: StandaloneRootPackageSnapshot;
  baseChangeSequence: number;
  liveSequenceId: string | null;
  lastMessageChangeSequence: number | null;
  /** The rows under the run in base's shapes (SR-061): nested by placement, the peer rows, the closed set. */
  rows: ViewRows;
  /** The rows' agents' statuses, each from its own run (SR-061 rule 1). */
  childStatuses: readonly LocalChildAgentStatus[];
}>): RootExecutionViewDto => RootExecutionViewDtoSchema.parse({
  root_subject_kind: "agent",
  root_run_id: input.hostRunId,
  root_agent: {
    base_change_sequence: input.baseChangeSequence,
    live_sequence_id: input.liveSequenceId,
    last_message_change_sequence: input.lastMessageChangeSequence,
    is_active: input.isActive,
    execution_tree: projectAgentCollaborationTree({ host: input.snapshot.host, createdAt: input.snapshot.createdAt, taskExecutions: input.rows.taskExecutions }),
    closed_task_executions: input.rows.closedTaskExecutions,
    agent_input_states: [],
    agent_statuses: [...input.snapshot.statuses.map((status) => ({
      member_address: status.execution.memberAddress,
      agent_run_id: status.execution.agentRunId,
      status: status.details.status,
      trigger: status.details.trigger,
      tool_name: null,
      error_message: status.details.errorMessage,
      error_details: null,
      recoverableBlock: status.details.recoverableBlock,
    })), ...input.childStatuses.map((status) => ({ member_address: status.memberAddress, agent_run_id: status.agentRunId, status: status.status,
      trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null }))],
    remote_task_executions: input.rows.remoteTaskExecutions,
  },
});

/**
 * One event of the run's view in base's shapes; a row event comes with its records read (`readRowEvent`), in the
 * view's order.
 */
export const projectAgentCollaborationEvent = (
  hostRunId: string,
  sequenced: SequencedRootEvent<StandaloneRootEvent>,
  rowEvent: ProjectedRowEvent | null = null,
): RootExecutionEventDto | null => {
  const source = sequenced.event;
  let event;
  switch (source.kind) {
    case "lifecycle":
      return null;
    case "task_execution_started":
    case "task_executions_closed":
    case "task_executions_reopened":
      if (!rowEvent) return null;
      event = projectCollaborationRowEvent(rowEvent);
      break;
    case "agent_presentation":
      event = { kind: "agent_presentation" as const, member_address: source.execution.memberAddress, agent_run_id: source.execution.agentRunId, message: source.message };
      break;
    // N-402: the one place a child's output (on a peer, or local, DS-8) becomes the stream's `agent_presentation`.
    case "remote_agent_presentation":
    case "local_child_presentation":
      event = { kind: "agent_presentation" as const, member_address: source.memberAddress, agent_run_id: source.agentRunId, message: source.message };
      break;
    case "remote_task_execution_summary":
      event = { kind: "remote_task_execution_summary" as const, ...projectRemoteTaskExecutionSummary(source.summary) };
      break;
    case "communication":
      event = { kind: "communication" as const, message: source.message };
      break;
  }
  return RootExecutionEventDtoSchema.parse({
    root_subject_kind: "agent",
    root_run_id: hostRunId,
    change_sequence: sequenced.changeSequence,
    event,
  });
};

/** Base's row events on the collaboration streams (SR-061). */
export const projectCollaborationRowEvent = (event: ProjectedRowEvent) => {
  switch (event.kind) {
    case "task_execution_started":
      return { kind: "task_execution_started" as const, host_kind: event.host.hostKind, host_run_id: event.host.hostRunId, execution: event.execution };
    case "remote_task_execution_started":
      return { kind: "remote_task_execution_started" as const, execution: event.execution };
    case "task_executions_closed":
      return { kind: "task_executions_closed" as const, task_executions: [...event.taskExecutions] };
    case "task_executions_reopened":
      return { kind: "task_executions_reopened" as const, task_executions: event.executions.map(({ execution }) =>
        "agentRunId" in execution ? { agentRunId: execution.agentRunId } : { teamRunId: execution.teamRunId }) };
  }
};
