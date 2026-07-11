import {
  CodexReasoningBlockTracker,
  type CodexReasoningBlockUpdate,
} from "./codex-reasoning-block-tracker.js";
import { CodexThreadEventName } from "./codex-thread-event-name.js";

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

export class CodexReasoningEventNormalizer {
  private readonly blockTracker = new CodexReasoningBlockTracker();

  public resolveContentUpdate(
    codexEventName: string,
    payload: Record<string, unknown>,
    fallbackDelta = "",
  ): CodexReasoningBlockUpdate | null {
    const fragmentKind = this.isDeltaEvent(codexEventName) ? "delta" : "completed_item";
    const delta = fragmentKind === "delta"
      ? fallbackDelta || this.resolveDelta(payload)
      : this.resolveSnapshot(payload);
    if (!delta) return null;

    return this.blockTracker.append({
      turnId: this.resolveTurnId(payload),
      providerItemId: this.resolveProviderItemId(payload),
      fragmentKind,
      delta,
    });
  }

  public clearForBoundary(payload: Record<string, unknown>): void {
    const turnId = this.resolveTurnId(payload);
    if (turnId) {
      this.blockTracker.clearForTurn(turnId);
      return;
    }
    this.blockTracker.clearAll();
  }

  public clearAll(): void {
    this.blockTracker.clearAll();
  }

  private isDeltaEvent(codexEventName: string): boolean {
    return codexEventName === CodexThreadEventName.ITEM_REASONING_DELTA ||
      codexEventName === CodexThreadEventName.ITEM_REASONING_SUMMARY_PART_ADDED;
  }

  private resolveDelta(payload: Record<string, unknown>): string {
    const item = asObject(payload.item);
    return asString(payload.delta) ??
      asString(payload.content) ??
      asString(payload.summary_part) ??
      asString(item.content) ??
      this.resolveSnapshot(payload);
  }

  private resolveSnapshot(payload: Record<string, unknown>): string {
    const item = asObject(payload.item);
    return this.collectText(item.summary) ||
      this.collectText(item.content) ||
      asString(payload.summary_part) ||
      asString(payload.summary) ||
      asString(item.text) ||
      "";
  }

  private resolveTurnId(payload: Record<string, unknown>): string | null {
    const item = asObject(payload.item);
    const turn = asObject(payload.turn);
    return asString(payload.turn_id) ??
      asString(payload.turnId) ??
      asString(item.turn_id) ??
      asString(item.turnId) ??
      asString(turn.id);
  }

  private resolveProviderItemId(payload: Record<string, unknown>): string | null {
    const item = asObject(payload.item);
    return asString(payload.segment_id) ??
      asString(payload.item_id) ??
      asString(payload.itemId) ??
      asString(item.id);
  }

  private collectText(value: unknown): string {
    if (typeof value === "string") return value;
    if (!Array.isArray(value)) return "";

    const chunks: string[] = [];
    for (const entry of value) {
      if (typeof entry === "string") {
        chunks.push(entry);
        continue;
      }
      const row = asObject(entry);
      const text = asString(row.text) ??
        asString(row.content) ??
        asString(row.summary) ??
        asString(row.delta) ??
        asString(row.reasoning) ??
        asString(row.value);
      if (text) chunks.push(text);
    }
    return chunks.join("");
  }
}
