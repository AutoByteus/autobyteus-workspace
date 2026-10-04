import {
  RootExecutionEventDtoSchema,
  RootExecutionViewDtoSchema,
  type RootExecutionEventDto,
  type RootExecutionViewDto,
} from "@autobyteus/collaboration-stream-contracts";
import type { SequencedRootEvent } from "../../agent-collaboration/execution/services/root-event-publisher.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { StandaloneRootPackageSnapshot } from "../../standalone-agent-run-root/domain/standalone-agent-run-root.js";
import type { StandaloneRootEvent } from "../../standalone-agent-run-root/domain/standalone-root-event.js";
import type { StandaloneRootTreeSnapshot } from "../../standalone-agent-run-root/domain/standalone-root-tree.js";
import { StandaloneRootExecutionIndex } from "../../standalone-agent-run-root/services/standalone-root-execution-index.js";

/** Agent-root view (root kind `agent`) on the collaboration-stream contracts. */
export const projectAgentCollaborationView = (input: Readonly<{
  hostRunId: string;
  isActive: boolean;
  snapshot: StandaloneRootPackageSnapshot;
  baseChangeSequence: number;
}>): RootExecutionViewDto => RootExecutionViewDtoSchema.parse({
  root_subject_kind: "agent",
  root_run_id: input.hostRunId,
  root_agent: {
    base_change_sequence: input.baseChangeSequence,
    is_active: input.isActive,
    execution_tree: input.snapshot.tree,
    communication_messages: input.snapshot.messages,
    agent_input_states: input.snapshot.inputStates,
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
  },
});

const requireStartedExecution = (tree: StandaloneRootTreeSnapshot, reference: TaskExecutionReference) => {
  const execution = new StandaloneRootExecutionIndex(tree).getTaskExecution(reference);
  if (!execution) throw new Error("Started Agent-root task execution is not in the current execution tree.");
  return execution.source;
};

export const projectAgentCollaborationEvent = (
  hostRunId: string,
  tree: StandaloneRootTreeSnapshot,
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
    case "task_execution_started":
      event = {
        kind: "task_execution_started" as const,
        host_kind: source.host.hostKind,
        host_run_id: source.host.hostRunId,
        execution: requireStartedExecution(tree, source.taskExecution),
      };
      break;
    case "communication":
      event = { kind: "communication" as const, message: source.message };
      break;
    case "collaborator_added":
      event = { kind: "collaborator_added" as const, collaborator: source.collaborator };
      break;
  }
  return RootExecutionEventDtoSchema.parse({
    root_subject_kind: "agent",
    root_run_id: hostRunId,
    change_sequence: sequenced.changeSequence,
    event,
  });
};
