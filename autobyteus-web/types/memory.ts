export type AgentMemoryAttribution = 'DEFINITION' | 'UNATTRIBUTED';

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

export interface TeamMemberMemoryTargetSummary {
  memberRouteKey: string;
  memberName: string;
  memberRunId: string;
  agentDefinitionId?: string | null;
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
  memberTargets: TeamMemberMemoryTargetSummary[];
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
  traceType: string;
  content?: string | null;
  toolName?: string | null;
  toolCallId?: string | null;
  toolArgs?: Record<string, unknown> | null;
  toolResult?: unknown | null;
  toolError?: string | null;
  media?: Record<string, string[]> | null;
  turnId: string;
  seq: number;
  ts: number;
}

export interface RunMemoryView {
  runId: string;
  workingContext?: MemoryMessage[] | null;
  episodic?: Array<Record<string, unknown>> | null;
  semantic?: Array<Record<string, unknown>> | null;
  rawTraces?: MemoryTraceEvent[] | null;
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
    }
  | {
      kind: 'team_member_run';
      teamDefinitionId?: string | null;
      teamDefinitionName?: string | null;
      teamRunId: string;
      memberRunId: string;
      memberRouteKey?: string | null;
      memberName?: string | null;
      lastUpdatedAt?: string | null;
    };
