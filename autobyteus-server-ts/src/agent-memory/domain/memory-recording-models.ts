import type { RawTraceMedia } from "autobyteus-ts/memory/models/raw-trace-item.js";

export type RuntimeMemoryTraceType =
  | "user"
  | "assistant"
  | "reasoning"
  | "tool_call"
  | "tool_result"
  | "provider_compaction_boundary";

export type RuntimeMemoryTraceInput = {
  traceType: RuntimeMemoryTraceType;
  turnId: string;
  content?: string | null;
  sourceEvent: string;
  ts?: number | null;
  media?: RawTraceMedia | null;
  toolName?: string | null;
  toolCallId?: string | null;
  toolArgs?: Record<string, unknown> | null;
  toolResult?: unknown;
  toolError?: string | null;
  correlationId?: string | null;
  tags?: string[];
  toolResultRef?: string | null;
};

export type RuntimeMemorySnapshotUpdate =
  | {
      kind: "user";
      content: string;
      media?: RawTraceMedia | null;
    }
  | {
      kind: "assistant";
      content: string | null;
      reasoning?: string | null;
    }
  | {
      kind: "tool_call";
      toolCallId: string;
      toolName: string;
      toolArgs: Record<string, unknown>;
    }
  | {
      kind: "tool_result";
      toolCallId: string;
      toolName: string;
      toolResult: unknown;
      toolError?: string | null;
    };

export type RuntimeMemoryWriteOperation = {
  trace: RuntimeMemoryTraceInput;
  snapshotUpdate?: RuntimeMemorySnapshotUpdate | null;
};

export type ProviderCompactionBoundaryPayload = {
  kind: "provider_compaction_boundary";
  runtime_kind: "CODEX" | "CLAUDE" | string;
  provider: "codex" | "claude" | string;
  source_surface:
    | "codex.thread_compacted"
    | "codex.raw_response_compaction_item"
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
