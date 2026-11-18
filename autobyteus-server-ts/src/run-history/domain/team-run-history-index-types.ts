import type { AgentApiStatus } from "../../agent-execution/domain/agent-status-payload.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type {
  TeamRunIndexFileRecord,
  TeamRunIndexRowRecord,
} from "../store/team-run-history-index-record-types.js";
import type { TeamRunExecutionTreeDto } from "@autobyteus/team-stream-contracts";

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
  /** The run's name (SR-091): a delegated team run's slot; `null` for one the user started, which its definition names. */
  displayName: string | null;
  teamDefinitionId: string;
  teamDefinitionName: string;
  coordinatorAddress: string;
  workspaceRootPath: string | null;
  summary: string;
  createdAt: string;
  /** Newest memory file of any agent of the run; `createdAt` before any (`RunLastActivityReader`). */
  lastActivityAt: string;
  archivedAt: string | null;
  terminatedAt: string | null;
  isActive: boolean;
  members: TeamRunMemberHistoryItem[];
  rootTeam: TeamRunExecutionTreeDto["root_team"];
}
