import type {
  AgentRunHistoryIndexFileRecord,
  AgentRunHistoryIndexRowRecord,
} from "../store/agent-run-history-index-record-types.js";
import type { AgentApiStatus } from "../../agent-execution/domain/agent-status-payload.js";

export type RunKnownStatus = "ACTIVE" | "IDLE" | "ERROR" | "TERMINATED";

export type RunHistoryIndexRow = AgentRunHistoryIndexRowRecord;

export type RunHistoryIndexFile = AgentRunHistoryIndexFileRecord;

export interface RunHistoryItem {
  runId: string;
  summary: string;
  status: AgentApiStatus;
  isActive: boolean;
  shouldConnectStream: boolean;
  statusSource: string;
  createdAt: string;
  archivedAt: string | null;
  terminatedAt: string | null;
  /** The run hosts collaborators (a stored or active Agent root package exists). */
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
