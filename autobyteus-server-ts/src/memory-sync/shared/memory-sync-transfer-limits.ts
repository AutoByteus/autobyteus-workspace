/**
 * The numbers the Memory Sync source and hub share. The source keeps its batches below what the hub accepts, so they
 * live in one file.
 */
const MiB = 1024 * 1024;
const GiB = 1024 * MiB;

/** A changed file up to this size travels inside a batch (base64); a larger one is staged on the hub first. */
export const MEMORY_SYNC_INLINE_FILE_MAX_BYTES = 8 * MiB;

/** Raw bytes of inline files in one batch (about 33 MiB as base64, below the request limit). */
export const MEMORY_SYNC_BATCH_INLINE_BYTES_BUDGET = 24 * MiB;

/** Staged bytes one batch asks the hub to verify; a larger file goes alone in its batch. */
export const MEMORY_SYNC_BATCH_STAGED_BYTES_BUDGET = 4 * GiB;

/** Raw bytes of one staged-file piece. */
export const MEMORY_SYNC_STAGED_PIECE_MAX_BYTES = 8 * MiB;

/** The hub's request body limit for a batch. */
export const MEMORY_SYNC_BATCH_REQUEST_LIMIT_BYTES = 50 * MiB;

/** A staged partial untouched for this long is abandoned and removed by the sweep. */
export const MEMORY_SYNC_STAGED_FILE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** The hub starts a staging sweep at most this often. */
export const MEMORY_SYNC_STAGING_SWEEP_INTERVAL_MS = 60 * 60 * 1000;
