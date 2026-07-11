import type { HistoricalReplayEvent, HistoricalReplayToolEvent } from "../../run-history/projection/historical-replay-event-types.js";
import { buildHistoricalReplayEvents, type HistoricalReplayBuildOptions } from "../../run-history/projection/transformers/raw-trace-to-historical-replay-events.js";
import type { AgentWorkTraceSource } from "../domain/work-traces.js";
import { AgentWorkTraceRedactor } from "./agent-work-trace-redactor.js";

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
    const lines: string[] = [];
    lines.push(`[${toIso(event.ts)}] tool:`);
    lines.push(`name: ${this.clean(event.toolName)}`);
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
