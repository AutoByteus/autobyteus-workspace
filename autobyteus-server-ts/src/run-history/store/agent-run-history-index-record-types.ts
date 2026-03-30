export const AGENT_RUN_HISTORY_INDEX_RECORD_VERSION = 1;

export type AgentRunStatusRecord = "ACTIVE" | "IDLE" | "ERROR" | "TERMINATED";

export interface AgentRunHistoryIndexRowRecord {
  runId: string;
  agentDefinitionId: string;
  agentName: string;
  workspaceRootPath: string;
  summary: string;
  lastActivityAt: string;
  lastKnownStatus: AgentRunStatusRecord;
}

export interface AgentRunHistoryIndexFileRecord {
  version: number;
  rows: AgentRunHistoryIndexRowRecord[];
}
