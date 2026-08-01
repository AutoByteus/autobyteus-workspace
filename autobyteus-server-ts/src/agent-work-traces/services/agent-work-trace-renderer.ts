import type { HistoricalReplayEvent, HistoricalReplayToolEvent } from "../../run-history/projection/historical-replay-event-types.js";
import { buildHistoricalReplayEvents, type HistoricalReplayBuildOptions } from "../../run-history/projection/transformers/raw-trace-to-historical-replay-events.js";
import type { AgentWorkTraceSource } from "../domain/work-traces.js";
import { CondensedToolCallRenderer } from "autobyteus-ts/memory/presentation/condensed-tool-call-renderer.js";
import { ReadableValueRenderer } from "autobyteus-ts/memory/presentation/readable-value-renderer.js";

export type AgentWorkTraceToolProjection = Required<Pick<
  HistoricalReplayBuildOptions,
  "interactionByIdentity" | "traceById" | "includedToolIdentityKeys"
>>;

const toIso = (ts: number | null): string => {
  if (typeof ts === "number" && Number.isFinite(ts) && ts > 0) {
    const ms = ts > 10_000_000_000 ? ts : ts * 1000;
    return new Date(ms).toISOString();
  }
  return new Date(0).toISOString();
};

export class AgentWorkTraceRenderer {
  constructor(
    private readonly valueRenderer = new ReadableValueRenderer(),
    private readonly toolRenderer = new CondensedToolCallRenderer(valueRenderer),
  ) {}

  renderSource(
    source: AgentWorkTraceSource,
    toolProjection?: AgentWorkTraceToolProjection,
  ): string {
    const events = buildHistoricalReplayEvents(source.records, toolProjection);
    const lines: string[] = [];
    lines.push("# Work Trace");
    lines.push("");

    for (const event of events) {
      const rendered = this.renderEvent(event);
      if (rendered) {
        lines.push(rendered);
        lines.push("");
      }
    }

    return `${lines.join("\n").trimEnd()}\n`;
  }

  private renderEvent(event: HistoricalReplayEvent): string | null {
    if (event.kind === "message") {
      const role = event.role === "user" ? "user" : "assistant";
      const content = this.clean(event.content ?? "");
      return content ? `[${toIso(event.ts)}] ${role}:\n${content}` : null;
    }
    if (event.kind === "reasoning") {
      return null;
    }
    if (event.kind === "tool") {
      return this.renderTool(event);
    }
    if (event.kind === "compaction") {
      const message = this.clean(event.message);
      return message ? `[${toIso(event.ts)}] trace_event:\n${message}` : null;
    }
    return null;
  }

  private renderTool(event: HistoricalReplayToolEvent): string {
    const outcome = event.toolError !== null || event.status === "error"
      ? { kind: "error" as const, value: event.toolError ?? event.content ?? "not available" }
      : event.toolResult !== null && event.toolResult !== undefined || event.status === "success"
        ? { kind: "result" as const, value: event.toolResult }
        : { kind: "no_outcome" as const, status: event.status };
    return [
      `[${toIso(event.ts)}] tool:`,
      this.toolRenderer.render({
        name: event.toolName,
        arguments: event.toolArgs ?? {},
        outcome,
      }, { maxValueChars: 20_000 }),
    ].join("\n");
  }

  private clean(value: string): string {
    return this.valueRenderer.render(value, { maxChars: 20_000 }).trim();
  }
}
