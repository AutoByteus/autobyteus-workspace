export interface AgentOperationResult {
  accepted: boolean;
  code?: string;
  message?: string;
  turnId?: string | null;
  platformAgentRunId?: string | null;
  agentRunId?: string | null;
  displayName?: string | null;
}
