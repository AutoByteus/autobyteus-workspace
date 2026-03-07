export interface MemorySnapshotSummary {
  runId: string;
  lastUpdatedAt?: string | null;
  hasWorkingContext: boolean;
  hasEpisodic: boolean;
  hasSemantic: boolean;
  hasRawTraces: boolean;
  hasRawArchive: boolean;
}

export interface MemorySnapshotPage {
  entries: MemorySnapshotSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TeamMemberMemorySnapshotSummary {
  memberRouteKey: string;
  memberName: string;
  memberRunId: string;
  lastUpdatedAt?: string | null;
  hasWorkingContext: boolean;
  hasEpisodic: boolean;
  hasSemantic: boolean;
  hasRawTraces: boolean;
  hasRawArchive: boolean;
}

export interface TeamRunMemorySnapshotSummary {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  lastUpdatedAt?: string | null;
  members: TeamMemberMemorySnapshotSummary[];
}

export interface TeamRunMemorySnapshotPage {
  entries: TeamRunMemorySnapshotSummary[];
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
  toolArgs?: Record<string, unknown> | null;
  toolResult?: unknown | null;
  toolError?: string | null;
  media?: Record<string, string[]> | null;
  turnId: string;
  seq: number;
  ts: number;
}

export interface MemoryConversationEntry {
  kind: string;
  role?: string | null;
  content?: string | null;
  toolName?: string | null;
  toolArgs?: Record<string, unknown> | null;
  toolResult?: unknown | null;
  toolError?: string | null;
  media?: Record<string, string[]> | null;
  ts?: number | null;
}

export interface RunMemoryView {
  runId: string;
  workingContext?: MemoryMessage[] | null;
  episodic?: Array<Record<string, unknown>> | null;
  semantic?: Array<Record<string, unknown>> | null;
  conversation?: MemoryConversationEntry[] | null;
  rawTraces?: MemoryTraceEvent[] | null;
}
