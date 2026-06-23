import type { MemorySyncManifest } from "./memory-sync-types.js";

export const createEmptyMemorySyncManifest = (sourceNodeId: string): MemorySyncManifest => ({
  schemaVersion: 1,
  sourceNodeId,
  lastCommittedBatchId: null,
  lastCommittedAt: null,
  batchDigests: {},
  recentBatches: [],
  totals: { fileCount: 0, totalBytes: 0 },
  files: {},
});

export const normalizeMemorySyncManifest = (
  sourceNodeId: string,
  value: Partial<MemorySyncManifest> | null | undefined,
): MemorySyncManifest => {
  const fallback = createEmptyMemorySyncManifest(sourceNodeId);
  if (!value || typeof value !== "object") {
    return fallback;
  }
  const files = value.files && typeof value.files === "object" ? value.files : {};
  const recentBatches = Array.isArray(value.recentBatches) ? value.recentBatches : [];
  const batchDigests = value.batchDigests && typeof value.batchDigests === "object" ? value.batchDigests : {};
  const totals = value.totals && typeof value.totals === "object"
    ? value.totals
    : fallback.totals;
  const normalizedRecentBatches = recentBatches.filter((batch) => Boolean(batch?.batchId && batch?.digest && batch?.committedAt));
  const normalizedBatchDigests: Record<string, MemorySyncManifest["recentBatches"][number]> = {};
  for (const record of Object.values(batchDigests)) {
    if (record?.batchId && record?.digest && record?.committedAt) {
      normalizedBatchDigests[record.batchId] = record;
    }
  }
  for (const record of normalizedRecentBatches) {
    normalizedBatchDigests[record.batchId] ??= record;
  }
  return {
    schemaVersion: 1,
    sourceNodeId,
    lastCommittedBatchId: typeof value.lastCommittedBatchId === "string" ? value.lastCommittedBatchId : null,
    lastCommittedAt: typeof value.lastCommittedAt === "string" ? value.lastCommittedAt : null,
    batchDigests: normalizedBatchDigests,
    recentBatches: normalizedRecentBatches,
    totals: {
      fileCount: Number.isFinite(totals.fileCount) ? Number(totals.fileCount) : Object.keys(files).length,
      totalBytes: Number.isFinite(totals.totalBytes) ? Number(totals.totalBytes) : 0,
    },
    files,
  };
};

export const recomputeMemorySyncManifestTotals = (manifest: MemorySyncManifest): MemorySyncManifest => {
  let totalBytes = 0;
  for (const record of Object.values(manifest.files)) {
    totalBytes += Number.isFinite(record.size) ? record.size : 0;
  }
  return {
    ...manifest,
    totals: {
      fileCount: Object.keys(manifest.files).length,
      totalBytes,
    },
  };
};
