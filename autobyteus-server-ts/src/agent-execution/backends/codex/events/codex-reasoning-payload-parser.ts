import { CodexReasoningSegmentTracker } from "./codex-reasoning-segment-tracker.js";

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

export class CodexReasoningPayloadParser {
  private readonly reasoningSegmentTracker = new CodexReasoningSegmentTracker();

  public resolveReasoningSnapshot(payload: Record<string, unknown>): string {
    const item = asObject(payload.item);
    const fromSummary = this.collectText(item.summary);
    const fromContent = this.collectText(item.content);
    return (
      fromSummary ||
      fromContent ||
      asString(payload.summary_part) ||
      asString(payload.summary) ||
      asString(item.text) ||
      ""
    );
  }

  public resolveReasoningSegmentId(payload: Record<string, unknown>): string {
    return this.reasoningSegmentTracker.resolveReasoningSegmentId(payload);
  }

  public clearReasoningSegmentForTurn(payload: Record<string, unknown>): void {
    this.reasoningSegmentTracker.clearReasoningSegmentForTurn(payload);
  }

  public resolveReasoningDelta(payload: Record<string, unknown>, fallbackDelta: string): string {
    return fallbackDelta || this.resolveReasoningSnapshot(payload);
  }

  private collectText(value: unknown): string {
    if (typeof value === "string") {
      return value;
    }
    if (!Array.isArray(value)) {
      return "";
    }

    const chunks: string[] = [];
    for (const entry of value) {
      if (typeof entry === "string") {
        chunks.push(entry);
        continue;
      }

      const row = asObject(entry);
      const text =
        asString(row.text) ??
        asString(row.content) ??
        asString(row.summary) ??
        asString(row.delta) ??
        asString(row.reasoning) ??
        asString(row.value) ??
        null;
      if (text) {
        chunks.push(text);
      }
    }

    return chunks.join("");
  }
}
