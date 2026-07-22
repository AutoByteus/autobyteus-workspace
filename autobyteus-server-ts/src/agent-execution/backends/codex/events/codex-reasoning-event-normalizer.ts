import {
  CodexReasoningBlockTracker,
  type CodexReasoningLifecycleAction,
} from "./codex-reasoning-block-tracker.js";
const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

export class CodexReasoningEventNormalizer {
  private readonly blockTracker = new CodexReasoningBlockTracker();

  public resolveCompletedSnapshot(
    payload: Record<string, unknown>,
  ): CodexReasoningLifecycleAction[] {
    const snapshot = this.resolveSnapshot(payload);
    if (!snapshot) return [];

    return this.blockTracker.append({
      turnId: this.resolveTurnId(payload),
      providerItemId: this.resolveProviderItemId(payload),
      snapshot,
    });
  }

  public closeForBoundary(
    payload: Record<string, unknown>,
  ): CodexReasoningLifecycleAction[] {
    const turnId = this.resolveTurnId(payload);
    if (turnId) {
      return this.blockTracker.closeForTurn(turnId);
    }
    return this.blockTracker.closeAll();
  }

  public closeAll(): CodexReasoningLifecycleAction[] {
    return this.blockTracker.closeAll();
  }

  private resolveSnapshot(payload: Record<string, unknown>): string {
    const item = asObject(payload.item);
    return this.collectText(item.summary) ||
      this.collectText(item.content) ||
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
        asString(row.reasoning) ??
        asString(row.value);
      if (text) chunks.push(text);
    }
    return chunks.join("");
  }
}
