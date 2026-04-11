import type {
  RunProjection,
  RunProjectionActivityEntry,
  RunProjectionConversationEntry,
} from "./run-projection-types.js";
import type { HistoricalReplayEvent } from "./historical-replay-event-types.js";
import { buildRunProjectionActivities } from "./transformers/historical-replay-events-to-activities.js";
import { buildRunProjectionConversation } from "./transformers/historical-replay-events-to-conversation.js";

const MAX_SUMMARY_LENGTH = 100;

const normalizeTimestampSeconds = (value?: number | null): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value > 10_000_000_000 ? value / 1000 : value;
};

const toIsoString = (value?: number | null): string | null => {
  const normalizedSeconds = normalizeTimestampSeconds(value);
  if (normalizedSeconds === null) {
    return null;
  }
  return new Date(normalizedSeconds * 1000).toISOString();
};

const compactSummary = (value: string | null): string | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length <= MAX_SUMMARY_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, MAX_SUMMARY_LENGTH - 3)}...`;
};

export const buildRunProjectionBundle = (
  runId: string,
  conversation: RunProjectionConversationEntry[],
  activities: RunProjectionActivityEntry[] = [],
): RunProjection => {
  const firstUser = conversation.find((entry) => entry.role === "user" && entry.content);
  const latestConversationTs = conversation.reduce<number | null>((latest, entry) => {
    const ts = normalizeTimestampSeconds(entry.ts ?? null);
    if (ts === null) {
      return latest;
    }
    return latest === null || ts > latest ? ts : latest;
  }, null);
  const latestActivityTs = activities.reduce<number | null>((latest, activity) => {
    const ts = normalizeTimestampSeconds(activity.ts ?? null);
    if (ts === null) {
      return latest;
    }
    return latest === null || ts > latest ? ts : latest;
  }, null);
  const latestTs =
    latestConversationTs === null
      ? latestActivityTs
      : latestActivityTs === null
        ? latestConversationTs
        : Math.max(latestConversationTs, latestActivityTs);

  return {
    runId,
    conversation,
    activities,
    summary: compactSummary(firstUser?.content ?? null),
    lastActivityAt: toIsoString(latestTs),
  };
};

export const buildRunProjectionBundleFromEvents = (
  runId: string,
  events: HistoricalReplayEvent[],
): RunProjection =>
  buildRunProjectionBundle(
    runId,
    buildRunProjectionConversation(events),
    buildRunProjectionActivities(events),
  );
