import type { McpServer } from "@agentclientprotocol/sdk";
import type { AgentToolMcpDescriptor } from "../../../agent-tools/mcp/agent-tool-mcp-session.js";
import type { AgentSegmentType } from "../../domain/agent-segment.js";

export type AcpToolCallStatus = "pending" | "in_progress" | "completed" | "failed";

/**
 * Accumulated standard ACP view of one tool call (`tool_call`, `tool_call_update`, or a
 * permission request's `toolCall`). `meta` is the opaque `_meta` object for agent profiles.
 */
export type AcpToolCallSnapshot = Readonly<{
  toolCallId: string;
  title: string | null;
  kind: string | null;
  status: AcpToolCallStatus;
  rawInput: unknown;
  rawOutput: unknown;
  content: readonly unknown[];
  locations: readonly Readonly<{ path: string }>[];
  meta: Readonly<Record<string, unknown>> | null;
}>;

/** Canonical AutoByteus tool identity for a card; `result`/`error` only for terminal calls. */
export type AcpToolCallProjection = Readonly<{
  toolName: string;
  segmentType: AgentSegmentType;
  arguments: Record<string, unknown>;
  result?: unknown;
  error?: string;
}>;

export type AcpMcpServerStatus = "ready" | "unavailable" | "pending";

/** Typed outcome of an agent extension notification; everything else is ignored. */
export type AcpExtEffect =
  | Readonly<{ kind: "usage"; payload: Record<string, unknown> }>
  | Readonly<{ kind: "mcp_status"; server: string; status: AcpMcpServerStatus; detail: string | null }>;

export type AcpExtNotificationContext = Readonly<{
  sessionId: string;
  turnId: string | null;
  /** One-based ordinal the next usage effect of this turn would take. */
  callOrdinal: number;
  model: string;
}>;

export type AcpMcpReadinessRequirement = Readonly<{ serverName: string; timeoutMs: number }>;

/**
 * Per-agent session concerns. Hooks are pure: the shared session owns ordinals, replay
 * suppression, event emission and when effects apply.
 */
export interface AcpAgentSessionProfile {
  newSessionMeta(input: Readonly<{ composedPrompt: string; autoExecuteTools: boolean }>): Record<string, unknown> | undefined;
  mcpServers(descriptor: AgentToolMcpDescriptor | null): McpServer[];
  /** Readiness the session must observe before activation completes, if the agent reports it. */
  mcpReadiness(descriptor: AgentToolMcpDescriptor | null): AcpMcpReadinessRequirement | null;
  projectToolCall(snapshot: AcpToolCallSnapshot): AcpToolCallProjection;
  interpretExtNotification(
    method: string,
    params: Record<string, unknown>,
    context: AcpExtNotificationContext,
  ): AcpExtEffect[];
}
