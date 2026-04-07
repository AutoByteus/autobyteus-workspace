export interface AgentOperationResult {
  accepted: boolean;
  code?: string;
  message?: string;
  platformAgentRunId?: string | null;
  memberRunId?: string | null;
  memberName?: string | null;
}
