import type { AgentApiStatus } from "../../agent-execution/domain/agent-status-payload.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type {
  TeamRunIndexFileRecord,
  TeamRunIndexRowRecord,
} from "../store/team-run-history-index-record-types.js";
import type { TeamRunAgentTeamNode } from "../../agent-team-execution/domain/team-run-config.js";

export type TeamRunIndexRow = TeamRunIndexRowRecord;

export type TeamRunIndexFile = TeamRunIndexFileRecord;

export interface TeamRunMemberHistoryItem {
  memberAddress: string;
  displayName: string;
  agentRunId: string;
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
  coordinatorAddress: string;
  workspaceRootPath: string | null;
  summary: string;
  createdAt: string;
  archivedAt: string | null;
  terminatedAt: string | null;
  isActive: boolean;
  members: TeamRunMemberHistoryItem[];
  rootTeam: TeamRunAgentTeamNode;
}
