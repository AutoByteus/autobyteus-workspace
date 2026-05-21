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

export type AgentRunHistoryIndexFileRecord = AgentRunHistoryIndexRowRecord[];
