import type { MemoryFileEntry, MemorySyncFileFailure } from "../shared/memory-sync-types.js";

export type MemorySyncRunTrigger = "manual" | "background";

const FIRST_RETRY_DELAY_MS = 60 * 1000;
const MAX_RETRY_DELAY_MS = 60 * 60 * 1000;

/** A file could not be read on this node (permissions, I/O): a problem of that file, not of the run. */
export class MemoryFileReadError extends Error {
  /** The system error code of the failed read (`ENOENT` when the file vanished). */
  readonly code: string | null;

  constructor(public readonly filePath: string, cause: unknown) {
    super(`Could not read file: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = "MemoryFileReadError";
    this.code = typeof (cause as NodeJS.ErrnoException | undefined)?.code === "string"
      ? (cause as NodeJS.ErrnoException).code ?? null
      : null;
  }
}

/** 1 minute after the first failure, doubling per further failure of the same file version, at most 1 hour. */
export const fileFailureRetryDelayMs = (attempts: number): number =>
  Math.min(FIRST_RETRY_DELAY_MS * 2 ** Math.max(attempts - 1, 0), MAX_RETRY_DELAY_MS);

const isSameFileVersion = (
  failure: Pick<MemorySyncFileFailure, "size" | "mtimeMs">,
  entry: Pick<MemoryFileEntry, "size" | "mtimeMs">,
): boolean => failure.size === entry.size && Math.trunc(failure.mtimeMs) === Math.trunc(entry.mtimeMs);

/**
 * A failing file is retried when the owner pressed Sync now, when its retry delay has passed, or at once when the
 * file changed since the failure.
 */
export const isFileFailureDue = (
  failure: MemorySyncFileFailure,
  entry: MemoryFileEntry,
  trigger: MemorySyncRunTrigger,
  now: Date,
): boolean =>
  trigger === "manual"
  || !isSameFileVersion(failure, entry)
  || Date.parse(failure.nextAttemptAt) <= now.getTime();

/** The record for a file that failed again (attempts continue only for the same file version). */
export const buildFileFailure = (
  entry: Pick<MemoryFileEntry, "kind" | "relativePath" | "size" | "mtimeMs">,
  reason: string,
  previous: MemorySyncFileFailure | undefined,
  now: Date,
): MemorySyncFileFailure => {
  const attempts = previous && isSameFileVersion(previous, entry) ? previous.attempts + 1 : 1;
  return {
    kind: entry.kind,
    relativePath: entry.relativePath,
    size: entry.size,
    mtimeMs: entry.mtimeMs,
    reason,
    attempts,
    lastFailedAt: now.toISOString(),
    nextAttemptAt: new Date(now.getTime() + fileFailureRetryDelayMs(attempts)).toISOString(),
  };
};
