export const AGENT_RUN_HISTORY_INDEX_RECORD_VERSION = 2;

export interface AgentRunHistoryIndexRowRecord {
  runId: string;
  agentDefinitionId: string;
  agentName: string;
  workspaceRootPath: string;
  summary: string;
  createdAt: string;
  archivedAt?: string | null;
  terminatedAt?: string | null;
}

export interface AgentRunHistoryIndexFileRecord {
  version: number;
  rows: AgentRunHistoryIndexRowRecord[];
}
