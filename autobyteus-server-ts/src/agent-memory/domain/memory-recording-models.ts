import type { RawTraceMedia } from "autobyteus-ts/memory/models/raw-trace-item.js";

export type RuntimeMemoryTraceType =
  | "user"
  | "assistant"
  | "reasoning"
  | "tool_call"
  | "tool_result";

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
