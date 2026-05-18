import type {
  RunProjectionActivityEntry,
  RunProjectionConversationEntry,
} from "./run-projection-types.js";

const normalizeText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const normalizeTs = (value?: number | null): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;

const stableJson = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value !== "object") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${key}:${stableJson(record[key])}`).join(",")}}`;
};

const hasValue = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === "object") {
    return Object.keys(value).length > 0;
  }
  return true;
};

const explicitConversationKey = (entry: RunProjectionConversationEntry): string | null => {
  const metadataRecord = (entry as unknown as { metadata?: unknown }).metadata;
  const metadata =
    metadataRecord && typeof metadataRecord === "object" && !Array.isArray(metadataRecord)
      ? metadataRecord as Record<string, unknown>
      : {};
  const identity =
    normalizeText((entry as unknown as { messageId?: unknown }).messageId) ||
    normalizeText((entry as unknown as { message_id?: unknown }).message_id) ||
    normalizeText(metadata.message_id) ||
    normalizeText(metadata.dedupe_key) ||
    normalizeText(entry.invocationId);
  return identity ? `${entry.kind}:${entry.role ?? ""}:${identity}` : null;
};

const conversationSemanticKey = (entry: RunProjectionConversationEntry): string =>
  [
    entry.kind,
    entry.role ?? "",
    normalizeText(entry.content),
    normalizeText(entry.toolName),
    stableJson(entry.toolArgs),
    stableJson(entry.toolResult),
    normalizeText(entry.toolError),
    stableJson(entry.media),
  ].join("\0");

const conversationEntriesCanMerge = (
  left: RunProjectionConversationEntry,
  right: RunProjectionConversationEntry,
): boolean => {
  if (conversationSemanticKey(left) !== conversationSemanticKey(right)) {
    return false;
  }
  const leftTs = normalizeTs(left.ts);
  const rightTs = normalizeTs(right.ts);
  if (leftTs === null && rightTs === null) {
    return false;
  }
  return leftTs === null || rightTs === null || leftTs === rightTs;
};

const conversationRichnessScore = (entry: RunProjectionConversationEntry): number =>
  [
    normalizeTs(entry.ts),
    entry.invocationId,
    entry.content,
    entry.toolName,
    entry.toolArgs,
    entry.toolResult,
    entry.toolError,
    entry.media,
  ].filter(hasValue).length;

const mergeConversationEntry = (
  current: RunProjectionConversationEntry,
  incoming: RunProjectionConversationEntry,
): RunProjectionConversationEntry => {
  const winner =
    conversationRichnessScore(incoming) > conversationRichnessScore(current)
      ? incoming
      : current;
  const other = winner === incoming ? current : incoming;
  const merged: RunProjectionConversationEntry = { ...other, ...winner };
  const preferredTs = normalizeTs(winner.ts) ?? normalizeTs(other.ts);
  if (preferredTs !== null) {
    merged.ts = preferredTs;
  }
  return merged;
};

export const dedupeRunProjectionConversationEntries = (
  entries: readonly RunProjectionConversationEntry[],
): RunProjectionConversationEntry[] => {
  const deduped: RunProjectionConversationEntry[] = [];
  const explicitIndexByKey = new Map<string, number>();

  for (const entry of entries) {
    const explicitKey = explicitConversationKey(entry);
    if (explicitKey) {
      const existingIndex = explicitIndexByKey.get(explicitKey);
      if (existingIndex !== undefined) {
        deduped[existingIndex] = mergeConversationEntry(deduped[existingIndex], entry);
        continue;
      }
      explicitIndexByKey.set(explicitKey, deduped.length);
      deduped.push(entry);
      continue;
    }

    const existingIndex = deduped.findIndex((candidate) =>
      !explicitConversationKey(candidate) && conversationEntriesCanMerge(candidate, entry));
    if (existingIndex >= 0) {
      deduped[existingIndex] = mergeConversationEntry(deduped[existingIndex], entry);
      continue;
    }
    deduped.push(entry);
  }

  return deduped;
};

const explicitActivityKey = (entry: RunProjectionActivityEntry): string =>
  [
    entry.invocationId,
    entry.toolName,
    entry.type,
    entry.status,
  ].map(normalizeText).join("\0");

const activityRichnessScore = (entry: RunProjectionActivityEntry): number =>
  [
    normalizeTs(entry.ts),
    entry.arguments,
    entry.logs,
    entry.result,
    entry.error,
    entry.detailLevel,
    entry.contextText,
  ].filter(hasValue).length;

const mergeActivityEntry = (
  current: RunProjectionActivityEntry,
  incoming: RunProjectionActivityEntry,
): RunProjectionActivityEntry => {
  const winner =
    activityRichnessScore(incoming) > activityRichnessScore(current)
      ? incoming
      : current;
  const other = winner === incoming ? current : incoming;
  const merged: RunProjectionActivityEntry = { ...other, ...winner };
  const preferredTs = normalizeTs(winner.ts) ?? normalizeTs(other.ts);
  if (preferredTs !== null) {
    merged.ts = preferredTs;
  }
  return merged;
};

export const dedupeRunProjectionActivityEntries = (
  entries: readonly RunProjectionActivityEntry[],
): RunProjectionActivityEntry[] => {
  const deduped: RunProjectionActivityEntry[] = [];
  const indexByKey = new Map<string, number>();

  for (const entry of entries) {
    const key = explicitActivityKey(entry);
    const existingIndex = indexByKey.get(key);
    if (existingIndex !== undefined) {
      deduped[existingIndex] = mergeActivityEntry(deduped[existingIndex], entry);
      continue;
    }
    indexByKey.set(key, deduped.length);
    deduped.push(entry);
  }

  return deduped;
};
