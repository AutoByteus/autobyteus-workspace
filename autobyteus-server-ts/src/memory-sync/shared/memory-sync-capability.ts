export const MEMORY_SYNC_NOT_MIGRATED = "MEMORY_SYNC_NOT_MIGRATED";
export const MEMORY_SYNC_NOT_MIGRATED_TEXT = "Memory Sync is waiting for its data migration.";

/**
 * Memory Sync is held back: its stored files may still have their released names (autobyteus-290 SM-2 … SM-5,
 * capability `memory_sync`). Every Memory Sync store throws this one error before it reads or writes anything, and
 * each consumer states it: the settings GraphQL reads and saves fail with its text, hub ingestion answers 503, the
 * background loop does not run, and the Memory page lists only local memory.
 */
export class MemorySyncNotMigratedError extends Error {
  readonly code = MEMORY_SYNC_NOT_MIGRATED;

  constructor() {
    super(MEMORY_SYNC_NOT_MIGRATED_TEXT);
    this.name = "MemorySyncNotMigratedError";
  }
}

/**
 * The `memory_sync` capability. Pending until the startup owner (`startup/app-data-capability-readiness.ts`) applies
 * the migration runner's answer.
 */
let memorySyncReady = false;

export const configureMemorySyncCapability = (ready: boolean): void => {
  memorySyncReady = ready;
};

export const isMemorySyncReady = (): boolean => memorySyncReady;

/** Called by each Memory Sync store before it touches a file. */
export const requireMemorySyncReady = (): void => {
  if (!memorySyncReady) throw new MemorySyncNotMigratedError();
};
