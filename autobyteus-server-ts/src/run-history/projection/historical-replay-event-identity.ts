import { createHash } from "node:crypto";
import type { MemoryTraceEvent } from "../../agent-memory/domain/models.js";
import type { RawTraceMedia } from "autobyteus-ts/memory/models/raw-trace-item.js";

const digest = (value: string): string => createHash("sha256").update(value).digest("hex");
const normalized = (value: unknown): string => typeof value === "string" ? value.trim() : "";
const lengthPrefixed = (value: string): string => `${Buffer.byteLength(value, "utf8")}:${value}`;

const mediaIdentity = (media: RawTraceMedia | null | undefined): string => {
  if (!media) return "";
  return (["audio", "images", "video"] as const).flatMap((kind) => {
    const locators = media[kind];
    return locators?.length
      ? [lengthPrefixed(kind), ...locators.map((locator) => lengthPrefixed(locator))]
      : [];
  }).join("|");
};

export const buildRawReplayEventId = (rawId: string): string =>
  `raw:v1:${lengthPrefixed(rawId.trim())}`;

export const buildToolReplayEventId = (turnId: string, toolCallId: string): string =>
  `tool:v1:${lengthPrefixed(turnId.trim())}:${lengthPrefixed(toolCallId.trim())}`;

export const buildReplayTurnGroupId = (turnId: string | null | undefined, eventId: string): string => {
  const value = normalized(turnId);
  return value ? `turn:v1:${lengthPrefixed(value)}` : `ungrouped:${eventId}`;
};

export const buildLegacyTraceFingerprint = (trace: MemoryTraceEvent): string => digest([
  normalized(trace.traceType),
  normalized(trace.turnId),
  String(trace.seq),
  String(trace.ts),
  normalized(trace.sourceEvent),
  normalized(trace.toolCallId),
  normalized(trace.toolName),
  digest(normalized(trace.content)),
  digest(mediaIdentity(trace.media)),
].map(lengthPrefixed).join("|"));

export const buildProviderRowFingerprint = (fields: readonly unknown[]): string => digest(
  fields.map((field) => lengthPrefixed(
    typeof field === "number" && Number.isFinite(field) ? String(field) : normalized(field),
  )).join("|"),
);

export const buildLegacyReplayEventId = (fingerprint: string, occurrence: number): string =>
  `legacy:v1:${fingerprint}:${occurrence}`;

export const resolveProviderReplayIdentity = (input: {
  provider: string;
  nativeId?: string | null;
  turnId?: string | null;
  fingerprintFields: readonly unknown[];
  nextOccurrence: (fingerprint: string) => number;
}): { eventId: string; turnGroupId: string } => {
  const nativeId = normalized(input.nativeId);
  const provider = normalized(input.provider) || "provider";
  const eventId = nativeId
    ? `provider:${lengthPrefixed(provider)}:${lengthPrefixed(nativeId)}`
    : (() => {
        const fingerprint = buildProviderRowFingerprint([provider, ...input.fingerprintFields]);
        return buildLegacyReplayEventId(fingerprint, input.nextOccurrence(fingerprint));
      })();
  return { eventId, turnGroupId: buildReplayTurnGroupId(input.turnId, eventId) };
};

export const createLegacyOccurrenceAllocator = (): ((fingerprint: string) => number) => {
  const occurrences = new Map<string, number>();
  return (fingerprint: string): number => {
    const occurrence = occurrences.get(fingerprint) ?? 0;
    occurrences.set(fingerprint, occurrence + 1);
    return occurrence;
  };
};

export const resolveTraceReplayIdentity = (
  trace: MemoryTraceEvent,
  nextOccurrence: (fingerprint: string) => number,
): { eventId: string; turnGroupId: string } => {
  const rawId = normalized(trace.id);
  const eventId = rawId
    ? buildRawReplayEventId(rawId)
    : (() => {
        const fingerprint = buildLegacyTraceFingerprint(trace);
        return buildLegacyReplayEventId(fingerprint, nextOccurrence(fingerprint));
      })();
  return { eventId, turnGroupId: buildReplayTurnGroupId(trace.turnId, eventId) };
};
