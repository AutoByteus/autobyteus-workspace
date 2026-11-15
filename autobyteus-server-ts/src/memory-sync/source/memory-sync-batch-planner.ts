import {
  MEMORY_SYNC_BATCH_INLINE_BYTES_BUDGET,
  MEMORY_SYNC_BATCH_STAGED_BYTES_BUDGET,
  MEMORY_SYNC_INLINE_FILE_MAX_BYTES,
} from "../shared/memory-sync-transfer-limits.js";
import type { ChangedMemoryFile } from "../shared/memory-sync-types.js";

export type PlannedMemoryFile = {
  file: ChangedMemoryFile;
  /** `inline`: content travels in the batch. `staged`: content is uploaded to the hub's staging area first. */
  lane: "inline" | "staged";
};

export type PlannedMemoryBatch = {
  files: PlannedMemoryFile[];
};

/**
 * Cuts changed files, in order, into batches: at most `batchSize` files, at most the inline byte budget of inline
 * content, and at most the staged byte budget of staged content (a staged file larger than the budget is the only
 * staged file of its batch). A file larger than the inline threshold is staged.
 */
export const planMemorySyncBatches = (files: ChangedMemoryFile[], batchSize: number): PlannedMemoryBatch[] => {
  const batches: PlannedMemoryBatch[] = [];
  let current: PlannedMemoryFile[] = [];
  let inlineBytes = 0;
  let stagedBytes = 0;

  for (const file of files) {
    const lane = file.size > MEMORY_SYNC_INLINE_FILE_MAX_BYTES ? "staged" : "inline";
    const overBudget = lane === "inline"
      ? inlineBytes + file.size > MEMORY_SYNC_BATCH_INLINE_BYTES_BUDGET
      : stagedBytes > 0 && stagedBytes + file.size > MEMORY_SYNC_BATCH_STAGED_BYTES_BUDGET;
    if (current.length > 0 && (current.length >= batchSize || overBudget)) {
      batches.push({ files: current });
      current = [];
      inlineBytes = 0;
      stagedBytes = 0;
    }
    current.push({ file, lane });
    if (lane === "inline") {
      inlineBytes += file.size;
    } else {
      stagedBytes += file.size;
    }
  }
  if (current.length > 0) {
    batches.push({ files: current });
  }
  return batches;
};
