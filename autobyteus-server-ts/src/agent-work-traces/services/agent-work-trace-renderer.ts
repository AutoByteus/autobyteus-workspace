import type { HistoricalReplayEvent, HistoricalReplayToolEvent } from "../../run-history/projection/historical-replay-event-types.js";
import { buildHistoricalReplayEvents } from "../../run-history/projection/transformers/raw-trace-to-historical-replay-events.js";
import type { AgentWorkTraceRenderContext, AgentWorkTraceSource } from "../domain/work-traces.js";
import { AgentWorkTraceRedactor } from "./agent-work-trace-redactor.js";

const toIso = (ts: number | null): string => {
  if (typeof ts === "number" && Number.isFinite(ts) && ts > 0) {
    const ms = ts > 10_000_000_000 ? ts : ts * 1000;
    return new Date(ms).toISOString();
  }
  return new Date(0).toISOString();
};

const stringifyVisible = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export class AgentWorkTraceRenderer {
  constructor(private readonly deps: { redactor?: AgentWorkTraceRedactor } = {}) {}

  renderSource(source: AgentWorkTraceSource, renderContext: AgentWorkTraceRenderContext): string {
    const events = buildHistoricalReplayEvents(source.records);
    const lines: string[] = [];
    lines.push(`# Agent Work Trace: ${source.displayName}`);
    lines.push("");
    lines.push(`Source: ${source.kind}`);
    lines.push(`Records: ${source.recordCount}`);
    lines.push(`First timestamp: ${source.firstTimestamp ? toIso(source.firstTimestamp) : "n/a"}`);
    lines.push(`Last timestamp: ${source.lastTimestamp ? toIso(source.lastTimestamp) : "n/a"}`);
    lines.push("");

    for (const event of events) {
      const rendered = this.renderEvent(event, renderContext);
      if (rendered) {
        lines.push(rendered);
        lines.push("");
      }
    }

    return `${lines.join("\n").trim()}\n`;
  }

  private renderEvent(
    event: HistoricalReplayEvent,
    renderContext: AgentWorkTraceRenderContext,
  ): string | null {
    if (event.kind === "message") {
      const role = event.role === "user" ? "user" : renderContext.subjectLabel;
      const content = this.clean(event.content ?? "");
      return content ? `[${toIso(event.ts)}] ${role}:\n${content}` : null;
    }
    if (event.kind === "reasoning") {
      const content = this.clean(event.content ?? "");
      return content ? `[${toIso(event.ts)}] ${renderContext.subjectLabel} reasoning:\n${content}` : null;
    }
    if (event.kind === "tool") {
      return this.renderTool(event, renderContext);
    }
    if (event.kind === "compaction") {
      return `[${toIso(event.ts)}] ${renderContext.subjectLabel}:\n${this.clean(event.message)}`;
    }
    return null;
  }

  private renderTool(
    event: HistoricalReplayToolEvent,
    renderContext: AgentWorkTraceRenderContext,
  ): string {
    const lines: string[] = [];
    lines.push(`[${toIso(event.ts)}] ${renderContext.subjectLabel} tool call:`);
    lines.push(`tool: ${this.clean(event.toolName)}`);
    lines.push(`status: ${event.status}`);
    if (event.toolArgs && Object.keys(event.toolArgs).length > 0) {
      lines.push("arguments:");
      lines.push(this.indent(this.clean(stringifyVisible(event.toolArgs))));
    }
    if (event.toolError) {
      lines.push("error:");
      lines.push(this.indent(this.clean(event.toolError)));
    } else if (event.toolResult !== null && event.toolResult !== undefined) {
      lines.push("result:");
      lines.push(this.indent(this.clean(stringifyVisible(event.toolResult))));
    } else if (event.content) {
      lines.push("result:");
      lines.push(this.indent(this.clean(event.content)));
    }
    return lines.join("\n");
  }

  private indent(value: string): string {
    return value.split("\n").map((line) => `  ${line}`).join("\n");
  }

  private clean(value: string): string {
    return this.redactor.redact(value).trim();
  }

  private get redactor(): AgentWorkTraceRedactor {
    return this.deps.redactor ?? new AgentWorkTraceRedactor();
  }
}
