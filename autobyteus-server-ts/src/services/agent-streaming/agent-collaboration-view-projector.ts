import { projectAgentCollaborationTree } from "./collaboration-execution-tree-dto-projection.js";
import {
  RootExecutionEventDtoSchema,
  RootExecutionViewDtoSchema,
  type RootExecutionEventDto,
  type RootExecutionViewDto,
} from "@autobyteus/collaboration-stream-contracts";
import type { SequencedRootEvent } from "../../agent-collaboration/execution/services/root-event-publisher.js";
import type { StandaloneRootPackageSnapshot } from "../../standalone-agent-run-root/domain/standalone-agent-run-root.js";
import type { StandaloneRootEvent } from "../../standalone-agent-run-root/domain/standalone-root-event.js";
import { projectRemoteTaskExecution, projectRemoteTaskExecutionSummary } from "./remote-task-execution-dto-projection.js";
import type { RemoteTaskExecutionDto } from "@autobyteus/agent-presentation-contracts";
import type { CollaborationTaskExecutionDto } from "@autobyteus/collaboration-stream-contracts";

/** Agent-root view (root kind `agent`) on the collaboration-stream contracts. */
export const projectAgentCollaborationView = (input: Readonly<{
  hostRunId: string;
  isActive: boolean;
  snapshot: StandaloneRootPackageSnapshot;
  baseChangeSequence: number;
  liveSequenceId: string | null;
  lastMessageChangeSequence: number | null;
  /** autobyteus-278: the runs this run delegated to other nodes, with their nodes' names. */
  remoteTaskExecutions: readonly RemoteTaskExecutionDto[];
  /** autobyteus-461 DS-8: the runs on this node it delegated to (`delegatedChildrenDtos`), and when the run started. */
  taskExecutions: readonly CollaborationTaskExecutionDto[];
}>): RootExecutionViewDto => RootExecutionViewDtoSchema.parse({
  root_subject_kind: "agent",
  root_run_id: input.hostRunId,
  root_agent: {
    base_change_sequence: input.baseChangeSequence,
    live_sequence_id: input.liveSequenceId,
    last_message_change_sequence: input.lastMessageChangeSequence,
    is_active: input.isActive,
    execution_tree: projectAgentCollaborationTree({ host: input.snapshot.host, createdAt: input.snapshot.createdAt, taskExecutions: input.taskExecutions }),
    closed_task_executions: [],
    agent_input_states: [],
    agent_statuses: input.snapshot.statuses.map((status) => ({
      member_address: status.execution.memberAddress,
      agent_run_id: status.execution.agentRunId,
      status: status.details.status,
      trigger: status.details.trigger,
      tool_name: null,
      error_message: status.details.errorMessage,
      error_details: null,
      recoverableBlock: status.details.recoverableBlock,
    })),
    remote_task_executions: input.remoteTaskExecutions,
  },
});

export const projectAgentCollaborationEvent = (
  hostRunId: string,
  _tree: unknown,
  sequenced: SequencedRootEvent<StandaloneRootEvent>,
): RootExecutionEventDto | null => {
  const source = sequenced.event;
  let event;
  switch (source.kind) {
    case "lifecycle":
      return null;
    case "agent_presentation":
      event = { kind: "agent_presentation" as const, member_address: source.execution.memberAddress, agent_run_id: source.execution.agentRunId, message: source.message };
      break;
    // N-402: the one place a remote child's output becomes the stream's `agent_presentation`.
    case "remote_agent_presentation":
      event = { kind: "agent_presentation" as const, member_address: source.memberAddress, agent_run_id: source.agentRunId, message: source.message };
      break;
    case "remote_task_execution_summary":
      event = { kind: "remote_task_execution_summary" as const, ...projectRemoteTaskExecutionSummary(source.summary) };
      break;
    case "remote_task_execution_started":
      event = { kind: "remote_task_execution_started" as const, execution: projectRemoteTaskExecution(source.execution) };
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
