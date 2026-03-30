import type {
  AgentRunHistoryIndexFileRecord,
  AgentRunHistoryIndexRowRecord,
  AgentRunStatusRecord,
} from "../store/agent-run-history-index-record-types.js";
export {
  AGENT_RUN_HISTORY_INDEX_RECORD_VERSION as RUN_HISTORY_INDEX_VERSION,
} from "../store/agent-run-history-index-record-types.js";

export type RunKnownStatus = AgentRunStatusRecord;

export type RunHistoryIndexRow = AgentRunHistoryIndexRowRecord;

export type RunHistoryIndexFile = AgentRunHistoryIndexFileRecord;

export interface RunHistoryItem {
  runId: string;
  summary: string;
  lastActivityAt: string;
  lastKnownStatus: RunKnownStatus;
  isActive: boolean;
}

export interface RunHistoryAgentGroup {
  agentDefinitionId: string;
  agentName: string;
  runs: RunHistoryItem[];
}

export interface RunHistoryWorkspaceGroup {
  workspaceRootPath: string;
  workspaceName: string;
  agents: RunHistoryAgentGroup[];
}
