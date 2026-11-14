import { projectAgentOrgExecutionTree } from "./collaboration-execution-tree-dto-projection.js";
import {
  RootExecutionEventDtoSchema,
  RootExecutionViewDtoSchema,
  type RootExecutionEventDto,
  type RootExecutionViewDto,
} from "@autobyteus/collaboration-stream-contracts";
import type { AgentOrgRunPackageSnapshot } from "../../agent-org-execution/domain/agent-org-run.js";
import type { ProjectedRowEvent, ViewRows } from "./run-view-rows.js";
import { projectCollaborationRowEvent } from "./agent-collaboration-view-projector.js";
import type { AgentOrgRunEvent } from "../../agent-org-execution/domain/agent-org-run-event.js";
import type { SequencedRootEvent } from "../../agent-collaboration/delegation/run-view-stream.js";
import { projectRemoteTaskExecutionSummary } from "./remote-task-execution-dto-projection.js";


export const projectAgentOrgExecutionSnapshot = (input: Readonly<{
  orgRunId: string;
  isActive: boolean;
  snapshot: AgentOrgRunPackageSnapshot;
  baseChangeSequence: number;
  liveSequenceId: string | null;
  lastMessageChangeSequence: number | null;
  /** The rows under the run in base's shapes (SR-061): nested by placement, the peer rows, the closed set. */
  rows: ViewRows;
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
    execution_tree: projectAgentOrgExecutionTree(snapshot.tree, input.rows.taskExecutions),
    closed_task_executions: input.rows.closedTaskExecutions,
    agent_input_states: snapshot.inputStates,
    agent_statuses: [...snapshot.statuses.map((status) => ({
      member_address: status.execution.memberAddress,
      agent_run_id: status.execution.agentRunId,
      status: status.details.status,
      trigger: status.details.trigger,
      tool_name: null,
      error_message: status.details.errorMessage,
      error_details: null, recoverableBlock: status.details.recoverableBlock,
    }))],
    remote_task_executions: input.rows.remoteTaskExecutions,
  },
  });
};

/** One event of the Org run's view in base's shapes; a row event comes with its records read, in the view's order. */
export const projectAgentOrgExecutionEvent = (
  orgRunId: string,
  sequenced: SequencedRootEvent<AgentOrgRunEvent>,
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
      event = {
        kind: "agent_presentation" as const,
        member_address: source.execution.memberAddress,
        agent_run_id: source.execution.agentRunId,
        message: source.message,
      };
      break;
    case "remote_task_execution_summary":
      event = { kind: "remote_task_execution_summary" as const, ...projectRemoteTaskExecutionSummary(source.summary) };
      break;
    case "communication":
      event = { kind: "communication" as const, message: source.message };
      break;
  }
  return RootExecutionEventDtoSchema.parse({
    root_subject_kind: "agent_org",
    root_run_id: orgRunId,
    change_sequence: sequenced.changeSequence,
    event,
  });
};
