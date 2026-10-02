import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";

/** One immutable Team subtree captured after materialization admission closes. */
export interface FrozenTeamRunTerminationScope {
  fenceAgentRunsForRootShutdown(): Promise<AgentOperationResult>;
  finish(): Promise<AgentOperationResult>;
}
