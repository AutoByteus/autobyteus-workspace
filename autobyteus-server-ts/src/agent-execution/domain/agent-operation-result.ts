/** A delivered message's text when the sender named the receiver by its run ID (REQ-009, contract §2: today's text). */
export const MESSAGE_DELIVERED_TEXT = "Message delivered.";

export interface AgentOperationResult {
  accepted: boolean;
  code?: string;
  message?: string;
  turnId?: string | null;
  platformAgentRunId?: string | null;
  agentRunId?: string | null;
  displayName?: string | null;
}
