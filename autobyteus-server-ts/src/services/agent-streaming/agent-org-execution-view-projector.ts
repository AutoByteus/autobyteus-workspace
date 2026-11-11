import type { CollaborationTaskExecutionDto } from "@autobyteus/collaboration-stream-contracts";
import { projectAgentOrgExecutionTree } from "./collaboration-execution-tree-dto-projection.js";
import {
  RootExecutionEventDtoSchema,
  RootExecutionViewDtoSchema,
  type RootExecutionEventDto,
  type RootExecutionViewDto,
} from "@autobyteus/collaboration-stream-contracts";
import type { AgentOrgRun, AgentOrgRunPackageSnapshot } from "../../agent-org-execution/domain/agent-org-run.js";
import type { AgentOrgRunEvent } from "../../agent-org-execution/domain/agent-org-run-event.js";
import type { SequencedRootEvent } from "../../agent-collaboration/execution/services/root-event-publisher.js";
import { projectRemoteTaskExecution, projectRemoteTaskExecutionSummary } from "./remote-task-execution-dto-projection.js";
import type { RemoteTaskExecutionDto } from "@autobyteus/agent-presentation-contracts";


export const projectAgentOrgExecutionView = (
  run: AgentOrgRun,
  connection: Readonly<{ snapshot: AgentOrgRunPackageSnapshot; baseChangeSequence: number; liveSequenceId: string;
    lastMessageChangeSequence: number }>,
  remoteTaskExecutions: readonly RemoteTaskExecutionDto[],
  delegated: readonly CollaborationTaskExecutionDto[] = [],
): RootExecutionViewDto => projectAgentOrgExecutionSnapshot({
  orgRunId: run.orgRunId, isActive: run.isActive(), snapshot: connection.snapshot,
  baseChangeSequence: connection.baseChangeSequence, liveSequenceId: connection.liveSequenceId,
  lastMessageChangeSequence: connection.lastMessageChangeSequence, remoteTaskExecutions, delegated,
});

export const projectAgentOrgExecutionSnapshot = (input: Readonly<{
  orgRunId: string;
  isActive: boolean;
  snapshot: AgentOrgRunPackageSnapshot;
  baseChangeSequence: number;
  liveSequenceId: string | null;
  lastMessageChangeSequence: number | null;
  /** autobyteus-278: the runs this Org delegated to other nodes, with their nodes' names. */
  remoteTaskExecutions: readonly RemoteTaskExecutionDto[];
  /** autobyteus-461 DS-8: the runs on this node its agents delegated to. */
  delegated?: readonly CollaborationTaskExecutionDto[];
}>): RootExecutionViewDto => {
  const { orgRunId, isActive, snapshot, baseChangeSequence, liveSequenceId, lastMessageChangeSequence } = input;
  return RootExecutionViewDtoSchema.parse({
  root_subject_kind: "agent_org",
  root_run_id: orgRunId,
  root_org: {
    base_change_sequence: baseChangeSequence,
    live_sequence_id: liveSequenceId,
    last_message_change_sequence: lastMessageChangeSequence,
    is_active: isActive,
    execution_tree: projectAgentOrgExecutionTree(snapshot.tree, input.delegated ?? []),
    closed_task_executions: [],
    agent_input_states: snapshot.inputStates,
    agent_statuses: snapshot.statuses.map((status) => ({
      member_address: status.execution.memberAddress,
      agent_run_id: status.execution.agentRunId,
      status: status.details.status,
      trigger: status.details.trigger,
      tool_name: null,
      error_message: status.details.errorMessage,
      error_details: null, recoverableBlock: status.details.recoverableBlock,
    })),
    remote_task_executions: input.remoteTaskExecutions,
  },
  });
};

export const projectAgentOrgExecutionEvent = (
  run: AgentOrgRun,
  sequenced: SequencedRootEvent<AgentOrgRunEvent>,
): RootExecutionEventDto | null => {
  const source = sequenced.event;
  let event;
  switch (source.kind) {
    case "lifecycle":
      return null;
    case "agent_presentation":
      event = {
        kind: "agent_presentation" as const,
        member_address: source.execution.memberAddress,
        agent_run_id: source.execution.agentRunId,
        message: source.message,
      };
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
    root_subject_kind: "agent_org",
    root_run_id: run.orgRunId,
    change_sequence: sequenced.changeSequence,
    event,
  });
};
