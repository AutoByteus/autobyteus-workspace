import type { RawTraceMedia } from "autobyteus-ts/memory/models/raw-trace-item.js";

export type RuntimeMemoryTraceType =
  | "user"
  | "assistant"
  | "reasoning"
  | "tool_call"
  | "tool_result"
  | "provider_compaction_boundary";

type RuntimeMemoryTraceInputBase = {
  turnId: string;
  content?: string | null;
  sourceEvent: string;
  ts?: number | null;
};

type RuntimeMemoryNonToolTraceInput = RuntimeMemoryTraceInputBase & {
  traceType: "user" | "assistant" | "reasoning";
  media?: RawTraceMedia | null;
  toolName?: never;
  toolCallId?: never;
  toolArgs?: never;
  toolResult?: never;
  toolError?: never;
  correlationId?: string | null;
};

export type RuntimeMemoryToolCallTraceInput = RuntimeMemoryTraceInputBase & {
  traceType: "tool_call";
  toolName: string;
  toolCallId: string;
  toolArgs: Record<string, unknown>;
  toolResult?: never;
  toolError?: never;
  media?: never;
  correlationId?: never;
};

export type RuntimeMemoryToolResultTraceInput = RuntimeMemoryTraceInputBase & {
  traceType: "tool_result";
  toolName: string;
  toolCallId: string;
  toolResult: unknown;
  toolError: string | null;
  toolArgs?: never;
  media?: never;
  correlationId?: never;
};

type RuntimeMemoryProviderBoundaryTraceInput = RuntimeMemoryTraceInputBase & {
  traceType: "provider_compaction_boundary";
  toolResult?: Record<string, unknown>;
  correlationId?: string | null;
  media?: never;
  toolName?: never;
  toolCallId?: never;
  toolArgs?: never;
  toolError?: never;
};

export type RuntimeMemoryTraceInput =
  | RuntimeMemoryNonToolTraceInput
  | RuntimeMemoryToolCallTraceInput
  | RuntimeMemoryToolResultTraceInput
  | RuntimeMemoryProviderBoundaryTraceInput;

export type ProviderCompactionBoundaryPayload = {
  kind: "provider_compaction_boundary";
  runtime_kind: "CODEX" | "CLAUDE" | string;
  provider: "codex" | "claude" | string;
  source_surface:
    | "codex.thread_compacted"
    | "codex.raw_response_compaction_item"
    | "codex.context_compaction_started"
    | "codex.context_compaction_completed"
    | "claude.compact_boundary"
    | "claude.status_compacting"
    | string;
  boundary_key: string;
  provider_thread_id?: string | null;
  provider_session_id?: string | null;
  provider_event_id?: string | null;
  provider_response_id?: string | null;
  provider_timestamp?: number | null;
  turn_id?: string | null;
  trigger?: "auto" | "manual" | string | null;
  status?: "compacting" | "compacted" | string | null;
  pre_tokens?: number | null;
  rotation_eligible: boolean;
  semantic_compaction: false;
};
