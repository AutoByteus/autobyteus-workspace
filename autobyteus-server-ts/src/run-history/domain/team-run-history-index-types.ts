import type { AgentApiStatus } from "../../agent-execution/domain/agent-status-payload.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type {
  TeamRunDeleteLifecycleRecord,
  TeamRunIndexFileRecord,
  TeamRunIndexRowRecord,
  TeamRunStatusRecord,
} from "../store/team-run-history-index-record-types.js";
import type { TeamRunMemberMetadata } from "../store/team-run-metadata-types.js";
export {
  TEAM_RUN_HISTORY_INDEX_RECORD_VERSION as TEAM_RUN_HISTORY_INDEX_VERSION,
} from "../store/team-run-history-index-record-types.js";

export type TeamRunKnownStatus = TeamRunStatusRecord;

export type TeamRunDeleteLifecycle = TeamRunDeleteLifecycleRecord;

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
  lastActivityAt: string;
  status: AgentApiStatus;
  lastKnownStatus: TeamRunKnownStatus;
  deleteLifecycle: TeamRunDeleteLifecycle;
  isActive: boolean;
  members: TeamRunMemberHistoryItem[];
  memberTree: TeamRunMemberMetadata[];
}
