import { normalizeLineEndings } from "./output-shortener.js";
import { OK, type NormalizedToolResult, type ToolOutcome } from "./tool-outcome.js";
import type { RecordedResult } from "./runtimes/runtime-translation.js";

/**
 * Contract §6 result envelopes shared by every runtime: AGY `{provider_state, output, …}`, MCP
 * `{content, structuredContent, isError, _meta}`, content-block lists and the media marker.
 * Base64 data is never reproduced.
 */
export type UnwrappedResult = Readonly<{
  /** The result's text, or null when nothing was recorded. */
  text: string | null;
  failed: boolean;
  /** Set when the result says the call was denied, with its reason (or null). */
  deniedReason?: string | null;
  denied: boolean;
}>;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

/** Compact JSON, keys in recorded order. */
export const compactJson = (value: unknown): string => JSON.stringify(value) ?? String(value);

/** A byte size as text, e.g. `812 B`, `45.3 KB`, `2.1 MB`. */
export const formatByteSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const base64Bytes = (data: string): number => {
  const trimmed = data.replace(/\s+/g, "");
  const padding = trimmed.endsWith("==") ? 2 : trimmed.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((trimmed.length * 3) / 4) - padding);
};

/** `[image image/png, 45.3 KB, not reproduced]`, leaving out the parts that are unknown. */
export const mediaMarker = (kind: string, mimeType: string | null, sizeBytes: number | null): string =>
  `[${[[kind, mimeType].filter(Boolean).join(" "), sizeBytes === null ? null : formatByteSize(sizeBytes)]
    .filter(Boolean).join(", ")}, not reproduced]`;

const isContentBlock = (value: unknown): value is Record<string, unknown> =>
  typeof asRecord(value)?.type === "string";

export const isContentBlockList = (value: unknown): value is Record<string, unknown>[] =>
  Array.isArray(value) && value.length > 0 && value.every(isContentBlock);

const blockText = (block: Record<string, unknown>): string => {
  const type = String(block.type);
  if (type === "text") return typeof block.text === "string" ? block.text : "";
  if (type === "image" || type === "audio") {
    const source = asRecord(block.source);
    const mime = typeof block.mimeType === "string" ? block.mimeType
      : typeof source?.media_type === "string" ? source.media_type : null;
    const data = typeof block.data === "string" ? block.data : typeof source?.data === "string" ? source.data : null;
    return mediaMarker(type, mime, data === null ? null : base64Bytes(data));
  }
  if (type === "resource_link" && typeof block.uri === "string") return block.uri;
  const resource = asRecord(block.resource);
  if (type === "resource" && typeof resource?.uri === "string") return resource.uri;
  return `[${type} block, not reproduced]`;
};

/** Text blocks joined by newlines; media blocks as markers; resource links as their URI. */
export const contentBlocksText = (blocks: readonly Record<string, unknown>[]): string =>
  blocks.map(blockText).join("\n");

const valueText = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return normalizeLineEndings(value);
  if (isContentBlockList(value)) return contentBlocksText(value);
  return compactJson(value);
};

const AGY_ENVELOPE_KEYS = new Set(["provider_state", "output", "status", "reason"]);

const unwrapAgyEnvelope = (envelope: Record<string, unknown>): UnwrappedResult => {
  const parts: string[] = [];
  const output = valueText(envelope.output);
  if (output !== null) parts.push(output);
  for (const [key, value] of Object.entries(envelope)) {
    if (AGY_ENVELOPE_KEYS.has(key) || value === null || value === undefined) continue;
    parts.push(`${key}: ${typeof value === "string" ? value : compactJson(value)}`);
  }
  const denied = envelope.status === "denied";
  return {
    text: parts.length ? parts.join("\n") : null,
    failed: envelope.provider_state === "ERROR",
    denied,
    deniedReason: denied && typeof envelope.reason === "string" ? envelope.reason : null,
  };
};

const unwrapMcpResult = (result: Record<string, unknown>): UnwrappedResult => {
  const structured = result.structuredContent;
  const text = structured !== null && structured !== undefined
    ? compactJson(structured)
    : Array.isArray(result.content) ? contentBlocksText(result.content.filter(isContentBlock)) : null;
  return { text: text && text.length ? text : null, failed: result.isError === true, denied: false };
};

/** Removes a recorded result's envelope. */
export const unwrapResultEnvelope = (value: unknown): UnwrappedResult => {
  const record = asRecord(value);
  if (record && "provider_state" in record) return unwrapAgyEnvelope(record);
  if (record && Array.isArray(record.content)) return unwrapMcpResult(record);
  return { text: valueText(value), failed: false, denied: false };
};

/** Runtime-specific text rules applied to a recorded result (contract §6 runtime texts). */
export type RecordedResultRules = Readonly<{
  /** Rewrites result and error text (after line endings are normalized). */
  normalizeText?: (text: string) => string;
  /** A recorded error that means something other than a failure (interrupted, rejected …). */
  interpretError?: (error: string) => ToolOutcome | null;
}>;

/**
 * The common reading of a recorded result: envelope removed, runtime texts applied, a recorded
 * `tool_error` as the failure (unless it means something else), a denied/failed envelope as such.
 */
export const normalizeRecordedResult = (
  result: RecordedResult,
  rules: RecordedResultRules = {},
): NormalizedToolResult => {
  const clean = (text: string): string => {
    const normalized = normalizeLineEndings(text);
    return rules.normalizeText ? rules.normalizeText(normalized) : normalized;
  };
  const unwrapped = unwrapResultEnvelope(result.value);
  const output = unwrapped.text === null ? null : clean(unwrapped.text);
  const error = result.error !== null && result.error.trim().length > 0 ? clean(result.error) : null;
  if (error !== null) {
    return { outcome: rules.interpretError?.(error) ?? { kind: "failed", error }, output };
  }
  if (unwrapped.denied) return { outcome: { kind: "denied", reason: unwrapped.deniedReason ?? null }, output };
  if (unwrapped.failed) return { outcome: { kind: "failed", error: null }, output };
  return { outcome: OK, output };
};

const INTERRUPTION_TEXTS = new Set(["user_interrupt", "Tool execution interrupted."]);

/** `user_interrupt` and `Tool execution interrupted.` (AutoByteus, AGY) mean the call was interrupted. */
export const interruptedFromError = (error: string): ToolOutcome | null =>
  INTERRUPTION_TEXTS.has(error.trim()) ? { kind: "interrupted" } : null;
