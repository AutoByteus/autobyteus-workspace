export interface AgentRunHistoryIndexRowRecord {
  runId: string;
  agentDefinitionId: string;
  agentName: string;
  workspaceRootPath: string;
  summary: string;
  createdAt: string;
  archivedAt?: string | null;
  terminatedAt?: string | null;
  /** Present (true) once the run has a collaboration package; absent means none. */
  hasCollaboration?: true;
}

export type AgentRunHistoryIndexFileRecord = AgentRunHistoryIndexRowRecord[];
