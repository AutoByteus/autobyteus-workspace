export type MemoryMessage = {
  role: string;
  content?: string | null;
  reasoning?: string | null;
  toolPayload?: Record<string, unknown> | null;
  ts?: number | null;
};

export type MemoryTraceEvent = {
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
};

export type AgentMemoryView = {
  runId: string;
  workingContext?: MemoryMessage[] | null;
  episodic?: Array<Record<string, unknown>> | null;
  semantic?: Array<Record<string, unknown>> | null;
  rawTraces?: MemoryTraceEvent[] | null;
};

export type MemorySnapshotSummary = {
  runId: string;
  lastUpdatedAt?: string | null;
  hasWorkingContext: boolean;
  hasEpisodic: boolean;
  hasSemantic: boolean;
  hasRawTraces: boolean;
  hasRawArchive: boolean;
};

export type MemorySnapshotPage = {
  entries: MemorySnapshotSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
