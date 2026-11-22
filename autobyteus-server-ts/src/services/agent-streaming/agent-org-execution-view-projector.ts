import { projectAgentOrgExecutionTree } from "./collaboration-execution-tree-dto-projection.js";
import { messageFields } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import {
  RootExecutionEventDtoSchema,
  RootExecutionViewDtoSchema,
  type RootExecutionEventDto,
  type RootExecutionViewDto,
} from "@autobyteus/collaboration-stream-contracts";
import type { AgentOrgRunPackageSnapshot } from "../../agent-org-execution/domain/agent-org-package-snapshot.js";
import type { AgentOrgRunEvent } from "../../agent-org-execution/domain/agent-org-run-event.js";
import type { SequencedRootEvent } from "../../agent-collaboration/delegation/run-view-stream.js";

export const projectAgentOrgExecutionSnapshot = (input: Readonly<{
  orgRunId: string;
  isActive: boolean;
  snapshot: AgentOrgRunPackageSnapshot;
  baseChangeSequence: number;
  liveSequenceId: string | null;
  lastMessageChangeSequence: number | null;
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
    execution_tree: projectAgentOrgExecutionTree(snapshot.tree),
    agent_input_states: snapshot.inputStates,
    agent_statuses: [...snapshot.statuses.map((status) => ({
      member_address: status.execution.memberAddress,
      agent_run_id: status.execution.agentRunId,
      status: status.details.status,
      background_tasks_running: status.details.backgroundTasksRunning,
      trigger: status.details.trigger,
      tool_name: null,
      error_message: status.details.errorMessage,
      error_details: null, recoverableBlock: status.details.recoverableBlock,
    }))],
  },
  });
};

/** One event of the Org run's view in base's shapes; its tree's changes are sent by its session (`run_tree_changed`, SR-084). */
export const projectAgentOrgExecutionEvent = (
  orgRunId: string,
  sequenced: SequencedRootEvent<AgentOrgRunEvent>,
): RootExecutionEventDto | null => {
  const source = sequenced.event;
  let event;
  switch (source.kind) {
    case "lifecycle":
    case "composition_changed":
      return null;
    case "agent_presentation":
      event = {
        kind: "agent_presentation" as const,
        member_address: source.execution.memberAddress,
        agent_run_id: source.execution.agentRunId,
        message: source.message,
      };
      break;
    case "communication":
      event = { kind: "communication" as const, message: messageFields(source.message) };
      break;
  }
  return RootExecutionEventDtoSchema.parse({
    root_subject_kind: "agent_org",
    root_run_id: orgRunId,
    change_sequence: sequenced.changeSequence,
    event,
  });
};
