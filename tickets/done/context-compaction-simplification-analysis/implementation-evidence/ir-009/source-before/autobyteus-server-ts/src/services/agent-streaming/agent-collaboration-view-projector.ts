import {
  RootExecutionEventDtoSchema,
  RootExecutionViewDtoSchema,
  type RootExecutionEventDto,
  type RootExecutionViewDto,
} from "@autobyteus/collaboration-stream-contracts";
import type { SequencedRootEvent } from "../../agent-collaboration/execution/services/root-event-publisher.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { AgentRunCollaborationPackageSnapshot } from "../../agent-run-collaboration/domain/agent-run-collaboration-root.js";
import type { AgentRunCollaborationRootEvent } from "../../agent-run-collaboration/domain/agent-run-collaboration-root-event.js";
import type { AgentRunCollaborationTreeSnapshot } from "../../agent-run-collaboration/domain/agent-run-collaboration-tree.js";
import { AgentRunCollaborationExecutionIndex } from "../../agent-run-collaboration/services/agent-run-collaboration-execution-index.js";

/** Agent-root view (root kind `agent`) on the collaboration-stream contracts. */
export const projectAgentCollaborationView = (input: Readonly<{
  hostRunId: string;
  isActive: boolean;
  snapshot: AgentRunCollaborationPackageSnapshot;
  baseChangeSequence: number;
}>): RootExecutionViewDto => RootExecutionViewDtoSchema.parse({
  root_subject_kind: "agent",
  root_run_id: input.hostRunId,
  root_agent: {
    base_change_sequence: input.baseChangeSequence,
    is_active: input.isActive,
    execution_tree: input.snapshot.tree,
    communication_messages: input.snapshot.messages,
    agent_statuses: input.snapshot.statuses.map((status) => ({
      member_address: status.execution.memberAddress,
      agent_run_id: status.execution.agentRunId,
      status: status.details.status,
      trigger: status.details.trigger,
      tool_name: null,
      error_message: status.details.errorMessage,
      error_details: null,
    })),
  },
});

const requireStartedExecution = (tree: AgentRunCollaborationTreeSnapshot, reference: TaskExecutionReference) => {
  const execution = new AgentRunCollaborationExecutionIndex(tree).getTaskExecution(reference);
  if (!execution) throw new Error("Started Agent-root task execution is not in the current execution tree.");
  return execution.source;
};

export const projectAgentCollaborationEvent = (
  hostRunId: string,
  tree: AgentRunCollaborationTreeSnapshot,
  sequenced: SequencedRootEvent<AgentRunCollaborationRootEvent>,
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
