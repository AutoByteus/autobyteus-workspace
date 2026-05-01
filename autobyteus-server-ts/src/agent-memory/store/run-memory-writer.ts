import path from "node:path";
import { randomUUID } from "node:crypto";
import { Message, MessageRole } from "autobyteus-ts/llm/utils/messages.js";
import { RawTraceItem } from "autobyteus-ts/memory/models/raw-trace-item.js";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import { WorkingContextSnapshot } from "autobyteus-ts/memory/working-context-snapshot.js";
import type {
  RuntimeMemorySnapshotUpdate,
  RuntimeMemoryTraceInput,
  RuntimeMemoryWriteOperation,
} from "../domain/memory-recording-models.js";

const toTimestampSeconds = (value?: number | null): number => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value > 10_000_000_000 ? value / 1000 : value;
  }
  return Date.now() / 1000;
};

export class RunMemoryWriter {
  private readonly agentId: string;
  private readonly store: RunMemoryFileStore;
  private readonly workingContextSnapshot: WorkingContextSnapshot;
  private readonly seqByTurn = new Map<string, number>();

  constructor(input: { memoryDir: string; agentId?: string | null }) {
    const memoryDir = input.memoryDir.trim();
    if (!memoryDir) {
      throw new Error("memoryDir is required.");
    }
    this.agentId = input.agentId?.trim() || path.basename(memoryDir);
    this.store = new RunMemoryFileStore(memoryDir);
    this.workingContextSnapshot = this.loadWorkingContextSnapshot();
    this.initializeSequences();
  }

  write(operation: RuntimeMemoryWriteOperation): RawTraceItem {
    const trace = this.appendRawTrace(operation.trace);
    if (operation.snapshotUpdate) {
      this.applySnapshotUpdate(operation.snapshotUpdate);
      this.persistWorkingContextSnapshot();
    }
    return trace;
  }

  appendRawTrace(input: RuntimeMemoryTraceInput): RawTraceItem {
    const trace = new RawTraceItem({
      id: `rt_${Date.now()}_${randomUUID()}`,
      ts: toTimestampSeconds(input.ts),
      turnId: input.turnId,
      seq: this.nextSeq(input.turnId),
      traceType: input.traceType,
      content: input.content ?? "",
      sourceEvent: input.sourceEvent,
      media: input.media ?? null,
      toolName: input.toolName ?? null,
      toolCallId: input.toolCallId ?? null,
      toolArgs: input.toolArgs ?? null,
      toolResult: input.toolResult,
      toolError: input.toolError ?? null,
      correlationId: input.correlationId ?? null,
    });
    this.store.appendRawTrace(trace);
    return trace;
  }

  writeSnapshotUpdate(update: RuntimeMemorySnapshotUpdate): void {
    this.applySnapshotUpdate(update);
    this.persistWorkingContextSnapshot();
  }

  writeWorkingContextSnapshot(): void {
    this.persistWorkingContextSnapshot();
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
    for (const trace of this.store.listRawTracesOrdered()) {
      this.rememberSeq(trace.turnId, trace.seq);
    }
    for (const trace of this.store.listArchiveRawTracesOrdered()) {
      this.rememberSeq(trace.turnId, trace.seq);
    }
  }

  private rememberSeq(turnId: string, seq: number): void {
    const current = this.seqByTurn.get(turnId) ?? 0;
    if (seq > current) {
      this.seqByTurn.set(turnId, seq);
    }
  }

  private loadWorkingContextSnapshot(): WorkingContextSnapshot {
    try {
      return this.store.readWorkingContextSnapshotState()?.snapshot ?? new WorkingContextSnapshot();
    } catch {
      return new WorkingContextSnapshot();
    }
  }

  private applySnapshotUpdate(update: RuntimeMemorySnapshotUpdate): void {
    if (update.kind === "user") {
      this.workingContextSnapshot.appendMessage(
        new Message(MessageRole.USER, {
          content: update.content,
          image_urls: update.media?.images ?? [],
          audio_urls: update.media?.audio ?? [],
          video_urls: update.media?.video ?? [],
        }),
      );
      return;
    }
    if (update.kind === "assistant") {
      this.workingContextSnapshot.appendAssistant(update.content, update.reasoning ?? null);
      return;
    }
    if (update.kind === "tool_call") {
      this.workingContextSnapshot.appendToolCalls([
        {
          id: update.toolCallId,
          name: update.toolName,
          arguments: update.toolArgs,
        },
      ]);
      return;
    }
    this.workingContextSnapshot.appendToolResult(
      update.toolCallId,
      update.toolName,
      update.toolResult,
      update.toolError ?? null,
    );
  }

  private persistWorkingContextSnapshot(): void {
    this.store.writeWorkingContextSnapshotState(this.workingContextSnapshot, {
      agentId: this.agentId,
    });
  }
}
