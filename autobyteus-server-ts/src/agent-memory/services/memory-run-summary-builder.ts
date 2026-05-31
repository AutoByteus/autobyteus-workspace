import path from "node:path";
import {
  EPISODIC_MEMORY_FILE_NAME,
  RAW_TRACES_MEMORY_FILE_NAME,
  SEMANTIC_MEMORY_FILE_NAME,
  WORKING_CONTEXT_SNAPSHOT_FILE_NAME,
} from "autobyteus-ts/memory/store/memory-file-names.js";
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

export const hasMemoryAvailability = (summary: MemoryAvailabilitySummary): boolean =>
  summary.hasWorkingContext ||
  summary.hasEpisodic ||
  summary.hasSemantic ||
  summary.hasRawTraces ||
  summary.hasRawArchive;

export const mergeMemoryAvailability = (
  summaries: readonly MemoryAvailabilityBuildResult[],
): MemoryAvailabilityBuildResult => {
  const latestMemoryMtime = summaries.reduce(
    (max, item) => Math.max(max, item.latestMemoryMtime),
    0,
  );
  return {
    latestMemoryMtime,
    availability: {
      latestMemoryAt: toIsoWithoutMs(latestMemoryMtime),
      hasWorkingContext: summaries.some((item) => item.availability.hasWorkingContext),
      hasEpisodic: summaries.some((item) => item.availability.hasEpisodic),
      hasSemantic: summaries.some((item) => item.availability.hasSemantic),
      hasRawTraces: summaries.some((item) => item.availability.hasRawTraces),
      hasRawArchive: summaries.some((item) => item.availability.hasRawArchive),
    },
  };
};

export class MemoryRunSummaryBuilder {
  constructor(private readonly store: MemoryFileStore) {}

  build(runId: string): MemoryAvailabilityBuildResult {
    const runDir = this.store.getRunDir(runId);
    const workingContextInfo = this.store.getFileInfo(
      path.join(runDir, WORKING_CONTEXT_SNAPSHOT_FILE_NAME),
    );
    const episodicInfo = this.store.getFileInfo(path.join(runDir, EPISODIC_MEMORY_FILE_NAME));
    const semanticInfo = this.store.getFileInfo(path.join(runDir, SEMANTIC_MEMORY_FILE_NAME));
    const rawTracesInfo = this.store.getFileInfo(path.join(runDir, RAW_TRACES_MEMORY_FILE_NAME));
    const rawArchiveInfo = this.store.getRawTraceArchiveInfo(runId);
    const latestMemoryMtime = maxMtime([
      workingContextInfo,
      episodicInfo,
      semanticInfo,
      rawTracesInfo,
      rawArchiveInfo,
    ]);

    return {
      latestMemoryMtime,
      availability: {
        latestMemoryAt: toIsoWithoutMs(latestMemoryMtime),
        hasWorkingContext: workingContextInfo !== null,
        hasEpisodic: episodicInfo !== null,
        hasSemantic: semanticInfo !== null,
        hasRawTraces: rawTracesInfo !== null,
        hasRawArchive: rawArchiveInfo !== null,
      },
    };
  }
}
