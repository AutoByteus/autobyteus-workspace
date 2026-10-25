import {
  MAX_CUMULATIVE_SERIES_PER_RUN,
  MAX_RECENT_IDEMPOTENCY_DIGESTS,
  MAX_RECENT_IDEMPOTENCY_STATE_BYTES,
  MAX_SNAPSHOT_SERIES_STATE_BYTES,
  SHA256_HEX_PATTERN,
  type AdmissionMarker,
  type CumulativeSnapshotBigIntRecord,
  type RecentTokenUsageIdentityDigest,
  type SnapshotSeriesCheckpoint,
} from "../../domain/token-usage-snapshot-checkpoint.js";
import { cumulativeSnapshotTokenFields } from "../../projections/cumulative-snapshot-reconciliation-metadata.js";

const DECIMAL_PATTERN = /^(0|[1-9][0-9]*)$/;
const byteLength = (value: string): number => Buffer.byteLength(value, "utf8");
const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Token usage compact state must be an object.");
  }
  return value as Record<string, unknown>;
};
const asNonNegativeBigInt = (value: unknown, field: string): bigint => {
  if (typeof value !== "string" || !DECIMAL_PATTERN.test(value)) {
    throw new Error(`Token usage compact field '${field}' is not a canonical non-negative decimal.`);
  }
  return BigInt(value);
};
const asNullableBigInt = (value: unknown, field: string): bigint | null =>
  value === null ? null : asNonNegativeBigInt(value, field);

const parseAdmission = (value: unknown): AdmissionMarker => {
  const record = asRecord(value);
  const observedAt = typeof record.observedAt === "string" ? record.observedAt : "";
  if (!observedAt || Number.isNaN(new Date(observedAt).getTime())) {
    throw new Error("Token usage admission marker has an invalid observedAt.");
  }
  if (record.generation !== 0 && record.generation !== 1) {
    throw new Error("Token usage admission marker has an invalid generation.");
  }
  return {
    observedAt: new Date(observedAt).toISOString(),
    generation: record.generation,
    ordinal: asNonNegativeBigInt(record.ordinal, "ordinal"),
  };
};

const parseSourceTokens = (value: unknown): CumulativeSnapshotBigIntRecord => {
  const record = asRecord(value);
  return Object.fromEntries(cumulativeSnapshotTokenFields.map((field) => [
    field,
    asNullableBigInt(record[field], field),
  ])) as CumulativeSnapshotBigIntRecord;
};

export const decodeSnapshotSeriesState = (value: string): SnapshotSeriesCheckpoint[] => {
  if (byteLength(value) > MAX_SNAPSHOT_SERIES_STATE_BYTES) {
    throw new Error("Token usage snapshot checkpoint state exceeds 16 KiB.");
  }
  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed) || parsed.length > MAX_CUMULATIVE_SERIES_PER_RUN) {
    throw new Error("Token usage snapshot checkpoint state exceeds eight entries.");
  }
  const seen = new Set<string>();
  return parsed.map((entry) => {
    const record = asRecord(entry);
    if (typeof record.seriesDigest !== "string" || !SHA256_HEX_PATTERN.test(record.seriesDigest)) {
      throw new Error("Token usage snapshot checkpoint has an invalid digest.");
    }
    if (seen.has(record.seriesDigest)) throw new Error("Token usage snapshot checkpoint digest repeats.");
    seen.add(record.seriesDigest);
    return {
      seriesDigest: record.seriesDigest,
      sourceTokens: parseSourceTokens(record.sourceTokens),
      lastAdmission: parseAdmission(record.lastAdmission),
    };
  });
};

export const encodeSnapshotSeriesState = (state: readonly SnapshotSeriesCheckpoint[]): string => {
  if (state.length > MAX_CUMULATIVE_SERIES_PER_RUN) {
    throw new Error("Token usage snapshot checkpoint state exceeds eight entries.");
  }
  const encoded = JSON.stringify(state.map((entry) => ({
    seriesDigest: entry.seriesDigest,
    sourceTokens: Object.fromEntries(cumulativeSnapshotTokenFields.map((field) => [
      field,
      entry.sourceTokens[field]?.toString() ?? null,
    ])),
    lastAdmission: { ...entry.lastAdmission, ordinal: entry.lastAdmission.ordinal.toString() },
  })));
  if (byteLength(encoded) > MAX_SNAPSHOT_SERIES_STATE_BYTES) {
    throw new Error("Token usage snapshot checkpoint state exceeds 16 KiB.");
  }
  return encoded;
};

export const decodeRecentIdempotencyDigests = (value: string): RecentTokenUsageIdentityDigest[] => {
  if (byteLength(value) > MAX_RECENT_IDEMPOTENCY_STATE_BYTES) {
    throw new Error("Token usage idempotency state exceeds 8 KiB.");
  }
  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed) || parsed.length > MAX_RECENT_IDEMPOTENCY_DIGESTS) {
    throw new Error("Token usage idempotency state exceeds 64 entries.");
  }
  const seen = new Set<string>();
  return parsed.map((entry) => {
    const record = asRecord(entry);
    if (typeof record.digest !== "string" || !SHA256_HEX_PATTERN.test(record.digest)) {
      throw new Error("Token usage idempotency state has an invalid digest.");
    }
    if (seen.has(record.digest)) throw new Error("Token usage idempotency digest repeats.");
    seen.add(record.digest);
    if (record.generation !== 0 && record.generation !== 1) {
      throw new Error("Token usage idempotency digest has an invalid generation.");
    }
    return {
      digest: record.digest,
      generation: record.generation,
      ordinal: asNonNegativeBigInt(record.ordinal, "identity ordinal"),
    };
  });
};

export const encodeRecentIdempotencyDigests = (state: readonly RecentTokenUsageIdentityDigest[]): string => {
  if (state.length > MAX_RECENT_IDEMPOTENCY_DIGESTS) {
    throw new Error("Token usage idempotency state exceeds 64 entries.");
  }
  const encoded = JSON.stringify(state.map((entry) => ({
    ...entry,
    ordinal: entry.ordinal.toString(),
  })));
  if (byteLength(encoded) > MAX_RECENT_IDEMPOTENCY_STATE_BYTES) {
    throw new Error("Token usage idempotency state exceeds 8 KiB.");
  }
  return encoded;
};
