import { acceptedInputIdentityKey, normalizeAcceptedInputIdentity } from '@autobyteus/agent-presentation-contracts';
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

// Calls are scoped to one already-resolved recipient conversation, never a global index.
const isInputEntry = (entry: RunProjectionConversationEntry): boolean =>
  entry.role === 'user' || entry.kind === 'inter_agent_message';
const inputScope = (entry: RunProjectionConversationEntry): string => JSON.stringify([
  entry.kind, entry.role ?? null, entry.senderId ?? null,
  entry.senderAgentRunId ?? null, entry.senderAddress ?? null,
]);

const mergeInputEntry = (
  current: RunProjectionConversationEntry, incoming: RunProjectionConversationEntry,
): RunProjectionConversationEntry => {
  const media = { ...incoming.media, ...current.media };
  for (const key of ['images', 'audio', 'video'] as const) {
    media[key] = [...new Set([...(current.media?.[key] ?? []), ...(incoming.media?.[key] ?? [])])];
  }
  const files: NonNullable<RunProjectionConversationEntry['fileAttachments']>[number][] = [];
  for (const file of [...(current.fileAttachments ?? []), ...(incoming.fileAttachments ?? [])]) {
    const index = files.findIndex(saved => saved.uri.trim() === file.uri.trim() && saved.fileType.trim().toLowerCase() === file.fileType.trim().toLowerCase());
    if (index < 0) files.push(file);
    else if (!files[index].fileName?.trim() || files[index].fileName === files[index].uri.split('/').pop()) {
      files[index] = { ...files[index], fileName: file.fileName?.trim() ? file.fileName : files[index].fileName };
    }
  }
  return {
    ...incoming, ...current,
    ...normalizeAcceptedInputIdentity({
      messageId: normalizeAcceptedInputIdentity(current).messageId ?? incoming.messageId,
      dedupeKey: normalizeAcceptedInputIdentity(current).dedupeKey ?? incoming.dedupeKey,
    }),
    content: current.content || incoming.content,
    ts: normalizeTs(current.ts) ?? normalizeTs(incoming.ts),
    ...(current.media || incoming.media ? { media } : {}),
    ...(files.length ? { fileAttachments: files } : {}),
  };
};

const explicitConversationKey = (entry: RunProjectionConversationEntry): string | null => {
  if (isInputEntry(entry)) {
    const key = acceptedInputIdentityKey(entry);
    return key ? JSON.stringify([inputScope(entry), key]) : null;
  }
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
    ...(entry.fileAttachments?.length ? [stableJson(entry.fileAttachments)] : []),
  ].join("\0");

const conversationEntriesCanMerge = (
  left: RunProjectionConversationEntry,
  right: RunProjectionConversationEntry,
): boolean => {
  if ((isInputEntry(left) || isInputEntry(right)) && inputScope(left) !== inputScope(right)) return false;
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
    entry.fileAttachments,
  ].filter(hasValue).length;

const mergeConversationEntry = (
  current: RunProjectionConversationEntry,
  incoming: RunProjectionConversationEntry,
): RunProjectionConversationEntry => {
  if (isInputEntry(current)) return mergeInputEntry(current, incoming);
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

const explicitActivityKey = (entry: RunProjectionActivityEntry): string => {
  if (entry.kind === "system_instruction") {
    return `${entry.kind}\0${entry.activityId}`;
  }
  if (entry.kind === "compaction") {
    return [
      entry.kind,
      entry.activityId,
    ].map(normalizeText).join("\0");
  }

  return [
    entry.kind,
    entry.invocationId,
    entry.toolName,
    entry.type,
    entry.status,
  ].map(normalizeText).join("\0");
};

const activityRichnessScore = (entry: RunProjectionActivityEntry): number => {
  if (entry.kind === "system_instruction") {
    return [normalizeTs(entry.ts), entry.content].filter(hasValue).length;
  }
  if (entry.kind === "compaction") {
    return [
      normalizeTs(entry.ts),
      normalizeTs(entry.updatedTs),
      entry.message,
      entry.turnId,
      entry.provider,
      entry.sourceSurface,
      entry.boundaryKey,
      entry.providerEventId,
      entry.providerSessionId,
      entry.trigger,
      entry.preTokens,
      entry.rotationEligible,
      entry.detailLevel,
    ].filter(hasValue).length;
  }

  return [
    normalizeTs(entry.ts),
    entry.arguments,
    entry.logs,
    entry.result,
    entry.error,
    entry.detailLevel,
    entry.contextText,
  ].filter(hasValue).length;
};

const mergeActivityEntry = (
  current: RunProjectionActivityEntry,
  incoming: RunProjectionActivityEntry,
): RunProjectionActivityEntry => {
  if (current.kind === "system_instruction" && incoming.kind === "system_instruction") {
    if (current.content !== incoming.content || current.ts !== incoming.ts) {
      console.warn(`[RunProjectionDedupe] rejected conflicting system instruction activity '${current.activityId}'.`);
    }
    return current;
  }
  if (current.kind === "compaction" && incoming.kind === "compaction") {
    const currentTs = normalizeTs(current.ts);
    const incomingTs = normalizeTs(incoming.ts);
    const currentUpdatedTs = normalizeTs(current.updatedTs) ?? currentTs;
    const incomingUpdatedTs = normalizeTs(incoming.updatedTs) ?? incomingTs;
    const incomingIsLatest =
      currentUpdatedTs === null ||
      (incomingUpdatedTs !== null && incomingUpdatedTs >= currentUpdatedTs);
    const latest = incomingIsLatest ? incoming : current;
    const earliestTs =
      currentTs === null
        ? incomingTs
        : incomingTs === null
          ? currentTs
          : Math.min(currentTs, incomingTs);
    const latestTs =
      currentUpdatedTs === null
        ? incomingUpdatedTs
        : incomingUpdatedTs === null
          ? currentUpdatedTs
          : Math.max(currentUpdatedTs, incomingUpdatedTs);
    const merged = incomingIsLatest
      ? { ...current, ...incoming }
      : { ...incoming, ...current };
    return {
      ...merged,
      phase: latest.phase,
      message: latest.message,
      errorMessage: latest.errorMessage ?? current.errorMessage ?? incoming.errorMessage,
      ts: earliestTs,
      updatedTs: latestTs,
    };
  }

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
