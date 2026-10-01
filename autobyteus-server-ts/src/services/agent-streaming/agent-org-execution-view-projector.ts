import {
  RootExecutionEventDtoSchema,
  RootExecutionViewDtoSchema,
  type RootExecutionEventDto,
  type RootExecutionViewDto,
} from "@autobyteus/collaboration-stream-contracts";
import type { AgentOrgRun, AgentOrgRunPackageSnapshot } from "../../agent-org-execution/domain/agent-org-run.js";
import type { AgentOrgRunEvent } from "../../agent-org-execution/domain/agent-org-run-event.js";
import type { SequencedRootEvent } from "../../agent-collaboration/execution/services/root-event-publisher.js";
import { AgentOrgExecutionIndex } from "../../agent-org-execution/services/agent-org-execution-index.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";

const requireStartedExecution = (run: AgentOrgRun, reference: TaskExecutionReference) => {
  const execution = new AgentOrgExecutionIndex(run.getExecutionTreeSnapshot()).getTaskExecution(reference);
  if (!execution) throw new Error("Started AgentOrg task execution is not in the current execution tree.");
  return execution.source;
};

export const projectAgentOrgExecutionView = (
  run: AgentOrgRun,
  snapshot: AgentOrgRunPackageSnapshot,
  baseChangeSequence: number,
): RootExecutionViewDto => projectAgentOrgExecutionSnapshot({
  orgRunId: run.orgRunId, isActive: run.isActive(), snapshot, baseChangeSequence,
});

export const projectAgentOrgExecutionSnapshot = (input: Readonly<{
  orgRunId: string;
  isActive: boolean;
  snapshot: AgentOrgRunPackageSnapshot;
  baseChangeSequence: number;
}>): RootExecutionViewDto => {
  const { orgRunId, isActive, snapshot, baseChangeSequence } = input;
  return RootExecutionViewDtoSchema.parse({
  root_subject_kind: "agent_org",
  root_run_id: orgRunId,
  root_org: {
    base_change_sequence: baseChangeSequence,
    is_active: isActive,
    execution_tree: snapshot.tree,
    communication_messages: snapshot.messages,
    agent_statuses: snapshot.statuses.map((status) => ({
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
    case "task_execution_started":
      event = {
        kind: "task_execution_started" as const,
        host_kind: source.host.hostKind,
        host_run_id: source.host.hostRunId,
        execution: requireStartedExecution(run, source.taskExecution),
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
    root_subject_kind: "agent_org",
    root_run_id: run.orgRunId,
    change_sequence: sequenced.changeSequence,
    event,
  });
};
