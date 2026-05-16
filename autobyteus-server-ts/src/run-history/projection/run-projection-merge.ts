import type {
  RunProjection,
  RunProjectionActivityEntry,
  RunProjectionActivityStatus,
  RunProjectionActivityType,
  RunProjectionConversationEntry,
  RunProjectionSourceDetailLevel,
} from "./run-projection-types.js";
import { buildRunProjectionBundle } from "./run-projection-utils.js";

type ProjectionRow = RunProjectionConversationEntry | RunProjectionActivityEntry;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const normalizeInvocationId = (value: unknown): string | null =>
  isNonEmptyString(value) ? value.trim() : null;

const isGeneratedInvocationId = (value: string): boolean =>
  /^codex-\d+-\d+$/.test(value) || /^[^:\s]+:\d+$/.test(value);

const resolveStableInvocationId = (row: ProjectionRow): string | null => {
  const invocationId = normalizeInvocationId(row.invocationId);
  if (!invocationId || isGeneratedInvocationId(invocationId)) {
    return null;
  }
  return invocationId;
};

const isToolConversationRow = (row: RunProjectionConversationEntry): boolean =>
  row.kind === "tool_call" ||
  row.kind === "tool_call_pending" ||
  Boolean(row.toolName || row.toolArgs || row.toolResult || row.toolError);

const isToolActivityRow = (row: RunProjectionActivityEntry): boolean =>
  Boolean(row.invocationId && row.toolName);

const exactRowKey = (row: ProjectionRow): string => JSON.stringify(row);

const isNonEmptyRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0);

const recordRichness = (value: Record<string, unknown> | null | undefined): number =>
  value ? Object.keys(value).length : 0;

const valueRichness = (value: unknown): number => {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === "string") {
    return value.trim().length;
  }
  if (Array.isArray(value)) {
    return value.length;
  }
  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length;
  }
  return 1;
};

const pickString = (primary: string | null | undefined, secondary: string | null | undefined): string | null => {
  const primaryValue = isNonEmptyString(primary) ? primary.trim() : null;
  const secondaryValue = isNonEmptyString(secondary) ? secondary.trim() : null;
  if (!primaryValue) {
    return secondaryValue;
  }
  if (!secondaryValue) {
    return primaryValue;
  }
  if (primaryValue === "tool" && secondaryValue !== "tool") {
    return secondaryValue;
  }
  if (secondaryValue.length > primaryValue.length && primaryValue.length <= 4) {
    return secondaryValue;
  }
  return primaryValue;
};

const pickRecord = (
  primary: Record<string, unknown> | null | undefined,
  secondary: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null => {
  if (!isNonEmptyRecord(primary)) {
    return isNonEmptyRecord(secondary) ? secondary : null;
  }
  if (!isNonEmptyRecord(secondary)) {
    return primary;
  }
  const merged = { ...primary, ...secondary };
  return recordRichness(merged) >= recordRichness(primary) ? merged : primary;
};

const pickValue = <T>(primary: T | null | undefined, secondary: T | null | undefined): T | null => {
  if (valueRichness(primary) === 0) {
    return secondary ?? null;
  }
  if (valueRichness(secondary) === 0) {
    return primary ?? null;
  }
  return valueRichness(secondary) > valueRichness(primary) ? (secondary ?? null) : (primary ?? null);
};

const terminalStatusRank: Record<RunProjectionActivityStatus, number> = {
  parsing: 0,
  parsed: 1,
  "awaiting-approval": 2,
  approved: 3,
  executing: 4,
  success: 5,
  denied: 6,
  error: 7,
};

const pickStatus = (
  primary: RunProjectionActivityStatus,
  secondary: RunProjectionActivityStatus,
): RunProjectionActivityStatus =>
  terminalStatusRank[secondary] > terminalStatusRank[primary] ? secondary : primary;

const activityTypeRank: Record<RunProjectionActivityType, number> = {
  tool_call: 0,
  terminal_command: 1,
  edit_file: 1,
  write_file: 2,
};

const pickActivityType = (
  primary: RunProjectionActivityType,
  secondary: RunProjectionActivityType,
): RunProjectionActivityType =>
  activityTypeRank[secondary] > activityTypeRank[primary] ? secondary : primary;

const pickDetailLevel = (
  primary: RunProjectionSourceDetailLevel | null | undefined,
  secondary: RunProjectionSourceDetailLevel | null | undefined,
): RunProjectionSourceDetailLevel | null =>
  primary === "full" || secondary !== "full" ? (primary ?? secondary ?? null) : secondary;

const pickTimestamp = (
  primary: number | null | undefined,
  secondary: number | null | undefined,
): number | null => {
  const primaryTs = typeof primary === "number" && Number.isFinite(primary) && primary > 0 ? primary : null;
  const secondaryTs = typeof secondary === "number" && Number.isFinite(secondary) && secondary > 0 ? secondary : null;
  if (primaryTs === null) {
    return secondaryTs;
  }
  if (secondaryTs === null) {
    return primaryTs;
  }
  return Math.min(primaryTs, secondaryTs);
};

const mergeLogs = (
  primary: string[] | null | undefined,
  secondary: string[] | null | undefined,
): string[] | null => {
  const merged = [...(primary ?? []), ...(secondary ?? [])].filter(isNonEmptyString);
  return merged.length > 0 ? [...new Set(merged)] : null;
};

const mergeConversationToolRows = (
  primary: RunProjectionConversationEntry,
  secondary: RunProjectionConversationEntry,
): RunProjectionConversationEntry => ({
  ...primary,
  kind: primary.kind === "tool_call" || secondary.kind !== "tool_call" ? primary.kind : secondary.kind,
  invocationId: normalizeInvocationId(primary.invocationId) ?? normalizeInvocationId(secondary.invocationId),
  role: primary.role ?? secondary.role ?? null,
  content: pickString(primary.content, secondary.content),
  toolName: pickString(primary.toolName, secondary.toolName),
  toolArgs: pickRecord(primary.toolArgs, secondary.toolArgs),
  toolResult: pickValue(primary.toolResult, secondary.toolResult),
  toolError: pickString(primary.toolError, secondary.toolError),
  media: pickRecord(primary.media, secondary.media) as Record<string, string[]> | null,
  ts: pickTimestamp(primary.ts, secondary.ts),
});

const mergeActivityRows = (
  primary: RunProjectionActivityEntry,
  secondary: RunProjectionActivityEntry,
): RunProjectionActivityEntry => ({
  ...primary,
  invocationId: normalizeInvocationId(primary.invocationId) ?? normalizeInvocationId(secondary.invocationId) ?? primary.invocationId,
  toolName: pickString(primary.toolName, secondary.toolName) ?? primary.toolName,
  type: pickActivityType(primary.type, secondary.type),
  status: pickStatus(primary.status, secondary.status),
  contextText: pickString(primary.contextText, secondary.contextText) ?? primary.contextText,
  arguments: pickRecord(primary.arguments, secondary.arguments),
  logs: mergeLogs(primary.logs, secondary.logs),
  result: pickValue(primary.result, secondary.result),
  error: pickString(primary.error, secondary.error),
  ts: pickTimestamp(primary.ts, secondary.ts),
  detailLevel: pickDetailLevel(primary.detailLevel, secondary.detailLevel),
});

const mergeProjectionRows = <T extends ProjectionRow>(
  primaryRows: T[],
  secondaryRows: T[],
  isMergeableToolRow: (row: T) => boolean,
  mergeToolRows: (primary: T, secondary: T) => T,
): T[] => {
  const merged: T[] = [];
  const exactRows = new Set<string>();
  const stableToolRows = new Map<string, number>();

  for (const row of [...primaryRows, ...secondaryRows]) {
    const exactKey = exactRowKey(row);
    if (exactRows.has(exactKey)) {
      continue;
    }
    exactRows.add(exactKey);

    const invocationId = isMergeableToolRow(row) ? resolveStableInvocationId(row) : null;
    if (invocationId) {
      const existingIndex = stableToolRows.get(invocationId);
      if (existingIndex !== undefined) {
        merged[existingIndex] = mergeToolRows(merged[existingIndex] as T, row);
        continue;
      }
      stableToolRows.set(invocationId, merged.length);
    }
    merged.push(row);
  }

  return merged;
};

export const mergeProjectionBundles = (
  runId: string,
  primaryProjection: RunProjection | null,
  secondaryProjection: RunProjection | null,
): RunProjection | null => {
  if (!primaryProjection) {
    return secondaryProjection;
  }
  if (!secondaryProjection) {
    return primaryProjection;
  }

  const bundle = buildRunProjectionBundle(
    runId,
    mergeProjectionRows(
      primaryProjection.conversation,
      secondaryProjection.conversation,
      isToolConversationRow,
      mergeConversationToolRows,
    ),
    mergeProjectionRows(
      primaryProjection.activities,
      secondaryProjection.activities,
      isToolActivityRow,
      mergeActivityRows,
    ),
  );

  return {
    ...bundle,
    summary: bundle.summary ?? primaryProjection.summary ?? secondaryProjection.summary,
    lastActivityAt:
      bundle.lastActivityAt ??
      primaryProjection.lastActivityAt ??
      secondaryProjection.lastActivityAt,
  };
};
