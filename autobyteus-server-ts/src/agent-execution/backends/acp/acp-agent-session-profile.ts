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

/** Provider-reported phase of a context compaction. */
export type AcpCompactionPhase = "started" | "completed" | "failed" | "cancelled";

/** Typed outcome of an agent extension notification; everything else is ignored. */
export type AcpExtEffect =
  | Readonly<{ kind: "usage"; payload: Record<string, unknown> }>
  | Readonly<{ kind: "mcp_status"; server: string; status: AcpMcpServerStatus; detail: string | null }>
  /** `details` are the agent's own fields, read back only by the profile's payload builder. */
  | Readonly<{ kind: "compaction"; phase: AcpCompactionPhase; eventId: string | null; details: Record<string, unknown> }>;

/**
 * One COMPACTION_STATUS to build. `operationId` identifies the compaction across its events;
 * `abandoned` is the session closing an open compaction whose turn ended first.
 */
export type AcpCompactionStatusInput = Readonly<{
  sessionId: string;
  turnId: string;
  phase: AcpCompactionPhase | "abandoned";
  operationId: string;
  eventId: string | null;
  details: Record<string, unknown>;
  trigger: "auto" | "manual" | null;
  reason: string | null;
}>;

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
  /** Runtime identity of compaction statuses; profiles without it produce no compaction events. */
  buildCompactionStatusPayload?(input: AcpCompactionStatusInput): Record<string, unknown>;
}
