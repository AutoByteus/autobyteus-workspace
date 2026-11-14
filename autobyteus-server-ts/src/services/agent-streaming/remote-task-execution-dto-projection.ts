import type { RemoteAgentLaunchDto, RemoteTaskExecutionDto, RemoteTaskExecutionSummaryDto } from "@autobyteus/agent-presentation-contracts";
import {
  describeRemoteTaskExecutions,
  type RemoteRunSummaryEvent,
  type RemoteTaskExecutionView,
} from "../../agent-collaboration/execution/remote/remote-run-observation.js";
import type { RemoteAgentLaunch } from "../../run-history/domain/run-execution-tree-shared-records.js";
import { openTargetOf } from "../../agent-collaboration/delegation/collaboration-tree.js";

/** A remote link with its node's name as the root views list it (autobyteus-278). */
export const projectRemoteTaskExecution = (execution: RemoteTaskExecutionView, launches?: readonly RemoteAgentLaunch[]): RemoteTaskExecutionDto => {
  // Where it opens (SR-083): the run on its node and its own agent, or its coordinator among its members.
  const target = openTargetOf(execution.kind === "agent" ? { agentRunId: execution.agentRunId } : { teamRunId: execution.teamRunId },
    execution.kind === "agent" ? undefined : { coordinatorAddress: execution.coordinatorAddress, members: execution.members });
  const common = {
    address: execution.address, node_id: execution.nodeId, node_name: execution.nodeName,
    delegator_agent_run_id: execution.delegatorAgentRunId, started_at: execution.startedAt,
    // Its launches, from its node's summary (SR-038, F-66, CR-461-084).
    ...(launches ? { launches: launches.map(projectRemoteLaunch) } : {}),
    open_target: target ? { run_kind: target.runKind, run_id: target.runId, agent_run_id: target.agentRunId, node_id: execution.nodeId } : null,
  };
  return execution.kind === "agent"
    ? { kind: "agent", agent_run_id: execution.agentRunId, ...common }
    : {
        kind: "agent_team", team_run_id: execution.teamRunId, coordinator_address: execution.coordinatorAddress,
        members: execution.members.map((member) => ({ address: member.address, agent_run_id: member.agentRunId })), ...common,
      };
};

/** A peer's launch (autobyteus-32 REQ-009) in the wire's snake case. */
const projectRemoteLaunch = (launch: RemoteAgentLaunch): RemoteAgentLaunchDto => {
  const fallbacks = launch.source.fallbacks.map((fallback) => ({
    layer: fallback.layer, runtime_kind: fallback.runtimeKind, llm_model_identifier: fallback.llmModelIdentifier,
    reason: fallback.reason, detail: fallback.detail,
  }));
  return {
    address: launch.address, runtime_kind: launch.runtimeKind, llm_model_identifier: launch.llmModelIdentifier,
    source: launch.source.origin === "model_router"
      ? { origin: "model_router", fallbacks, choice_reason: launch.source.choiceReason, task_kind: launch.source.taskKind }
      : { origin: launch.source.origin, fallbacks },
  };
};

export const projectRemoteTaskExecutionSummary = (summary: RemoteRunSummaryEvent): RemoteTaskExecutionSummaryDto => ({
  node_id: summary.nodeId,
  run_id: summary.runId,
  reachable: summary.reachable,
  title: summary.title,
  statuses: summary.statuses.map((status) => ({ agent_run_id: status.agentRunId, status: status.status })),
  launches: summary.launches.map(projectRemoteLaunch),
});
