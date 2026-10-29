import { createHash } from "node:crypto";
import { type CumulativeSnapshotTokenField } from "../projections/cumulative-snapshot-reconciliation-metadata.js";

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

