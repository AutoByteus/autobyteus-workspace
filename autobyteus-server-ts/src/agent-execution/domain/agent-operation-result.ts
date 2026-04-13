export interface AgentOperationResult {
  accepted: boolean;
  code?: string;
  message?: string;
  turnId?: string | null;
  platformAgentRunId?: string | null;
  memberRunId?: string | null;
  memberName?: string | null;
}
