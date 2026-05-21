import type { AgentApiStatus } from "../../agent-execution/domain/agent-status-payload.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type {
  TeamRunIndexFileRecord,
  TeamRunIndexRowRecord,
} from "../store/team-run-history-index-record-types.js";
import type { TeamRunMemberMetadata } from "../store/team-run-metadata-types.js";

export type TeamRunKnownStatus = "ACTIVE" | "IDLE" | "ERROR";

export type TeamRunIndexRow = TeamRunIndexRowRecord;

export type TeamRunIndexFile = TeamRunIndexFileRecord;

export interface TeamRunMemberHistoryItem {
  memberRouteKey: string;
  memberName: string;
  memberRunId: string;
  status: AgentApiStatus;
  runtimeKind: RuntimeKind;
  platformAgentRunId: string | null;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  llmConfig: Record<string, unknown> | null;
  workspaceRootPath: string | null;
}

export interface TeamRunHistoryItem {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  coordinatorMemberRouteKey: string;
  workspaceRootPath: string | null;
  summary: string;
  createdAt: string;
  archivedAt: string | null;
  terminatedAt: string | null;
  status: AgentApiStatus;
  isActive: boolean;
  members: TeamRunMemberHistoryItem[];
  memberTree: TeamRunMemberMetadata[];
}
