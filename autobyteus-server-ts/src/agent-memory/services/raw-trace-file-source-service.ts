import fs from "node:fs";
import { RAW_TRACES_ACTIVE_MEMORY_FILE_NAME } from "autobyteus-ts/memory/store/memory-file-names.js";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import type { MemoryTraceEvent, RawTraceFileSummary } from "../domain/models.js";
import { MemoryFileStore } from "../store/memory-file-store.js";
import { normalizeRawTraceRecords } from "./raw-trace-record-normalizer.js";
import type { RawTraceRecord } from "./raw-trace-record-normalizer.js";

export type RawTraceFileOrder = "inspector" | "chronological";

export type RawTraceFileSource = RawTraceFileSummary & {
  filePath: string;
};

export type RawTraceSelectedFileRead = {
  files: RawTraceFileSummary[];
  selectedFile: RawTraceFileSource | null;
  selectedRawTraceFileName: string | null;
  records: MemoryTraceEvent[];
};

export type RawTraceFileSelection = Omit<RawTraceSelectedFileRead, "records">;

export class RawTraceFileSourceService {
  constructor(private readonly store: MemoryFileStore) {}

  listFiles(runId: string, order: RawTraceFileOrder = "inspector"): RawTraceFileSource[] {
    const runStore = this.createRunStore(runId);
    const activeSource = this.buildActiveSource(runStore);
    const segmentSources = this.buildSegmentSources(runStore);

    if (order === "chronological") {
      return activeSource ? [...segmentSources, activeSource] : segmentSources;
    }

    const newestSegments = [...segmentSources].sort(
      (a, b) => (b.segmentIndex ?? 0) - (a.segmentIndex ?? 0),
    );
    return activeSource ? [activeSource, ...newestSegments] : newestSegments;
  }

  readSelectedFile(
    runId: string,
    requestedFileName?: string | null,
    limit?: number | null,
  ): RawTraceSelectedFileRead {
    const selection = this.resolveSelection(runId, requestedFileName);
    const records = selection.selectedFile
      ? normalizeRawTraceRecords(this.readRecords(runId, selection.selectedFile), limit)
      : [];

    return {
      ...selection,
      records,
    };
  }

  resolveSelection(runId: string, requestedFileName?: string | null): RawTraceFileSelection {
    const files = this.listFiles(runId, "inspector");
    const selectedFile = this.selectFile(files, requestedFileName);
    return {
      files: files.map((file) => this.toSummary(file)),
      selectedFile,
      selectedRawTraceFileName: selectedFile?.fileName ?? null,
    };
  }

  readFile(
    runId: string,
    fileName: string,
    limit?: number | null,
  ): { file: RawTraceFileSource; records: MemoryTraceEvent[] } | null {
    const file = this.listFiles(runId, "inspector").find((candidate) => candidate.fileName === fileName);
    if (!file) {
      return null;
    }
    return this.readSource(runId, file, limit);
  }

  readSource(
    runId: string,
    file: RawTraceFileSource,
    limit?: number | null,
  ): { file: RawTraceFileSource; records: MemoryTraceEvent[] } {
    return {
      file,
      records: normalizeRawTraceRecords(this.readRecords(runId, file), limit),
    };
  }

  private createRunStore(runId: string): RunMemoryFileStore {
    return new RunMemoryFileStore(this.store.getRunDir(runId));
  }

  private buildActiveSource(runStore: RunMemoryFileStore): RawTraceFileSource | null {
    const filePath = runStore.getRawTracesPath();
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return {
      fileName: RAW_TRACES_ACTIVE_MEMORY_FILE_NAME,
      kind: "active",
      recordCount: this.countJsonlRecords(filePath),
      segmentIndex: null,
      firstTimestamp: null,
      lastTimestamp: null,
      filePath,
    };
  }

  private buildSegmentSources(runStore: RunMemoryFileStore): RawTraceFileSource[] {
    return runStore.listCompleteRawTraceArchiveSegments().flatMap((segment): RawTraceFileSource[] => {
      const filePath = runStore.getCompleteRawTraceArchiveSegmentPathByFileName(segment.file_name);
      if (!filePath) {
        return [];
      }
      return [{
        fileName: segment.file_name,
        kind: "segment",
        recordCount: segment.record_count,
        segmentIndex: segment.index,
        firstTimestamp: segment.first_ts ?? null,
        lastTimestamp: segment.last_ts ?? null,
        filePath,
      }];
    });
  }

  private selectFile(
    files: RawTraceFileSource[],
    requestedFileName?: string | null,
  ): RawTraceFileSource | null {
    if (!files.length) {
      return null;
    }
    if (requestedFileName) {
      const requested = files.find((file) => file.fileName === requestedFileName);
      if (requested) {
        return requested;
      }
    }
    return files[0] ?? null;
  }

  private readRecords(runId: string, file: RawTraceFileSource): RawTraceRecord[] {
    const runStore = this.createRunStore(runId);
    if (file.kind === "active") {
      return this.store.readRawTracesActive(runId);
    }
    return runStore.readCompleteRawTraceArchiveSegmentDictsByFileName(file.fileName) ?? [];
  }

  private countJsonlRecords(filePath: string): number {
    const raw = fs.readFileSync(filePath, "utf-8");
    if (!raw.trim()) {
      return 0;
    }
    return raw.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
  }

  private toSummary(file: RawTraceFileSource): RawTraceFileSummary {
    return {
      fileName: file.fileName,
      kind: file.kind,
      recordCount: file.recordCount,
      segmentIndex: file.segmentIndex ?? null,
      firstTimestamp: file.firstTimestamp ?? null,
      lastTimestamp: file.lastTimestamp ?? null,
    };
  }
}
