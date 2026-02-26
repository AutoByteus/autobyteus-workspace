import type {
  AgentMemoryView,
  MemoryConversationEntry,
  MemoryMessage,
  MemoryTraceEvent,
} from "../domain/models.js";
import { MemoryFileStore } from "../store/memory-file-store.js";
import { buildConversationView } from "../transformers/raw-trace-to-conversation.js";

type RawTrace = Record<string, unknown>;

type AgentMemoryViewOptions = {
  includeWorkingContext?: boolean;
  includeEpisodic?: boolean;
  includeSemantic?: boolean;
  includeConversation?: boolean;
  includeRawTraces?: boolean;
  includeArchive?: boolean;
  rawTraceLimit?: number | null;
  conversationLimit?: number | null;
};

export class AgentMemoryViewService {
  private store: MemoryFileStore;

  constructor(store: MemoryFileStore) {
    this.store = store;
  }

  getRunMemoryView(runId: string, options: AgentMemoryViewOptions = {}): AgentMemoryView {
    const {
      includeWorkingContext = true,
      includeEpisodic = true,
      includeSemantic = true,
      includeConversation = true,
      includeRawTraces = false,
      includeArchive = false,
      rawTraceLimit = null,
      conversationLimit = null,
    } = options;

    let workingContext: MemoryMessage[] | null = null;
    if (includeWorkingContext) {
      const snapshotPayload = this.store.readWorkingContextSnapshot(runId);
      workingContext = this.parseWorkingContext(snapshotPayload);
    }

    const episodic = includeEpisodic ? this.store.readEpisodic(runId) : null;
    const semantic = includeSemantic ? this.store.readSemantic(runId) : null;

    let rawTraces: MemoryTraceEvent[] | null = null;
    let conversation: MemoryConversationEntry[] | null = null;

    if (includeConversation || includeRawTraces) {
      const active = this.store.readRawTracesActive(runId);
      const archive = includeArchive ? this.store.readRawTracesArchive(runId) : [];
      let merged = this.mergeAndSortTraces(active, archive);
      merged = this.applyRawTraceLimit(merged, rawTraceLimit);

      if (includeRawTraces) {
        rawTraces = merged.map((trace) => this.toTraceEvent(trace));
      }

      if (includeConversation) {
        const entries = buildConversationView(merged, true);
        conversation = this.applyConversationLimit(entries, conversationLimit);
      }
    }

    return {
      runId,
      workingContext,
      episodic,
      semantic,
      conversation,
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
      return seqA - seqB;
    });
    return combined;
  }

  private applyRawTraceLimit(traces: RawTrace[], limit?: number | null): RawTrace[] {
    if (!limit || limit <= 0) {
      return traces;
    }
    return traces.slice(-limit);
  }

  private applyConversationLimit(
    entries: MemoryConversationEntry[],
    limit?: number | null,
  ): MemoryConversationEntry[] {
    if (!limit || limit <= 0) {
      return entries;
    }
    return entries.slice(-limit);
  }

  private toTraceEvent(trace: RawTrace): MemoryTraceEvent {
    return {
      traceType: (trace.trace_type as string | undefined) ?? "",
      content: (trace.content as string | undefined) ?? null,
      toolName: (trace.tool_name as string | undefined) ?? null,
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
