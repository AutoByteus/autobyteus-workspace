/** A delivered message's text when the sender named the receiver by its run ID (REQ-009, contract §2: today's text). */
export const MESSAGE_DELIVERED_TEXT = "Message delivered.";

/** The run has no active turn, or the turn asked for is no longer the runtime's active turn. */
export const NO_ACTIVE_TURN = "NO_ACTIVE_TURN";

/** The addressed AgentRun is not running (shut down in its root, or not live on its node). */
export const RUN_NOT_ACTIVE = "RUN_NOT_ACTIVE";

export interface AgentOperationResult {
  accepted: boolean;
  code?: string;
  message?: string;
  turnId?: string | null;
  platformAgentRunId?: string | null;
  agentRunId?: string | null;
  displayName?: string | null;
  /** The receiving agent's address in its own run, when a run accepts a message from another run or node (autobyteus-565). */
  agentAddress?: string | null;
  /** How many reference files a message to another node carried, copied there (autobyteus-587 RF-6); absent for none. */
  filesSent?: number;
}
