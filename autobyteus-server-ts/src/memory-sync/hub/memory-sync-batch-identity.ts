import { createHash } from "node:crypto";
import { normalizeMemorySyncRelativePath } from "../shared/memory-sync-path-policy.js";
import type { MemoryFileOperation } from "../shared/memory-sync-types.js";

export const digestMemorySyncOperations = (operations: MemoryFileOperation[]): string => {
  const canonical = operations.map((operation) => ({
    opId: operation.opId,
    operation: operation.operation,
    kind: operation.kind,
    relativePath: normalizeMemorySyncRelativePath(operation.relativePath),
    size: operation.size,
    sha256: operation.sha256,
    mtimeMs: operation.mtimeMs ?? null,
  })).sort((left, right) => `${left.kind}/${left.relativePath}/${left.opId}`.localeCompare(`${right.kind}/${right.relativePath}/${right.opId}`));
  return createHash("sha256").update(JSON.stringify(canonical), "utf8").digest("hex");
};

export const validateMemorySyncBatchId = (batchId: string): string => {
  const normalized = String(batchId ?? "").trim();
  if (!/^[A-Za-z0-9_.:-]{1,180}$/.test(normalized)) {
    throw new Error("batchId must be a non-empty safe identifier.");
  }
  return normalized;
};
