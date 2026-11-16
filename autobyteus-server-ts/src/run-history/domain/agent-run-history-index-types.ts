import type { AgentRunHistoryIndexRowRecord } from "../store/agent-run-history-index-record-types.js";
import type { AgentApiStatus } from "../../agent-execution/domain/agent-status-payload.js";

export type RunKnownStatus = "ACTIVE" | "IDLE" | "ERROR" | "TERMINATED";

export type RunHistoryIndexRow = AgentRunHistoryIndexRowRecord;


export interface RunHistoryItem {
  runId: string;
  /** The run's name (SR-091): a delegated run's slot; `null` for a run nobody delegated, which its definition names. */
  displayName: string | null;
  summary: string;
  status: AgentApiStatus;
  isActive: boolean;
  shouldConnectStream: boolean;
  statusSource: string;
  createdAt: string;
  /** Newest memory file of the run and its delegated copies; `createdAt` before any (`RunLastActivityReader`). */
  lastActivityAt: string;
  archivedAt: string | null;
  terminatedAt: string | null;
  /** The row's stored flag (contract §3.5, model S1): set at the run's first delegation (SR-068). */
  hasCollaboration: boolean;
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
