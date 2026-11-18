import { hashStableFile } from "../shared/memory-sync-file-hash.js";
import { toMemorySyncFileKey } from "../shared/memory-sync-path-policy.js";
import type {
  ChangedMemoryFile,
  MemoryFileEntry,
  MemorySyncSourceState,
} from "../shared/memory-sync-types.js";
import { isFileFailureDue, MemoryFileReadError, type MemorySyncRunTrigger } from "./memory-sync-file-failure-policy.js";

export type MemoryFileChangePlan = {
  changed: ChangedMemoryFile[];
  unchangedCount: number;
  /** Failing files whose retry is not due yet. */
  waitingCount: number;
  /** Files left for a later run because they changed or vanished while being read. */
  deferred: Array<{ key: string; reason: string }>;
  /** Files that could not be read on this node. */
  failed: Array<{ entry: MemoryFileEntry; reason: string }>;
};

/** A file whose size and modification time equal its last synced record is unchanged and is not read. */
const matchesSyncedRecord = (
  entry: MemoryFileEntry,
  record: MemorySyncSourceState["files"][string] | undefined,
): boolean => Boolean(record)
  && record?.size === entry.size
  && Math.trunc(record?.mtimeMs ?? -1) === Math.trunc(entry.mtimeMs);

export class MemoryFileChangePlanner {
  /** Decides which listed files are changed and due, and hashes each of them by streaming. */
  async planChangedFiles(
    entries: MemoryFileEntry[],
    state: Pick<MemorySyncSourceState, "files" | "fileFailures">,
    trigger: MemorySyncRunTrigger,
    now: Date,
  ): Promise<MemoryFileChangePlan> {
    const plan: MemoryFileChangePlan = { changed: [], unchangedCount: 0, waitingCount: 0, deferred: [], failed: [] };

    for (const entry of entries) {
      const key = toMemorySyncFileKey(entry.kind, entry.relativePath);
      if (matchesSyncedRecord(entry, state.files[key])) {
        plan.unchangedCount += 1;
        continue;
      }
      const failure = state.fileFailures[key];
      if (failure && !isFileFailureDue(failure, entry, trigger, now)) {
        plan.waitingCount += 1;
        continue;
      }
      try {
        const sha256 = await hashStableFile(entry.absolutePath, entry);
        if (sha256) {
          plan.changed.push({ ...entry, sha256 });
        } else {
          plan.deferred.push({ key, reason: "file changed while being read" });
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          plan.deferred.push({ key, reason: "file disappeared while being read" });
        } else {
          plan.failed.push({ entry, reason: new MemoryFileReadError(entry.absolutePath, error).message });
        }
      }
    }
    return plan;
  }
}
