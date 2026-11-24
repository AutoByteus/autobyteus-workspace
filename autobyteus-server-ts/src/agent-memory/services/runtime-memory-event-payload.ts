import type { AgentRunUserMessageForwardedPayload } from "../../agent-execution/domain/agent-run-command-observer.js";
import { serverTimeMsOf } from "../../agent-execution/domain/agent-run-event.js";
import { partitionRawTraceAttachments } from "autobyteus-ts/memory/models/raw-trace-attachments.js";

export const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const asContentString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

export const extractTurnId = (payload: Record<string, unknown>): string | null =>
  asString(payload["turnId"]) ?? asString(payload["turn_id"]);

export const extractContentDelta = (payload: Record<string, unknown>): string | null =>
  asContentString(payload["delta"]) ??
  asContentString(payload["content"]) ??
  asContentString(payload["text"]) ??
  asContentString(payload["message"]);

/**
 * A recorded event's trace time, epoch seconds (autobyteus-628 D-3): the run's `occurredAt`, the one time the streams show
 * for the event too. An event without it fails here, as on the streams: no runtime or provider clock stands in.
 */
export const extractEventTime = (event: Readonly<{ eventType: string; occurredAt?: number }>): number =>
  serverTimeMsOf(event) / 1000;

export const extractInvocationId = (payload: Record<string, unknown>): string | null =>
  asString(payload["invocation_id"]) ??
  asString(payload["tool_invocation_id"]) ??
  asString(payload["tool_call_id"]) ??
  asString(payload["call_id"]);

export const extractToolName = (payload: Record<string, unknown>): string | null => {
  const metadata = asRecord(payload["metadata"]);
  return asString(payload["tool_name"]) ?? asString(payload["name"]) ?? asString(metadata?.["tool_name"]);
};

export const extractToolArgs = (payload: Record<string, unknown>): Record<string, unknown> | undefined =>
  asRecord(payload["arguments"]) ?? asRecord(payload["tool_args"]) ?? asRecord(payload["args"]) ?? undefined;

export const extractToolResult = (payload: Record<string, unknown>): unknown =>
  payload["result"] ?? payload["tool_result"] ?? null;

export const extractError = (payload: Record<string, unknown>): string | null =>
  asString(payload["error"]) ?? asString(payload["tool_error"]);

export const extractReason = (payload: Record<string, unknown>): string | null =>
  asString(payload["reason"]);

export const asBoolean = (value: unknown): boolean | null =>
  typeof value === "boolean" ? value : null;

export const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export const extractForwardedMessageAttachments = (
  message: AgentRunUserMessageForwardedPayload["message"],
) => partitionRawTraceAttachments(message.contextFiles ?? []);
