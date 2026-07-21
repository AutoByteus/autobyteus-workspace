import type {
  AgentMemoryView,
  MemoryMessage,
  MemoryTraceEvent,
  RawTraceFileSummary,
} from "../domain/models.js";
import { MemoryFileStore } from "../store/memory-file-store.js";
import { RawTraceFileSourceService } from "./raw-trace-file-source-service.js";
import { normalizeRawTraceRecords } from "./raw-trace-record-normalizer.js";
import type { ActiveRawTraceSnapshot } from "../store/memory-file-store.js";

type AgentMemoryViewOptions = {
  includeWorkingContext?: boolean;
  includeEpisodic?: boolean;
  includeSemantic?: boolean;
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
      includeWorkingContext = true,
      includeEpisodic = true,
      includeSemantic = true,
      includeRawTraces = false,
      includeRawTraceFiles = false,
      includeArchive = false,
      rawTraceLimit = null,
      rawTraceFileName = null,
    } = options;

    let workingContext: MemoryMessage[] | null = null;
    if (includeWorkingContext) {
      const snapshotPayload = this.store.readWorkingContextSnapshot(runId);
      workingContext = this.parseWorkingContext(snapshotPayload);
    }

    const episodic = includeEpisodic ? this.store.readEpisodic(runId) : null;
    const semantic = includeSemantic ? this.store.readSemantic(runId) : null;

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
      workingContext,
      episodic,
      semantic,
      rawTraces,
      rawTraceFiles,
      selectedRawTraceFileName,
    };
  }

  getActiveRawTraceSnapshot(runId: string): ActiveRawTraceSnapshot & { rawTraces: MemoryTraceEvent[] } {
    const snapshot = this.store.readRawTracesActiveSnapshot(runId);
    return {
      ...snapshot,
      rawTraces: normalizeRawTraceRecords(snapshot.records, null),
    };
  }

  private parseWorkingContext(payload: Record<string, unknown> | null): MemoryMessage[] | null {
    if (!payload || typeof payload !== "object") {
      return null;
    }
    const messages = payload.messages as unknown;
    if (!Array.isArray(messages)) {
      return null;
    }

    const parsed: MemoryMessage[] = [];
    for (const message of messages) {
      if (!message || typeof message !== "object") {
        continue;
      }
      const msg = message as Record<string, unknown>;
      parsed.push({
        role: (msg.role as string | undefined) ?? "",
        content: (msg.content as string | undefined) ?? null,
        reasoning: (msg.reasoning_content as string | undefined) ?? null,
        toolPayload: (msg.tool_payload as Record<string, unknown> | undefined) ?? null,
        ts: null,
      });
    }

    return parsed;
  }
}

export type { AgentMemoryViewOptions };
