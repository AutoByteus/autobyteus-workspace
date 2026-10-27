import path from "node:path";
import {
  RAW_TRACES_ACTIVE_MEMORY_FILE_NAME,
  WORKING_CONTEXT_SNAPSHOT_FILE_NAME,
} from "autobyteus-ts/memory/store/memory-file-names.js";
import { WORK_JOURNAL_DIR_NAME, WORK_JOURNAL_MANIFEST_FILE_NAME } from "../../agent-work-journal/store/work-journal-store.js";
import type {
  MemoryAvailabilityBuildResult,
  MemoryAvailabilitySummary,
} from "../domain/models.js";
import type { FileInfo, MemoryFileStore } from "../store/memory-file-store.js";

const toIsoWithoutMs = (mtime?: number | null): string | null => {
  if (!mtime || mtime <= 0) {
    return null;
  }
  return new Date(mtime * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
};

const maxMtime = (infos: Array<FileInfo | null>): number => {
  const mtimes = infos
    .filter((info): info is FileInfo => Boolean(info))
    .map((info) => info.mtime);
  return mtimes.length ? Math.max(...mtimes) : 0;
};

/** Which runs the Memory page lists: those with raw traces, an archive, a Work Journal or a working-context snapshot. */
export const hasMemoryAvailability = (result: MemoryAvailabilityBuildResult): boolean =>
  result.availability.hasWorkJournal ||
  result.availability.hasRawTraces ||
  result.availability.hasRawArchive ||
  result.hasWorkingContextSnapshot;

export const mergeMemoryAvailability = (
  summaries: readonly MemoryAvailabilityBuildResult[],
): MemoryAvailabilityBuildResult => {
  const latestMemoryMtime = summaries.reduce(
    (max, item) => Math.max(max, item.latestMemoryMtime),
    0,
  );
  const merged: MemoryAvailabilitySummary = {
    latestMemoryAt: toIsoWithoutMs(latestMemoryMtime),
    hasWorkJournal: summaries.some((item) => item.availability.hasWorkJournal),
    hasRawTraces: summaries.some((item) => item.availability.hasRawTraces),
    hasRawArchive: summaries.some((item) => item.availability.hasRawArchive),
  };
  return {
    latestMemoryMtime,
    availability: merged,
    hasWorkingContextSnapshot: summaries.some((item) => item.hasWorkingContextSnapshot),
  };
};

export class MemoryRunSummaryBuilder {
  constructor(private readonly store: MemoryFileStore) {}

  build(runId: string): MemoryAvailabilityBuildResult {
    const runDir = this.store.getRunDir(runId);
    const workingContextInfo = this.store.getFileInfo(
      path.join(runDir, WORKING_CONTEXT_SNAPSHOT_FILE_NAME),
    );
    const workJournalInfo = this.store.getFileInfo(path.join(runDir, WORK_JOURNAL_DIR_NAME, WORK_JOURNAL_MANIFEST_FILE_NAME));
    const rawTracesInfo = this.store.getFileInfo(path.join(runDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME));
    const rawArchiveInfo = this.store.getRawTraceArchiveInfo(runId);
    const latestMemoryMtime = maxMtime([
      workingContextInfo,
      rawTracesInfo,
      rawArchiveInfo,
    ]);

    return {
      latestMemoryMtime,
      availability: {
        latestMemoryAt: toIsoWithoutMs(latestMemoryMtime),
        hasWorkJournal: workJournalInfo !== null,
        hasRawTraces: rawTracesInfo !== null,
        hasRawArchive: rawArchiveInfo !== null,
      },
      hasWorkingContextSnapshot: workingContextInfo !== null,
    };
  }
}
