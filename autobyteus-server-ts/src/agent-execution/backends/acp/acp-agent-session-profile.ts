import type { McpServer, SessionConfigOption } from "@agentclientprotocol/sdk";
import type { AgentToolMcpDescriptor } from "../../../agent-tools/mcp/agent-tool-mcp-session.js";
import type { ProviderCallObservation } from "../../../credential-proxy/provider-relays/provider-call-observation.js";
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

/** The system notice that says what woke the agent for a prompt it started itself (`SYSTEM_TASK_NOTIFICATION`). */
export type AcpPromptNotice = Readonly<{ content: string; senderId: string }>;

/**
 * Typed outcome of an agent extension notification or of a provider call observation; everything else is ignored.
 * `activity` is turn activity the agent sends no ACP frame for (its model is still streaming).
 * `prompt_running` / `prompt_completed` are the agent's own prompt signals: a prompt it runs (the client's prompt, or
 * one it queued itself, e.g. after a background command ended) and that prompt's end. The session decides what they
 * mean (`AcpAgentSession`, provider-started turns); a profile that never reports them keeps client turns only.
 */
export type AcpSessionEffect =
  | Readonly<{ kind: "usage"; payload: Record<string, unknown> }>
  | Readonly<{ kind: "mcp_status"; server: string; status: AcpMcpServerStatus; detail: string | null }>
  /** `details` are the agent's own fields, read back only by the profile's payload builder. */
  | Readonly<{ kind: "compaction"; phase: AcpCompactionPhase; eventId: string | null; details: Record<string, unknown> }>
  | Readonly<{ kind: "activity" }>
  /** `notice` is shown only when the prompt opens a provider-started turn; null when the agent gave no text. */
  | Readonly<{ kind: "prompt_running"; promptId: string; notice: AcpPromptNotice | null }>
  | Readonly<{ kind: "prompt_completed"; promptId: string; stopReason: string }>;

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

export type AcpSessionEffectContext = Readonly<{
  sessionId: string;
  turnId: string | null;
  /** One-based ordinal the next usage effect of this turn would take. */
  callOrdinal: number;
  model: string;
}>;

export type AcpMcpReadinessRequirement = Readonly<{ serverName: string; timeoutMs: number }>;

/** The run's model and reasoning effort, as the session applies them through config options. */
export type AcpConfigSelection = Readonly<{ model: string | null; reasoningEffort: string | null }>;

/** One `session/set_config_option` to send. */
export type AcpConfigOptionValue = Readonly<{ configId: string; value: string }>;

/**
 * Per-agent session concerns. Hooks are pure: the shared session owns ordinals, replay
 * suppression, event emission and when effects apply.
 */
export interface AcpAgentSessionProfile {
  newSessionMeta(input: Readonly<{ composedPrompt: string; autoExecuteTools: boolean }>): Record<string, unknown> | undefined;
  mcpServers(descriptor: AgentToolMcpDescriptor): McpServer[];
  /** Readiness the session must observe before activation completes, if the agent reports it. */
  mcpReadiness(descriptor: AgentToolMcpDescriptor): AcpMcpReadinessRequirement | null;
  projectToolCall(snapshot: AcpToolCallSnapshot): AcpToolCallProjection;
  interpretExtNotification(
    method: string,
    params: Record<string, unknown>,
    context: AcpSessionEffectContext,
  ): AcpSessionEffect[];
  /** The config options that select the run's model and effort among the session's offered options (in order). */
  configSelection(selection: AcpConfigSelection, configOptions: readonly SessionConfigOption[]): AcpConfigOptionValue[];
  /** Effects of one provider call of the run; agents whose calls go through no provider relay have none. */
  interpretProviderCall?(observation: ProviderCallObservation, context: AcpSessionEffectContext): AcpSessionEffect[];
  /** Runtime identity of compaction statuses; profiles without it produce no compaction events. */
  buildCompactionStatusPayload?(input: AcpCompactionStatusInput): Record<string, unknown>;
  /**
   * Whether a failed `session/load` or `session/resume` of `sessionId` is the agent's own answer that the session does not
   * exist (a lost runtime session, autobyteus-599), by its exact JSON-RPC shape. Any other failure is false.
   */
  isMissingSession(error: unknown, sessionId: string): boolean;
}
