import { createHash } from "node:crypto";
import {
  cumulativeSnapshotTokenFields,
  type CumulativeSnapshotTokenField,
  type CumulativeSnapshotTokenRecord,
} from "../projections/cumulative-snapshot-reconciliation-metadata.js";

export const MAX_CUMULATIVE_SERIES_PER_RUN = 8;
export const MAX_RECENT_IDEMPOTENCY_DIGESTS = 64;
export const MAX_SNAPSHOT_SERIES_STATE_BYTES = 16 * 1024;
export const MAX_RECENT_IDEMPOTENCY_STATE_BYTES = 8 * 1024;
export const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;

export interface AdmissionMarker {
  observedAt: string;
  generation: 0 | 1;
  ordinal: bigint;
}

export type CumulativeSnapshotBigIntRecord = Record<CumulativeSnapshotTokenField, bigint | null>;

export interface SnapshotSeriesCheckpoint {
  seriesDigest: string;
  sourceTokens: CumulativeSnapshotBigIntRecord;
  lastAdmission: AdmissionMarker;
}

export interface RecentTokenUsageIdentityDigest {
  digest: string;
  generation: 0 | 1;
  ordinal: bigint;
}

export const digestTokenUsageIdentity = (kind: "event" | "idempotency" | "series", value: string): string => {
  if (!value.trim()) throw new Error(`Token usage ${kind} identity must be nonblank.`);
  return createHash("sha256").update(`${kind}\0`, "utf8").update(value, "utf8").digest("hex");
};

export const compareAdmissionMarkers = (left: AdmissionMarker, right: AdmissionMarker): number => {
  const time = left.observedAt.localeCompare(right.observedAt);
  if (time !== 0) return time;
  if (left.generation !== right.generation) return left.generation - right.generation;
  return left.ordinal < right.ordinal ? -1 : left.ordinal > right.ordinal ? 1 : 0;
};

export const compareCheckpointRecency = (
  left: SnapshotSeriesCheckpoint,
  right: SnapshotSeriesCheckpoint,
): number => compareAdmissionMarkers(left.lastAdmission, right.lastAdmission) ||
  left.seriesDigest.localeCompare(right.seriesDigest);

export const toBigIntSnapshotTokens = (
  source: CumulativeSnapshotTokenRecord,
): CumulativeSnapshotBigIntRecord => Object.fromEntries(
  cumulativeSnapshotTokenFields.map((field) => {
    const value = source[field];
    if (value === null) return [field, null];
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`Token usage snapshot field '${field}' is outside JavaScript SafeInt.`);
    }
    return [field, BigInt(value)];
  }),
) as CumulativeSnapshotBigIntRecord;

export const emptyCumulativeSnapshotBigIntRecord = (): CumulativeSnapshotBigIntRecord =>
  Object.fromEntries(cumulativeSnapshotTokenFields.map((field) => [field, null])) as CumulativeSnapshotBigIntRecord;

export const cumulativeSnapshotDelta = (
  current: CumulativeSnapshotBigIntRecord,
  previous: CumulativeSnapshotBigIntRecord,
): { delta: CumulativeSnapshotBigIntRecord; regressed: boolean; advanced: boolean } => {
  const result = emptyCumulativeSnapshotBigIntRecord();
  let regressed = false;
  let advanced = false;
  for (const field of cumulativeSnapshotTokenFields) {
    const next = current[field];
    const prior = previous[field];
    if (next === null) continue;
    const difference = prior === null ? next : next - prior;
    if (difference < 0n) regressed = true;
    if (difference > 0n) advanced = true;
    result[field] = difference;
  }
  return { delta: result, regressed, advanced };
};

export const maxCumulativeSnapshotTokens = (
  left: CumulativeSnapshotBigIntRecord,
  right: CumulativeSnapshotBigIntRecord,
): CumulativeSnapshotBigIntRecord => Object.fromEntries(
  cumulativeSnapshotTokenFields.map((field) => {
    const a = left[field];
    const b = right[field];
    if (a === null) return [field, b];
    if (b === null) return [field, a];
    return [field, a > b ? a : b];
  }),
) as CumulativeSnapshotBigIntRecord;

export const addRecentIdentityDigests = (
  current: readonly RecentTokenUsageIdentityDigest[],
  input: { usageEventId: string; idempotencyKey: string; generation: 0 | 1; ordinal: bigint },
): RecentTokenUsageIdentityDigest[] => {
  const incoming = [
    digestTokenUsageIdentity("event", input.usageEventId),
    digestTokenUsageIdentity("idempotency", input.idempotencyKey),
  ].map((digest) => ({ digest, generation: input.generation, ordinal: input.ordinal }));
  const byDigest = new Map(current.map((entry) => [entry.digest, entry]));
  for (const entry of incoming) byDigest.set(entry.digest, entry);
  return [...byDigest.values()]
    .sort((a, b) => a.generation - b.generation || (a.ordinal < b.ordinal ? -1 : a.ordinal > b.ordinal ? 1 : a.digest.localeCompare(b.digest)))
    .slice(-MAX_RECENT_IDEMPOTENCY_DIGESTS);
};

export const hasRecentIdentityDigest = (
  current: readonly RecentTokenUsageIdentityDigest[],
  usageEventId: string,
  idempotencyKey: string,
): boolean => {
  const digests = new Set(current.map((entry) => entry.digest));
  return digests.has(digestTokenUsageIdentity("event", usageEventId)) ||
    digests.has(digestTokenUsageIdentity("idempotency", idempotencyKey));
};

