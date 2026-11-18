import type {
  AgentMemoryView,
  MemoryTraceEvent,
  RawTraceFileSummary,
} from "../domain/models.js";
import { MemoryFileStore } from "../store/memory-file-store.js";
import { RawTraceFileSourceService } from "./raw-trace-file-source-service.js";
import { normalizeRawTraceRecords } from "./raw-trace-record-normalizer.js";
import type { ActiveRawTraceSnapshot } from "../store/memory-file-store.js";

type AgentMemoryViewOptions = {
  includeRawTraces?: boolean;
  includeRawTraceFiles?: boolean;
  includeArchive?: boolean;
  rawTraceLimit?: number | null;
  rawTraceFileName?: string | null;
};

export class AgentMemoryService {
  private store: MemoryFileStore;
  private rawTraceFileSourceService: RawTraceFileSourceService;

  constructor(store: MemoryFileStore) {
    this.store = store;
    this.rawTraceFileSourceService = new RawTraceFileSourceService(store);
  }

  getRunMemoryView(runId: string, options: AgentMemoryViewOptions = {}): AgentMemoryView {
    const {
      includeRawTraces = false,
      includeRawTraceFiles = false,
      includeArchive = false,
      rawTraceLimit = null,
      rawTraceFileName = null,
    } = options;

    let rawTraces: MemoryTraceEvent[] | null = null;
    let rawTraceFiles: RawTraceFileSummary[] | null = null;
    let selectedRawTraceFileName: string | null = null;
    const useSelectedFileMode = includeRawTraceFiles || rawTraceFileName !== null;

    if (useSelectedFileMode) {
      if (includeRawTraces) {
        const selectedRead = this.rawTraceFileSourceService.readSelectedFile(
          runId,
          rawTraceFileName,
          rawTraceLimit,
        );
        rawTraceFiles = includeRawTraceFiles ? selectedRead.files : null;
        selectedRawTraceFileName = selectedRead.selectedRawTraceFileName;
        rawTraces = selectedRead.records;
      } else if (includeRawTraceFiles) {
        const selection = this.rawTraceFileSourceService.resolveSelection(runId, rawTraceFileName);
        rawTraceFiles = selection.files;
        selectedRawTraceFileName = selection.selectedRawTraceFileName;
      }
    } else if (includeRawTraces) {
      const records = includeArchive
        ? this.store.readRawTraceCorpus(runId)
        : this.store.readRawTracesActive(runId);
      rawTraces = normalizeRawTraceRecords(records, rawTraceLimit);
    }

    return {
      runId,
      rawTraces,
      rawTraceFiles,
      selectedRawTraceFileName,
    };
  }

  /** The chat's records: the run's switch segments, then the active file (see `MemoryFileStore.readChatRawTraces`). */
  getChatRawTraceSnapshot(runId: string): ActiveRawTraceSnapshot & { rawTraces: MemoryTraceEvent[] } {
    const snapshot = this.store.readChatRawTraces(runId);
    return {
      ...snapshot,
      rawTraces: normalizeRawTraceRecords(snapshot.records, null),
    };
  }
}

export type { AgentMemoryViewOptions };
