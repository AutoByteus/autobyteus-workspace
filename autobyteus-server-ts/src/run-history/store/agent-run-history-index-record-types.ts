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
  /** The Project the run was started under; absent means it was not started under a Project. */
  projectId?: string;
}

export type AgentRunHistoryIndexFileRecord = AgentRunHistoryIndexRowRecord[];
