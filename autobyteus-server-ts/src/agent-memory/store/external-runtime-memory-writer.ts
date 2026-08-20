import { randomUUID } from "node:crypto";
import { RawTraceItem, type RawTraceItemOptions } from "autobyteus-ts/memory/models/raw-trace-item.js";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import {
  buildToolTraceLifecycleIndex,
  type ToolTraceLifecycleGroup,
} from "autobyteus-ts/memory/tool-trace-lifecycle-index.js";
import type { RuntimeMemoryTraceInput } from "../domain/memory-recording-models.js";

const toTimestampSeconds = (value?: number | null): number => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value > 10_000_000_000 ? value / 1000 : value;
  }
  return Date.now() / 1000;
};

export class ExternalRuntimeMemoryWriter {
  private readonly store: RunMemoryFileStore;
  private readonly seqByTurn = new Map<string, number>();

  constructor(input: { memoryDir: string }) {
    const memoryDir = input.memoryDir.trim();
    if (!memoryDir) {
      throw new Error("memoryDir is required.");
    }
    this.store = new RunMemoryFileStore(memoryDir);
    this.initializeSequences();
  }

  appendRawTrace(input: RuntimeMemoryTraceInput): RawTraceItem {
    const options: RawTraceItemOptions = {
      id: `rt_${Date.now()}_${randomUUID()}`,
      ts: toTimestampSeconds(input.ts),
      turnId: input.turnId,
      seq: this.nextSeq(input.turnId),
      traceType: input.traceType,
      content: input.content ?? "",
      sourceEvent: input.sourceEvent,
    };
    if (input.traceType === "tool_call") {
      Object.assign(options, {
        toolName: input.toolName,
        toolCallId: input.toolCallId,
        toolArgs: input.toolArgs,
      });
    } else if (input.traceType === "tool_result") {
      Object.assign(options, {
        toolName: input.toolName,
        toolCallId: input.toolCallId,
        toolResult: input.toolResult === undefined ? null : input.toolResult,
        toolError: input.toolError ?? null,
      });
    } else if (input.traceType === "provider_compaction_boundary") {
      if (input.toolResult !== undefined) options.toolResult = input.toolResult;
      options.correlationId = input.correlationId;
    } else {
      options.media = input.media;
      options.correlationId = input.correlationId;
    }
    const trace = new RawTraceItem(options);
    this.store.appendRawTrace(trace);
    return trace;
  }

  readToolTraceLifecycleGroups(): ReadonlyMap<string, ToolTraceLifecycleGroup> {
    return buildToolTraceLifecycleIndex(this.store.listTurnRawTraceCorpusOrdered());
  }

  getProviderCompactionBoundaryState(boundaryKey: string): {
    activeMarkerTraceId: string | null;
    hasCompleteSegment: boolean;
  } {
    return {
      activeMarkerTraceId: this.store.findActiveRawTraceByCorrelationId(
        boundaryKey,
        "provider_compaction_boundary",
      )?.id ?? null,
      hasCompleteSegment: this.store.hasCompleteRawTraceArchiveSegment(boundaryKey),
    };
  }

  removeActiveRecordsArchivedByBoundary(boundaryKey: string): void {
    this.store.removeActiveRawTracesArchivedByBoundary(boundaryKey);
  }

  rotateActiveRawTracesBeforeBoundary(input: {
    boundaryTraceId: string;
    boundaryKey: string;
    boundaryType: "provider_compaction_boundary";
    runtimeKind?: string | null;
    sourceEvent?: string | null;
  }): void {
    this.store.rotateActiveRawTracesBeforeBoundary({
      boundaryTraceId: input.boundaryTraceId,
      boundaryKey: input.boundaryKey,
      boundaryType: input.boundaryType,
      runtimeKind: input.runtimeKind ?? null,
      sourceEvent: input.sourceEvent ?? null,
    });
  }

  private nextSeq(turnId: string): number {
    const current = (this.seqByTurn.get(turnId) ?? 0) + 1;
    this.seqByTurn.set(turnId, current);
    return current;
  }

  private initializeSequences(): void {
    for (const trace of this.store.listTurnRawTracesOrdered()) {
      this.rememberSeq(trace.turnId, trace.seq);
    }
    for (const trace of this.store.listArchiveTurnRawTracesOrdered()) {
      this.rememberSeq(trace.turnId, trace.seq);
    }
  }

  private rememberSeq(turnId: string, seq: number): void {
    const current = this.seqByTurn.get(turnId) ?? 0;
    if (seq > current) {
      this.seqByTurn.set(turnId, seq);
    }
  }
}
