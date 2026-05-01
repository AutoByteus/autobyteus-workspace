import type {
  AgentMemoryView,
  MemoryMessage,
  MemoryTraceEvent,
} from "../domain/models.js";
import { MemoryFileStore } from "../store/memory-file-store.js";

type RawTrace = Record<string, unknown>;

type AgentMemoryViewOptions = {
  includeWorkingContext?: boolean;
  includeEpisodic?: boolean;
  includeSemantic?: boolean;
  includeRawTraces?: boolean;
  includeArchive?: boolean;
  rawTraceLimit?: number | null;
};

export class AgentMemoryService {
  private store: MemoryFileStore;

  constructor(store: MemoryFileStore) {
    this.store = store;
  }

  getRunMemoryView(runId: string, options: AgentMemoryViewOptions = {}): AgentMemoryView {
    const {
      includeWorkingContext = true,
      includeEpisodic = true,
      includeSemantic = true,
      includeRawTraces = false,
      includeArchive = false,
      rawTraceLimit = null,
    } = options;

    let workingContext: MemoryMessage[] | null = null;
    if (includeWorkingContext) {
      const snapshotPayload = this.store.readWorkingContextSnapshot(runId);
      workingContext = this.parseWorkingContext(snapshotPayload);
    }

    const episodic = includeEpisodic ? this.store.readEpisodic(runId) : null;
    const semantic = includeSemantic ? this.store.readSemantic(runId) : null;

    let rawTraces: MemoryTraceEvent[] | null = null;
    if (includeRawTraces) {
      let merged = includeArchive
        ? this.store.readRawTraceCorpus(runId)
        : this.mergeAndSortTraces(this.store.readRawTracesActive(runId));
      merged = this.applyRawTraceLimit(merged, rawTraceLimit);

      rawTraces = merged.map((trace) => this.toTraceEvent(trace));
    }

    return {
      runId,
      workingContext,
      episodic,
      semantic,
      rawTraces,
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

  private mergeAndSortTraces(active: RawTrace[], archive?: RawTrace[]): RawTrace[] {
    const combined = [...active, ...(archive ?? [])];
    combined.sort((a, b) => {
      const tsA = (a.ts as number | undefined) ?? 0;
      const tsB = (b.ts as number | undefined) ?? 0;
      if (tsA !== tsB) {
        return tsA - tsB;
      }
      const turnA = (a.turn_id as string | undefined) ?? "";
      const turnB = (b.turn_id as string | undefined) ?? "";
      if (turnA !== turnB) {
        return turnA.localeCompare(turnB);
      }
      const seqA = (a.seq as number | undefined) ?? 0;
      const seqB = (b.seq as number | undefined) ?? 0;
      if (seqA !== seqB) {
        return seqA - seqB;
      }
      const idA = (a.id as string | undefined) ?? "";
      const idB = (b.id as string | undefined) ?? "";
      return idA.localeCompare(idB);
    });
    return combined;
  }

  private applyRawTraceLimit(traces: RawTrace[], limit?: number | null): RawTrace[] {
    if (!limit || limit <= 0) {
      return traces;
    }
    return traces.slice(-limit);
  }

  private toTraceEvent(trace: RawTrace): MemoryTraceEvent {
    return {
      id: (trace.id as string | undefined) ?? null,
      traceType: (trace.trace_type as string | undefined) ?? "",
      sourceEvent: (trace.source_event as string | undefined) ?? null,
      content: (trace.content as string | undefined) ?? null,
      toolName: (trace.tool_name as string | undefined) ?? null,
      toolCallId: (trace.tool_call_id as string | undefined) ?? null,
      toolArgs: (trace.tool_args as Record<string, unknown> | undefined) ?? null,
      toolResult: (trace.tool_result as unknown) ?? null,
      toolError: (trace.tool_error as string | undefined) ?? null,
      media: (trace.media as Record<string, string[]> | undefined) ?? null,
      turnId: (trace.turn_id as string | undefined) ?? "",
      seq: Number((trace.seq as number | undefined) ?? 0),
      ts: Number((trace.ts as number | undefined) ?? 0),
    };
  }
}

export type { AgentMemoryViewOptions };
