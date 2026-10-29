import type { RemoteAgentLaunchDto, RemoteTaskExecutionDto, RemoteTaskExecutionSummaryDto } from "@autobyteus/agent-presentation-contracts";
import { findProcessRemoteRunChannel } from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import {
  describeRemoteTaskExecutions,
  type RemoteRunSummaryEvent,
  type RemoteTaskExecutionView,
} from "../../agent-collaboration/execution/remote/remote-run-observation.js";
import type { RemoteAgentLaunch, RemoteTaskExecution } from "../../run-history/domain/run-execution-tree-shared-records.js";

/** A remote link with its node's name as the root views list it (autobyteus-278). */
export const projectRemoteTaskExecution = (execution: RemoteTaskExecutionView): RemoteTaskExecutionDto => {
  const common = {
    address: execution.address, node_id: execution.nodeId, node_name: execution.nodeName,
    delegator_agent_run_id: execution.delegatorAgentRunId, started_at: execution.startedAt,
    ...(execution.launches ? { launches: execution.launches.map(projectRemoteLaunch) } : {}),
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
});

/**
 * A root view's remote executions: its stored links with this owner's node names. The view never waits for a peer
 * (only this node's peer list is read); the summaries follow as events.
 */
export const remoteTaskExecutionDtos = async (links: readonly RemoteTaskExecution[] | undefined): Promise<readonly RemoteTaskExecutionDto[]> =>
  (await describeRemoteTaskExecutions(links ?? [], findProcessRemoteRunChannel())).map(projectRemoteTaskExecution);
