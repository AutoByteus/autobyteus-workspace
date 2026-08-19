import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";

/** One immutable Team subtree captured after materialization admission closes. */
export interface FrozenTeamRunTerminationScope {
  interruptActiveTurns(): Promise<AgentOperationResult>;
  prepareMemberRuns(): Promise<void>;
  finish(): Promise<AgentOperationResult>;
}
