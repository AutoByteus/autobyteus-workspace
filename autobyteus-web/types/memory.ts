export type AgentMemoryAttribution = 'DEFINITION' | 'UNATTRIBUTED';
export type MemoryExplorerSourceType = 'LOCAL' | 'IMPORTED';

export interface MemoryExplorerSourceInput {
  type: MemoryExplorerSourceType;
  sourceNodeId?: string | null;
}

export interface MemoryExplorerSourceOption {
  key: string;
  type: MemoryExplorerSourceType;
  label: string;
  sourceNodeId?: string | null;
  displayName?: string | null;
  readOnly: boolean;
  lastImportedAt?: string | null;
  lastSyncStatus?: string | null;
}

export interface MemoryAvailabilitySummary {
  latestMemoryAt?: string | null;
  hasWorkingContext: boolean;
  hasEpisodic: boolean;
  hasSemantic: boolean;
  hasRawTraces: boolean;
  hasRawArchive: boolean;
}

export interface AgentWithMemorySelector {
  attribution: AgentMemoryAttribution;
  agentDefinitionId?: string | null;
}

export interface AgentWithMemorySummary {
  attribution: AgentMemoryAttribution;
  agentDefinitionId?: string | null;
  displayName: string;
  stableId: string;
  runCount: number;
  latestMemoryAt?: string | null;
  memory: MemoryAvailabilitySummary;
}

export interface AgentRunMemorySummary {
  runId: string;
  agentDefinitionId?: string | null;
  agentName?: string | null;
  summary?: string | null;
  workspaceRootPath?: string | null;
  createdAt?: string | null;
  lastUpdatedAt?: string | null;
  memory: MemoryAvailabilitySummary;
}

export interface AgentTeamWithMemorySummary {
  teamDefinitionId: string;
  teamDefinitionName: string;
  teamRunCount: number;
  memberMemoryCount: number;
  latestMemoryAt?: string | null;
  memory: MemoryAvailabilitySummary;
}

export type CollaborationMemberExecutionKind = 'CONFIGURED' | 'TASK_AGENT' | 'TASK_TEAM_MEMBER';

/** A configured or task team on a member's path; `teamRunId` identifies it (a task team may share an address). */
export interface CollaborationMemoryGroup {
  teamRunId: string;
  address: string;
  displayName: string;
  kind: 'CONFIGURED_TEAM' | 'TASK_TEAM';
  startedAt?: string | null;
}

export interface CollaborationMemberMemoryTargetSummary {
  memberAddress: string;
  displayName: string;
  agentRunId: string;
  agentDefinitionId?: string | null;
  executionKind: CollaborationMemberExecutionKind;
  /** Task agents only. */
  startedAt?: string | null;
  /** Outermost first; the root team or org is never a group. */
  groupPath: CollaborationMemoryGroup[];
  lastUpdatedAt?: string | null;
  memory: MemoryAvailabilitySummary;
}

export interface AgentTeamRunMemorySummary {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  summary?: string | null;
  workspaceRootPath?: string | null;
  createdAt?: string | null;
  lastUpdatedAt?: string | null;
  memory: MemoryAvailabilitySummary;
  memberTargets: CollaborationMemberMemoryTargetSummary[];
}

export interface AgentOrgWithMemorySummary {
  orgDefinitionId: string;
  orgDefinitionName: string;
  orgRunCount: number;
  memberMemoryCount: number;
  latestMemoryAt?: string | null;
  memory: MemoryAvailabilitySummary;
}

export interface AgentOrgRunMemorySummary {
  orgRunId: string;
  orgDefinitionId: string;
  orgDefinitionName: string;
  summary?: string | null;
  workspaceRootPath?: string | null;
  createdAt?: string | null;
  lastUpdatedAt?: string | null;
  memory: MemoryAvailabilitySummary;
  memberTargets: CollaborationMemberMemoryTargetSummary[];
}

/** One team or org run as rendered by the shared collaboration detail view. */
export interface CollaborationRunMemoryRow {
  runId: string;
  summary?: string | null;
  workspaceRootPath?: string | null;
  lastUpdatedAt?: string | null;
  memory: MemoryAvailabilitySummary;
  memberTargets: CollaborationMemberMemoryTargetSummary[];
}

export interface MemoryExplorerPage<T> {
  entries: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface MemoryMessage {
  role: string;
  content?: string | null;
  reasoning?: string | null;
  toolPayload?: Record<string, unknown> | null;
  ts?: number | null;
}

export interface MemoryTraceEvent {
  scope: 'run' | 'turn';
  id?: string | null;
  traceType: string;
  sourceEvent?: string | null;
  content?: string | null;
  toolName?: string | null;
  toolCallId?: string | null;
  toolArgs?: Record<string, unknown> | null;
  toolResult?: unknown | null;
  toolError?: string | null;
  media?: Record<string, string[]> | null;
  fileAttachments?: ReadonlyArray<{ uri: string; fileType: string; fileName: string | null }> | null;
  turnId: string | null;
  seq: number | null;
  ts: number;
}

export interface RawTraceFileSummary {
  fileName: string;
  kind: 'active' | 'segment';
  recordCount: number;
  segmentIndex?: number | null;
  firstTimestamp?: number | null;
  lastTimestamp?: number | null;
}

export interface RunMemoryView {
  runId: string;
  workingContext?: MemoryMessage[] | null;
  episodic?: Array<Record<string, unknown>> | null;
  semantic?: Array<Record<string, unknown>> | null;
  rawTraces?: MemoryTraceEvent[] | null;
  rawTraceFiles?: RawTraceFileSummary[] | null;
  selectedRawTraceFileName?: string | null;
}

export type MemoryInspectorTab = 'working' | 'episodic' | 'semantic' | 'raw';

export type MemoryInspectTarget =
  | {
      kind: 'agent_run';
      runId: string;
      agentAttribution?: AgentMemoryAttribution;
      agentDefinitionId?: string | null;
      agentDisplayName?: string | null;
      runLabel?: string | null;
      workspaceRootPath?: string | null;
      lastUpdatedAt?: string | null;
      source?: MemoryExplorerSourceInput;
    }
  | {
      kind: 'team_member_run';
      teamDefinitionId?: string | null;
      teamDefinitionName?: string | null;
      teamRunId: string;
      agentRunId: string;
      memberAddress?: string | null;
      memberName?: string | null;
      lastUpdatedAt?: string | null;
      source?: MemoryExplorerSourceInput;
    }
  | {
      kind: 'org_member_run';
      orgDefinitionId?: string | null;
      orgDefinitionName?: string | null;
      orgRunId: string;
      agentRunId: string;
      memberAddress?: string | null;
      memberName?: string | null;
      lastUpdatedAt?: string | null;
      source?: MemoryExplorerSourceInput;
    };
