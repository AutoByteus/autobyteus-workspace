import {
  buildRunFileChangeId,
  normalizeRunFileChangePath,
  type RunFileChangeArtifactType,
  type RunFileChangeEntry,
  type RunFileChangeProjection,
  type RunFileChangeSourceTool,
  type RunFileChangeStatus,
} from "./run-file-change-types.js";
import { canonicalizeRunFileChangePath } from "./run-file-change-path-identity.js";

const STATUS_VALUES: RunFileChangeStatus[] = ["streaming", "pending", "available", "failed"];
const SOURCE_TOOL_VALUES: RunFileChangeSourceTool[] = ["write_file", "edit_file", "generated_output"];
const ARTIFACT_TYPE_VALUES: RunFileChangeArtifactType[] = [
  "file",
  "image",
  "audio",
  "video",
  "pdf",
  "csv",
  "excel",
  "other",
];

const STATUS_PRIORITY: Record<RunFileChangeStatus, number> = {
  available: 4,
  pending: 3,
  streaming: 2,
  failed: 1,
};

const nowIso = (): string => new Date().toISOString();

const normalizeTimestamp = (value: unknown, fallback: string): string => {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
};

const normalizeStatus = (value: unknown): RunFileChangeStatus => {
  return STATUS_VALUES.includes(value as RunFileChangeStatus)
    ? (value as RunFileChangeStatus)
    : "available";
};

const normalizeSourceTool = (value: unknown): RunFileChangeSourceTool => {
  return SOURCE_TOOL_VALUES.includes(value as RunFileChangeSourceTool)
    ? (value as RunFileChangeSourceTool)
    : "generated_output";
};

const normalizeArtifactType = (value: unknown): RunFileChangeArtifactType => {
  return ARTIFACT_TYPE_VALUES.includes(value as RunFileChangeArtifactType)
    ? (value as RunFileChangeArtifactType)
    : "file";
};

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeOptionalContent = (value: unknown): string | null | undefined => {
  if (typeof value === "string") {
    return value;
  }

  return value === null ? null : undefined;
};

const shouldReplaceEntry = (
  existing: RunFileChangeEntry,
  incoming: RunFileChangeEntry,
  options: { preferTransientContentOnTie: boolean },
): boolean => {
  const timestampComparison = incoming.updatedAt.localeCompare(existing.updatedAt);
  if (timestampComparison !== 0) {
    return timestampComparison > 0;
  }

  const statusPriorityDelta = STATUS_PRIORITY[incoming.status] - STATUS_PRIORITY[existing.status];
  if (statusPriorityDelta !== 0) {
    return statusPriorityDelta > 0;
  }

  if (options.preferTransientContentOnTie) {
    const incomingHasContent = typeof incoming.content === "string" && incoming.content.length > 0;
    const existingHasContent = typeof existing.content === "string" && existing.content.length > 0;
    if (incomingHasContent !== existingHasContent) {
      return incomingHasContent;
    }
  }

  return false;
};

const normalizeEntry = (
  runId: string,
  rawEntry: Record<string, unknown>,
  workspaceRootPath: string | null,
): RunFileChangeEntry | null => {
  const canonicalPath = canonicalizeRunFileChangePath(
    normalizeOptionalString(rawEntry.path),
    workspaceRootPath,
  );
  if (!canonicalPath) {
    return null;
  }

  const createdAtFallback = nowIso();
  const updatedAt = normalizeTimestamp(rawEntry.updatedAt, createdAtFallback);
  const createdAt = normalizeTimestamp(rawEntry.createdAt, updatedAt);

  return {
    id: buildRunFileChangeId(runId, canonicalPath),
    runId,
    path: normalizeRunFileChangePath(canonicalPath),
    type: normalizeArtifactType(rawEntry.type),
    status: normalizeStatus(rawEntry.status),
    sourceTool: normalizeSourceTool(rawEntry.sourceTool),
    sourceInvocationId: normalizeOptionalString(rawEntry.sourceInvocationId),
    content: normalizeOptionalContent(rawEntry.content),
    createdAt,
    updatedAt,
  };
};

export const normalizeRunFileChangeProjection = (
  projection: { entries?: unknown } | null | undefined,
  options: {
    runId: string;
    workspaceRootPath?: string | null;
    preferTransientContentOnTie?: boolean;
  },
): RunFileChangeProjection => {
  const rawEntries = Array.isArray(projection?.entries)
    ? (projection.entries as Record<string, unknown>[])
    : [];
  const entriesById = new Map<string, RunFileChangeEntry>();

  for (const rawEntry of rawEntries) {
    if (!rawEntry || typeof rawEntry !== "object" || Array.isArray(rawEntry)) {
      continue;
    }

    const normalized = normalizeEntry(
      options.runId,
      rawEntry,
      options.workspaceRootPath ?? null,
    );
    if (!normalized) {
      continue;
    }

    const existing = entriesById.get(normalized.id);
    if (!existing || shouldReplaceEntry(existing, normalized, {
      preferTransientContentOnTie: options.preferTransientContentOnTie ?? false,
    })) {
      entriesById.set(normalized.id, normalized);
    }
  }

  return {
    version: 2,
    entries: Array.from(entriesById.values()),
  };
};
