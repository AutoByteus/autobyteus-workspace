import type { AgentRuntimeKind } from '~/types/agent/AgentRunConfig';
import type { AgentStatus } from '~/types/agent/AgentStatus';
import type { RunProjectionConversationEntry } from '~/services/runHydration/runProjectionConversation';
import type { RunProjectionActivityEntry } from '~/services/runHydration/runProjectionActivityHydration';
import type { TeamRunExecutionTreeDto } from '@autobyteus/team-stream-contracts';
import type { AgentOrgExecutionTree } from '~/types/collaboration/agentOrgExecution';
import type { RunTreeWorkspaceNode } from '~/utils/runTreeProjection';

export type RunKnownStatus = 'ACTIVE' | 'IDLE' | 'ERROR' | 'TERMINATED';

export interface RunHistoryItem {
  runId: string;
  /** The run's name from the server (autobyteus-461 SR-091): a delegated run's slot; null for one nobody delegated (its definition names it). */
  displayName?: string | null;
  summary: string;
  createdAt: string;
  /** When the run was last active, its delegated work included; `createdAt` before any (server, DS-005). */
  lastActivityAt: string;
  archivedAt?: string | null;
  terminatedAt?: string | null;
  status: AgentStatus;
  isActive: boolean;
  shouldConnectStream?: boolean;
  statusSource?: string;
  /** The run has a collaboration package (task children brought in with `@`). */
  hasCollaboration?: boolean;
}

export interface RunHistoryAgentGroup {
  agentDefinitionId: string;
  agentName: string;
  agentAvatarUrl?: string | null;
  runs: RunHistoryItem[];
}

export interface RunHistoryWorkspaceGroup {
  workspaceRootPath: string;
  workspaceName: string;
  agentDefinitions: RunHistoryAgentGroup[];
  teamDefinitions: TeamRunHistoryDefinitionGroup[];
}

export interface AgentOrgRunHistoryItem {
  stableKey: string;
  rootSubjectKind: 'agent_org';
  rootRunId: string;
  createdAt: string;
  /** When any agent of the run was last active; `createdAt` before any (server, DS-005). */
  lastActivityAt: string;
  archivedAt: string | null;
  isActive: boolean;
  summary: string;
  executionTree: AgentOrgExecutionTree;
}

export interface AgentOrgHistoryDefinitionGroup {
  stableKey: string;
  definitionId: string;
  name: string;
  runs: AgentOrgRunHistoryItem[];
}

export interface WorkspaceHistoryWorkspaceNode extends RunTreeWorkspaceNode {
  stableKey: string;
  agentOrgDefinitions: AgentOrgHistoryDefinitionGroup[];
}

export interface RunHistoryFamilyErrors {
  workspace: string | null;
  agentOrg: string | null;
}

export interface RunModelConfigEditability {
  editable: boolean;
  reason?: string | null;
}

export interface RunMetadataConfigPayload {
  agentDefinitionId: string;
  workspaceRootPath: string;
  llmModelIdentifier: string;
  llmConfig?: Record<string, unknown> | null;
  autoExecuteTools: boolean;
  runtimeKind?: AgentRuntimeKind | null;
  runtimeReference?: {
    runtimeKind: string;
    sessionId?: string | null;
    threadId?: string | null;
    metadata?: Record<string, unknown> | null;
  } | null;
}

export interface RunResumeConfigPayload {
  runId: string;
  /** The run's name from the server (autobyteus-461 SR-091): a delegated run's slot; null for one nobody delegated (its definition names it). */
  displayName?: string | null;
  isActive: boolean;
  metadataConfig: RunMetadataConfigPayload;
  modelConfigEditability: RunModelConfigEditability;
}

export type TeamRunDeleteLifecycle = 'READY' | 'CLEANUP_PENDING';

export interface TeamRunMemberHistoryItem {
  memberAddress: string;
  displayName: string;
  agentRunId: string;
  status: AgentStatus;
  runtimeKind?: AgentRuntimeKind | null;
  runtimeReference?: {
    runtimeKind: string;
    sessionId?: string | null;
    threadId?: string | null;
    metadata?: Record<string, unknown> | null;
  } | null;
  workspaceRootPath?: string | null;
}

export interface TeamRunHistoryItem {
  teamRunId: string;
  /** The run's name from the server (autobyteus-461 SR-091): a delegated run's slot; null for one nobody delegated (its definition names it). */
  displayName?: string | null;
  teamDefinitionId: string;
  teamDefinitionName: string;
  coordinatorAddress: string;
  workspaceRootPath?: string | null;
  summary: string;
  createdAt: string;
  /** When any agent of the run was last active; `createdAt` before any (server, DS-005). */
  lastActivityAt: string;
  archivedAt?: string | null;
  terminatedAt?: string | null;
  isActive: boolean;
  rootTeam: TeamRunExecutionTreeDto['root_team'];
  members: TeamRunMemberHistoryItem[];
}

export interface TeamRunHistoryDefinitionGroup {
  teamDefinitionId: string;
  teamDefinitionName: string;
  runs: TeamRunHistoryItem[];
}

export interface TeamRunResumeConfigPayload {
  teamRunId: string;
  /** The run's name from the server (autobyteus-461 SR-091): a delegated run's slot; null for one nobody delegated (its definition names it). */
  displayName?: string | null;
  isActive: boolean;
  executionTree: TeamRunExecutionTreeDto;
  modelConfigEditability: RunModelConfigEditability;
}

export interface TeamRunExecutionCheckpointPayload {
  rootTeamRunId: string;
  changeSequence: number;
  hasOpenExecutionWork: boolean;
}

export interface TeamMemberTreeRow {
  teamRunId: string;
  kind: 'agent' | 'agent_team';
  memberAddress: string;
  displayName: string;
  agentRunId?: string | null;
  teamDefinitionId?: string | null;
  teamRunIdForNode?: string | null;
  coordinatorAddress?: string | null;
  workspaceRootPath: string | null;
  summary: string;
  lastActivityAt: string;
  currentStatus: AgentStatus | null;
  isActive: boolean;
  deleteLifecycle: TeamRunDeleteLifecycle;
  children: TeamMemberTreeRow[];
}

export interface TeamMemberFocusTarget {
  teamRunId: string;
  memberAddress: string;
  agentRunId: string;
}

export interface TeamMemberInspectionAttempt {
  state: 'loading' | 'error';
  detail: string | null;
}

export interface RunHistoryTeamExecutionRowBase {
  teamRunId: string;
  memberAddress: string;
  agentRunId: string | null;
  teamRunIdForNode: string | null;
  rowKey: string;
  memberKind: TeamMemberTreeRow['kind'];
  displayName: string;
  depth: number;
  hasChildren: boolean;
}

export interface RunHistoryStableExecutionRow extends RunHistoryTeamExecutionRowBase {
  kind: 'stable_member';
  row: TeamMemberTreeRow;
}

/**
 * Where a delegated row opens (autobyteus-461 SR-083): the run's own identity and the agent to focus, as the server
 * built it (a team its coordinator); a peer run's names its node. A delegated Team's member row opens that Team on that
 * member. Clients never decide it (FU-024, FU-031).
 */
export type RowOpenTarget = Readonly<{ runKind: 'agent' | 'agent_team'; runId: string; agentRunId: string; nodeId?: string }>;

export interface RunHistoryDelegatedRunRow extends RunHistoryTeamExecutionRowBase {
  kind: 'delegated_run';
  /** Where it opens; null for a row error (a team run whose coordinator is not a member), absent where none was sent. */
  openTarget?: RowOpenTarget | null;
  delegatedRunKind: 'task_agent' | 'task_team' | 'task_team_child';
  currentStatus: AgentStatus | string | null;
  /** Display name of the AgentRun that started a delegated child row; null otherwise. */
  delegatedBy: string | null;
  /**
   * autobyteus-278: set on a run another node runs (this node's delegation started it): the run, its node's name, and
   * what its node last answered (`reachable` and `title` are `null` until it answered), from its tree row's `peer`.
   */
  remote?: Readonly<{ runId: string; nodeName: string; reachable: boolean | null; title: string | null }> | null;
}

export type RunHistoryTeamExecutionRow =
  | RunHistoryStableExecutionRow
  | RunHistoryDelegatedRunRow;

export interface TeamTreeNode {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  workspaceRootPath: string;
  summary: string;
  lastActivityAt: string;
  isActive: boolean;
  deleteLifecycle: TeamRunDeleteLifecycle;
  focusedAgentRunId: string;
  rootTeam: TeamMemberTreeRow;
  members: TeamMemberTreeRow[];
  executionRows: RunHistoryTeamExecutionRow[];
}

export interface ListWorkspaceRunHistoryQueryData {
  listWorkspaceRunHistory: RunHistoryWorkspaceGroup[];
}

export interface GetWorkspaceRunHistoryQueryData {
  workspaceRunHistory: RunHistoryWorkspaceGroup;
}

export interface TeamMemberRunProjectionPayload {
  agentRunId: string;
  conversation: RunProjectionConversationEntry[];
  activities: RunProjectionActivityEntry[];
  summary?: string | null;
  lastActivityAt?: string | null;
  hasEarlierActiveTraceEvents: boolean;
}

export interface GetTeamMemberRunProjectionQueryData {
  getTeamMemberRunProjection: TeamMemberRunProjectionPayload;
}

export interface GetTeamRunResumeConfigQueryData {
  getTeamRunResumeConfig: {
    teamRunId: string;
    isActive: boolean;
    executionTree: unknown;
    modelConfigEditability: RunModelConfigEditability;
  };
}

export interface GetTeamRunExecutionCheckpointQueryData {
  getTeamRunExecutionCheckpoint: TeamRunExecutionCheckpointPayload;
}

export interface DeleteStoredRunMutationData {
  deleteStoredRun: {
    success: boolean;
    message: string;
  };
}

export interface ArchiveStoredRunMutationData {
  archiveStoredRun: {
    success: boolean;
    message: string;
  };
}

export interface DeleteStoredTeamRunMutationData {
  deleteStoredTeamRun: {
    success: boolean;
    message: string;
  };
}

export interface ArchiveStoredTeamRunMutationData {
  archiveStoredTeamRun: {
    success: boolean;
    message: string;
  };
}

export interface DeleteStoredAgentOrgRunMutationData {
  deleteStoredAgentOrgRun: {
    success: boolean;
    message: string;
    orgRunId: string | null;
  };
}

export interface ArchiveStoredAgentOrgRunMutationData {
  archiveStoredAgentOrgRun: {
    success: boolean;
    message: string;
    orgRunId: string | null;
  };
}

/** Result of archiving the runs of one sidebar group. */
export interface RunGroupArchiveOutcome {
  archivedRunIds: string[];
  failedRunIds: string[];
  /** The server's reasons for the runs it refused, each naming what blocked it (CR-461-087, AC-008). */
  failureReasons?: string[];
}

/** Standalone agent group result; non-empty `activeRunIds` means the server archived nothing. */
export interface AgentRunGroupArchiveOutcome extends RunGroupArchiveOutcome {
  activeRunIds: string[];
}

export interface ArchiveStoredAgentRunGroupMutationData {
  archiveStoredAgentRunGroup: AgentRunGroupArchiveOutcome;
}
