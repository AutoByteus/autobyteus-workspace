export type MemoryMessage = {
  role: string;
  content?: string | null;
  reasoning?: string | null;
  toolPayload?: Record<string, unknown> | null;
  ts?: number | null;
};

export type MemoryTraceEvent = {
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
  turnId: string;
  seq: number;
  ts: number;
};

export type RawTraceFileSummary = {
  fileName: string;
  kind: "active" | "segment";
  recordCount: number;
  segmentIndex?: number | null;
  firstTimestamp?: number | null;
  lastTimestamp?: number | null;
};

export type AgentMemoryView = {
  runId: string;
  workingContext?: MemoryMessage[] | null;
  episodic?: Array<Record<string, unknown>> | null;
  semantic?: Array<Record<string, unknown>> | null;
  rawTraces?: MemoryTraceEvent[] | null;
  rawTraceFiles?: RawTraceFileSummary[] | null;
  selectedRawTraceFileName?: string | null;
};

export type AgentMemoryAttribution = "DEFINITION" | "UNATTRIBUTED";

export type MemoryAvailabilitySummary = {
  latestMemoryAt?: string | null;
  hasWorkingContext: boolean;
  hasEpisodic: boolean;
  hasSemantic: boolean;
  hasRawTraces: boolean;
  hasRawArchive: boolean;
};

export type MemoryAvailabilityBuildResult = {
  availability: MemoryAvailabilitySummary;
  latestMemoryMtime: number;
};

export type AgentWithMemorySelector = {
  attribution: AgentMemoryAttribution;
  agentDefinitionId?: string | null;
};

export type AgentWithMemorySummary = {
  attribution: AgentMemoryAttribution;
  agentDefinitionId?: string | null;
  displayName: string;
  stableId: string;
  runCount: number;
  latestMemoryAt?: string | null;
  memory: MemoryAvailabilitySummary;
};

export type AgentRunMemorySummary = {
  runId: string;
  agentDefinitionId?: string | null;
  agentName?: string | null;
  summary?: string | null;
  workspaceRootPath?: string | null;
  createdAt?: string | null;
  lastUpdatedAt?: string | null;
  memory: MemoryAvailabilitySummary;
};

export type AgentTeamWithMemorySummary = {
  teamDefinitionId: string;
  teamDefinitionName: string;
  teamRunCount: number;
  memberMemoryCount: number;
  latestMemoryAt?: string | null;
  memory: MemoryAvailabilitySummary;
};

export type TeamMemberMemoryTargetSummary = {
  memberRouteKey: string;
  memberName: string;
  memberRunId: string;
  agentDefinitionId?: string | null;
  lastUpdatedAt?: string | null;
  memory: MemoryAvailabilitySummary;
};

export type AgentTeamRunMemorySummary = {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  summary?: string | null;
  workspaceRootPath?: string | null;
  createdAt?: string | null;
  lastUpdatedAt?: string | null;
  memory: MemoryAvailabilitySummary;
  memberTargets: TeamMemberMemoryTargetSummary[];
};

export type MemoryExplorerPage<T> = {
  entries: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
