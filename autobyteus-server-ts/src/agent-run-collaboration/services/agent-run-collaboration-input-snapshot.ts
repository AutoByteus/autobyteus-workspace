import type { LiveAgentInputSnapshot } from "../../agent-collaboration/execution/domain/live-agent-input-snapshot.js";
import type { AgentRunCollaborationExecutionIndex } from "./agent-run-collaboration-execution-index.js";

/** Team recursion may report the same leaf; the host never belongs to this projection. */
export const collectAgentRootInputSnapshots = (
  index: AgentRunCollaborationExecutionIndex,
  snapshots: readonly LiveAgentInputSnapshot[],
): readonly LiveAgentInputSnapshot[] => {
  const children = new Set(index.listChildAgents().map(child => child.agentRunId));
  const inputs = new Map<string, LiveAgentInputSnapshot>();
  for (const snapshot of snapshots) {
    if (!children.has(snapshot.agent_run_id)) throw new Error(`Input snapshot '${snapshot.agent_run_id}' is not an Agent-root child.`);
    inputs.set(snapshot.agent_run_id, snapshot);
  }
  return Object.freeze([...inputs.values()]);
};
