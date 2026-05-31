import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata } from "../store/agent-run-metadata-types.js";

export type RunProjectionActivityType =
  | "tool_call"
  | "write_file"
  | "terminal_command"
  | "edit_file";

export type RunProjectionActivityStatus =
  | "parsing"
  | "parsed"
  | "awaiting-approval"
  | "approved"
  | "executing"
  | "success"
  | "error"
  | "denied"
  | "interrupted";

export type RunProjectionCompactionPhase =
  | "requested"
  | "started"
  | "completed"
  | "failed";

export type RunProjectionSourceDetailLevel = "full" | "source_limited";

export interface RunProjectionConversationEntry {
  kind: string;
  invocationId?: string | null;
  role?: string | null;
  content?: string | null;
  toolName?: string | null;
  toolArgs?: Record<string, unknown> | null;
  toolResult?: unknown | null;
  toolError?: string | null;
  media?: Record<string, string[]> | null;
  ts?: number | null;
}

export interface RunProjectionToolActivityEntry {
  kind: "tool";
  invocationId: string;
  toolName: string;
  type: RunProjectionActivityType;
  status: RunProjectionActivityStatus;
  contextText: string;
  arguments?: Record<string, unknown> | null;
  logs?: string[] | null;
  result?: unknown | null;
  error?: string | null;
  ts?: number | null;
  detailLevel?: RunProjectionSourceDetailLevel | null;
}

export interface RunProjectionCompactionActivityEntry {
  kind: "compaction";
  activityId: string;
  phase: RunProjectionCompactionPhase;
  message: string;
  turnId?: string | null;
  compactionOperationId?: string | null;
  requestedTurnId?: string | null;
  executionTurnId?: string | null;
  selectedBlockCount?: number | null;
  compactedBlockCount?: number | null;
  rawTraceCount?: number | null;
  semanticFactCount?: number | null;
  compactionAgentDefinitionId?: string | null;
  compactionAgentName?: string | null;
  compactionRuntimeKind?: string | null;
  compactionModelIdentifier?: string | null;
  compactionRunId?: string | null;
  compactionTaskId?: string | null;
  provider?: string | null;
  sourceSurface?: string | null;
  boundaryKey?: string | null;
  providerEventId?: string | null;
  providerSessionId?: string | null;
  trigger?: string | null;
  preTokens?: number | null;
  rotationEligible?: boolean | null;
  errorMessage?: string | null;
  ts?: number | null;
  updatedTs?: number | null;
  detailLevel?: RunProjectionSourceDetailLevel | null;
}

export type RunProjectionActivityEntry =
  | RunProjectionToolActivityEntry
  | RunProjectionCompactionActivityEntry;

export interface RunProjectionSourceDescriptor {
  runId: string;
  runtimeKind: RuntimeKind;
  workspaceRootPath: string | null;
  memoryDir: string | null;
  platformRunId: string | null;
  metadata: AgentRunMetadata | null;
}

export interface RunProjectionProviderInput {
  source: RunProjectionSourceDescriptor;
}

export interface RunProjectionProvider {
  readonly runtimeKind?: RuntimeKind;
  buildProjection(input: RunProjectionProviderInput): Promise<RunProjection | null>;
}

export interface RunProjection {
  runId: string;
  conversation: RunProjectionConversationEntry[];
  activities: RunProjectionActivityEntry[];
  summary: string | null;
  lastActivityAt: string | null;
}
