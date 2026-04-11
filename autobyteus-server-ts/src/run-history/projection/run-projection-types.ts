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
  | "denied";

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

export interface RunProjectionActivityEntry {
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
