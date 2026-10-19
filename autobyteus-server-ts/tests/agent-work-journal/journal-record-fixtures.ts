import type { MemoryTraceEvent, MemoryTurnTraceEvent } from "../../src/agent-memory/domain/models.js";
import type { RuntimeKind } from "../../src/runtime-management/runtime-kind-enum.js";
import { WorkJournalFileRenderer } from "../../src/agent-work-journal/rendering/work-journal-file-renderer.js";
import type { WorkJournalLimits } from "../../src/agent-work-journal/rendering/output-shortener.js";

/**
 * Hand-built normalized raw-trace records, shaped after the recorded argument and result shapes
 * in the ticket's probes/validate-contract.json (TESTING.md: never copy real user records).
 */
export const BASE_TS = 1790056800; // 2026-09-22 06:00:00 UTC

export class RecordBuilder {
  private counter = 0;

  constructor(private readonly turnId = "turn_0001") {}

  private next(): { id: string; seq: number; ts: number } {
    this.counter += 1;
    return { id: `rt_${String(this.counter).padStart(3, "0")}`, seq: this.counter, ts: BASE_TS + this.counter };
  }

  record(traceType: string, fields: Partial<MemoryTurnTraceEvent> = {}): MemoryTurnTraceEvent {
    const { id, seq, ts } = this.next();
    return { scope: "turn", id, traceType, turnId: this.turnId, seq, ts, ...fields };
  }

  user(content: string, fields: Partial<MemoryTurnTraceEvent> = {}): MemoryTurnTraceEvent {
    return this.record("user", { content, ...fields });
  }

  agent(content: string): MemoryTurnTraceEvent {
    return this.record("assistant", { content });
  }

  call(toolName: string, toolArgs: Record<string, unknown>, toolCallId = `call_${this.counter + 1}`): MemoryTurnTraceEvent {
    return this.record("tool_call", { toolName, toolCallId, toolArgs });
  }

  result(call: MemoryTurnTraceEvent, toolResult: unknown, toolError: string | null = null): MemoryTurnTraceEvent {
    return this.record("tool_result", { toolName: call.toolName, toolCallId: call.toolCallId, toolResult, toolError });
  }

  /** A call followed by its result. */
  tool(toolName: string, toolArgs: Record<string, unknown>, toolResult: unknown, toolError: string | null = null): MemoryTurnTraceEvent[] {
    const call = this.call(toolName, toolArgs);
    return [call, this.result(call, toolResult, toolError)];
  }
}

export const render = (
  runtimeKind: RuntimeKind | null,
  records: readonly MemoryTraceEvent[],
  options: { fileName?: string; state?: "open" | "closed"; index?: number | null; limits?: WorkJournalLimits } = {},
) => new WorkJournalFileRenderer(options.limits).render({
  runId: "run_test_1",
  runtimeKind,
  source: {
    fileName: options.fileName ?? "raw_traces_active.jsonl",
    state: options.state ?? "open",
    index: options.index ?? null,
  },
  records,
});

/** The journal's entry lines (header removed). */
export const entryLines = (markdown: string): string[] => markdown.split("\n").slice(4).filter((line) => line.length > 0);

/** Entry lines without the `[HH:MM:SS] ` time column and without links, for cross-runtime comparison. */
export const comparableLines = (markdown: string): string[] => entryLines(markdown).map((line) => line
  .replace(/^\[\d\d:\d\d:\d\d\] /, "")
  .replace(/ \[↗\]\([^)]*\)$/, "")
  .replace(/\[raw#[^\]]*\]\([^)]*\)/g, "raw#…"));
