import type { MemoryTraceEvent } from "../../agent-memory/domain/models.js";
import type { RuntimeTranslation } from "./runtimes/runtime-translation.js";
import { parseTeammateMessage } from "./teammate-message-envelope.js";

/**
 * Contract §8: the journal line of every record that is not a tool call or result. A record is
 * either shown (a message with a label, or one fixed line) or omitted with its documented reason.
 */
export type NonToolRecordLine =
  | Readonly<{ kind: "message"; label: string; text: string; extraLines: readonly string[] }>
  | Readonly<{ kind: "line"; text: string }>
  | Readonly<{ kind: "omitted"; reason: string }>;

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value === "string") {
    try { return asRecord(JSON.parse(value)); } catch { return null; }
  }
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
};

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/** 9847 → `9,847` (deterministic, independent of the host locale). */
export const formatCount = (value: number): string =>
  String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const formatDuration = (milliseconds: number): string => {
  const seconds = milliseconds / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ${Math.round(seconds - minutes * 60)} s`;
};

const attachmentLine = (record: MemoryTraceEvent): string[] => {
  const locators = [
    ...(record.media?.images ?? []),
    ...(record.media?.audio ?? []),
    ...(record.media?.video ?? []),
    ...(record.scope === "turn" ? (record.fileAttachments ?? []).map((file) => file.uri) : []),
  ];
  return locators.length ? [`Attachments: ${locators.join(", ")}`] : [];
};

const userLine = (record: MemoryTraceEvent, translation: RuntimeTranslation): NonToolRecordLine => {
  const content = record.content ?? "";
  const teammate = parseTeammateMessage(content);
  if (teammate) {
    return {
      kind: "message",
      label: `Message from ${teammate.sender}`,
      text: teammate.text,
      extraLines: [...(teammate.files.length ? [`Files: ${teammate.files.join(", ")}`] : []), ...attachmentLine(record)],
    };
  }
  const text = translation.normalizeUserText ? translation.normalizeUserText(content) : content;
  return { kind: "message", label: "User", text, extraLines: attachmentLine(record) };
};

const compactionLine = (record: MemoryTraceEvent): NonToolRecordLine => {
  const details = asRecord(record.toolResult) ?? {};
  const status = typeof details.status === "string" ? details.status : null;
  if (status === "failed") {
    const reason = typeof details.error_message === "string" && details.error_message.trim()
      ? details.error_message.trim() : "reason not recorded";
    return { kind: "line", text: `Context compaction failed: ${reason}` };
  }
  if (status !== "compacted") return { kind: "omitted", reason: "compaction started marker" };
  const trigger = details.trigger === "auto" ? "automatic" : details.trigger === "manual" ? "manual" : null;
  const before = asNumber(details.pre_tokens);
  const after = asNumber(details.post_tokens);
  const duration = asNumber(details.duration_ms);
  const parts = [
    ...(trigger ? [trigger] : []),
    ...(before !== null && after !== null ? [`${formatCount(before)} → ${formatCount(after)} tokens`] : []),
    ...(duration !== null ? [formatDuration(duration)] : []),
  ];
  return { kind: "line", text: parts.length ? `Context compacted (${parts.join("; ")})` : "Context compacted" };
};

/** The system note to the agent ("Do not retry, resume …") is not reproduced. */
const interruptionLine = (record: MemoryTraceEvent): NonToolRecordLine => {
  const reason = /Reason: ([^\s.]+)/.exec(record.content ?? "")?.[1];
  return { kind: "line", text: reason ? `Turn interrupted (${reason.replace(/_/g, " ")}).` : "Turn interrupted." };
};

export const nonToolRecordLine = (record: MemoryTraceEvent, translation: RuntimeTranslation): NonToolRecordLine => {
  switch (record.traceType) {
    case "user":
      return userLine(record, translation);
    case "assistant": {
      const raw = record.content ?? "";
      const text = translation.normalizeAgentText ? translation.normalizeAgentText(raw) : raw;
      return text.trim().length ? { kind: "message", label: "Agent", text, extraLines: [] }
        : { kind: "omitted", reason: "empty agent text" };
    }
    case "reasoning":
      return { kind: "omitted", reason: "model reasoning" };
    case "system_task_notification":
      return { kind: "message", label: "Notice", text: record.content ?? "", extraLines: [] };
    case "system_instruction":
      return { kind: "line", text: `System instructions set (${formatCount(Array.from(record.content ?? "").length)} chars)` };
    case "provider_compaction_boundary":
      return compactionLine(record);
    case "operation_boundary":
      return interruptionLine(record);
    case "llm_request_recovery":
      return { kind: "line", text: "Notice: a model request failed before a usable response and was rolled back." };
    case "output_limit_recovery":
      return {
        kind: "line",
        text: "Notice: the previous response was cut off by the output limit; the agent was asked to continue.",
      };
    case "tool_continuation":
      return { kind: "omitted", reason: "tool continuation bookkeeping" };
    default:
      // A record type the contract does not name is shown, never dropped silently (REQ-W2).
      return { kind: "message", label: `Record (${record.traceType || "type not recorded"})`, text: record.content ?? "", extraLines: [] };
  }
};
