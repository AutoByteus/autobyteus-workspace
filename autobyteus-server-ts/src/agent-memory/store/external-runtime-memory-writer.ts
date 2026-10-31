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
    const trace = this.buildRawTrace(input);
    this.store.appendRawTrace(trace);
    return trace;
  }

  /** The record `appendRawTrace` would write, with its sequence number taken but nothing written. `id` is the caller's own. */
  buildRawTrace(input: RuntimeMemoryTraceInput & { id?: string }): RawTraceItem {
    const options: RawTraceItemOptions = {
      id: input.id ?? `rt_${Date.now()}_${randomUUID()}`,
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
    } else if (input.traceType === "system_task_notification") {
      options.senderId = input.senderId;
      options.correlationId = input.correlationId;
    } else if (input.traceType === "provider_compaction_boundary") {
      if (input.toolResult !== undefined) options.toolResult = input.toolResult;
      options.correlationId = input.correlationId;
    } else {
      options.media = input.media;
      if (input.traceType === "user") {
        options.fileAttachments = input.fileAttachments;
        if (input.senderId) options.senderId = input.senderId;
      }
      options.correlationId = input.correlationId;
    }
    return new RawTraceItem(options);
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

  /** The ID of the last complete record of the active raw-trace file (read-only), or null when there is none. */
  readLastActiveRawTraceId(): string | null {
    return this.store.readLastActiveRawTraceId();
  }

  /** The archive step of an agent runtime switch (see `RunMemoryFileStore.rotateActiveRawTracesForRuntimeSwitch`). */
  rotateActiveRawTracesForRuntimeSwitch(input: {
    key: string;
    marker: RawTraceItem;
    throughTraceId: string | null;
    previousRuntimeKind: string;
  }): void {
    this.store.rotateActiveRawTracesForRuntimeSwitch({
      boundary: {
        boundaryType: "runtime_switch",
        boundaryKey: input.key,
        runtimeKind: input.previousRuntimeKind,
        sourceEvent: "runtime_switch",
      },
      marker: input.marker.toDict(),
      throughTraceId: input.throughTraceId,
    });
  }

  /** Removes what a failed switch attempt wrote after its watermark; nothing once the switch's marker is in the file. */
  removeActiveRawTracesAfter(watermarkTraceId: string | null, key: string): number {
    return this.store.removeActiveRawTracesAfter(watermarkTraceId, { unlessCorrelationId: key });
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
