import type { MemoryConversationEntry } from "../../agent-memory/domain/models.js";
import type { RunProjection } from "./run-projection-types.js";

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

export const buildRunProjection = (
  runId: string,
  conversation: MemoryConversationEntry[],
): RunProjection => {
  const firstUser = conversation.find((entry) => entry.role === "user" && entry.content);
  const lastEntry = conversation.length > 0 ? conversation[conversation.length - 1] : null;
  return {
    runId,
    conversation,
    summary: compactSummary(firstUser?.content ?? null),
    lastActivityAt: toIsoString(lastEntry?.ts ?? null),
  };
};
