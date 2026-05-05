import {
  EMPTY_MESSAGE_FILE_REFERENCE_PROJECTION,
  type MessageFileReferenceArtifactType,
  type MessageFileReferenceEntry,
  type MessageFileReferenceProjection,
} from "./message-file-reference-types.js";
import {
  buildMessageFileReferenceId,
  normalizeMessageFileReferencePath,
} from "./message-file-reference-identity.js";

const ARTIFACT_TYPES: MessageFileReferenceArtifactType[] = [
  "file",
  "image",
  "audio",
  "video",
  "pdf",
  "csv",
  "excel",
  "other",
];

const normalizeRequiredString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeOptionalString = (value: unknown): string | null =>
  normalizeRequiredString(value);

const normalizeArtifactType = (value: unknown): MessageFileReferenceArtifactType =>
  ARTIFACT_TYPES.includes(value as MessageFileReferenceArtifactType)
    ? (value as MessageFileReferenceArtifactType)
    : "file";

const normalizeTimestamp = (value: unknown, fallback: string): string =>
  normalizeRequiredString(value) ?? fallback;

export const normalizeMessageFileReferenceEntry = (
  rawEntry: Record<string, unknown>,
  options: {
    teamRunId?: string | null;
    timestampFallback?: string;
  } = {},
): MessageFileReferenceEntry | null => {
  const timestampFallback = options.timestampFallback ?? new Date().toISOString();
  const teamRunId = normalizeRequiredString(rawEntry.teamRunId) ?? normalizeRequiredString(options.teamRunId);
  const senderRunId = normalizeRequiredString(rawEntry.senderRunId);
  const receiverRunId = normalizeRequiredString(rawEntry.receiverRunId);
  const rawPath = normalizeRequiredString(rawEntry.path);
  const messageType = normalizeRequiredString(rawEntry.messageType) ?? "agent_message";

  if (!teamRunId || !senderRunId || !receiverRunId || !rawPath) {
    return null;
  }

  const path = normalizeMessageFileReferencePath(rawPath);
  const referenceId =
    normalizeRequiredString(rawEntry.referenceId)
    ?? buildMessageFileReferenceId({ teamRunId, senderRunId, receiverRunId, path });
  const createdAt = normalizeTimestamp(rawEntry.createdAt, timestampFallback);

  return {
    referenceId,
    teamRunId,
    senderRunId,
    senderMemberName: normalizeOptionalString(rawEntry.senderMemberName),
    receiverRunId,
    receiverMemberName: normalizeOptionalString(rawEntry.receiverMemberName),
    path,
    type: normalizeArtifactType(rawEntry.type),
    messageType,
    createdAt,
    updatedAt: normalizeTimestamp(rawEntry.updatedAt, createdAt),
  };
};

export const normalizeMessageFileReferenceProjection = (
  projection: { entries?: unknown } | null | undefined,
  options: {
    teamRunId?: string | null;
  } = {},
): MessageFileReferenceProjection => {
  const entriesById = new Map<string, MessageFileReferenceEntry>();
  const rawEntries = Array.isArray(projection?.entries)
    ? (projection.entries as Record<string, unknown>[])
    : [];

  for (const rawEntry of rawEntries) {
    if (!rawEntry || typeof rawEntry !== "object" || Array.isArray(rawEntry)) {
      continue;
    }

    const entry = normalizeMessageFileReferenceEntry(rawEntry, options);
    if (!entry) {
      continue;
    }

    const existing = entriesById.get(entry.referenceId);
    if (!existing || entry.updatedAt.localeCompare(existing.updatedAt) >= 0) {
      entriesById.set(entry.referenceId, entry);
    }
  }

  return {
    ...EMPTY_MESSAGE_FILE_REFERENCE_PROJECTION,
    entries: Array.from(entriesById.values()),
  };
};

export const cloneMessageFileReferenceProjection = (
  projection: MessageFileReferenceProjection,
): MessageFileReferenceProjection => ({
  version: 1,
  entries: projection.entries.map((entry) => ({ ...entry })),
});
