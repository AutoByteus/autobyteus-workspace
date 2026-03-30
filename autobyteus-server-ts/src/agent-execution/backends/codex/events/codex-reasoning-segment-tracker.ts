import { debugCodexThreadEvent } from "./codex-thread-event-debug.js";

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

export class CodexReasoningSegmentTracker {
  private readonly reasoningSegmentIdByTurnId = new Map<string, string>();
  private readonly maxReasoningTurnCacheSize = 128;

  public resolveReasoningSegmentId(payload: Record<string, unknown>): string {
    const eventId = asString(payload.id);
    const turnId = this.resolveTurnId(payload);
    const stableItemId = this.resolveStableReasoningItemId(payload);

    if (stableItemId) {
      if (turnId) {
        this.rememberReasoningSegmentId(turnId, stableItemId);
      }
      this.logReasoningSegmentResolution("stable-item-id", payload, stableItemId, eventId, turnId);
      return stableItemId;
    }

    if (turnId) {
      const existing = this.reasoningSegmentIdByTurnId.get(turnId);
      if (existing) {
        this.logReasoningSegmentResolution("turn-cache-hit", payload, existing, eventId, turnId);
        return existing;
      }
      const nextSegmentId = eventId ?? `reasoning:${turnId}`;
      this.rememberReasoningSegmentId(turnId, nextSegmentId);
      this.logReasoningSegmentResolution(
        "turn-cache-miss",
        payload,
        nextSegmentId,
        eventId,
        turnId,
      );
      return nextSegmentId;
    }

    const fallbackId = eventId ?? this.resolveSegmentId(payload, "reasoning-segment");
    this.logReasoningSegmentResolution("fallback", payload, fallbackId, eventId, turnId);
    return fallbackId;
  }

  public clearReasoningSegmentForTurn(payload: Record<string, unknown>): void {
    const turnId = this.resolveTurnId(payload);
    if (turnId) {
      this.reasoningSegmentIdByTurnId.delete(turnId);
      debugCodexThreadEvent("Cleared reasoning turn cache", {
        turnId,
        cacheSize: this.reasoningSegmentIdByTurnId.size,
      });
    }
  }

  private resolveSegmentId(payload: Record<string, unknown>, fallback = "runtime-segment"): string {
    const item = asObject(payload.item);
    const candidate =
      payload.segment_id ??
      payload.item_id ??
      payload.itemId ??
      item.id ??
      payload.id;
    return typeof candidate === "string" && candidate.length > 0 ? candidate : fallback;
  }

  private resolveTurnId(payload: Record<string, unknown>): string | null {
    const turn = asObject(payload.turn);
    return asString(payload.turnId) ?? asString(payload.turn_id) ?? asString(turn.id);
  }

  private resolveStableReasoningItemId(payload: Record<string, unknown>): string | null {
    const item = asObject(payload.item);
    const candidate = payload.segment_id ?? payload.item_id ?? payload.itemId ?? item.id;
    return asString(candidate);
  }

  private rememberReasoningSegmentId(turnId: string, segmentId: string): void {
    this.reasoningSegmentIdByTurnId.set(turnId, segmentId);
    while (this.reasoningSegmentIdByTurnId.size > this.maxReasoningTurnCacheSize) {
      const oldest = this.reasoningSegmentIdByTurnId.keys().next().value;
      if (!oldest) {
        break;
      }
      this.reasoningSegmentIdByTurnId.delete(oldest);
    }
  }

  private logReasoningSegmentResolution(
    strategy: "stable-item-id" | "turn-cache-hit" | "turn-cache-miss" | "fallback",
    payload: Record<string, unknown>,
    resolvedSegmentId: string,
    eventId: string | null,
    turnId: string | null,
  ): void {
    const item = asObject(payload.item);
    const itemId = asString(item.id) ?? asString(payload.item_id) ?? asString(payload.itemId);
    debugCodexThreadEvent("Resolved reasoning segment id", {
      strategy,
      resolvedSegmentId,
      eventId,
      itemId,
      turnId,
      eventName: asString(payload.event_name) ?? asString(payload.method),
      summaryPartLength: asString(payload.summary_part)?.length ?? 0,
      deltaLength: asString(payload.delta)?.length ?? 0,
      cacheSize: this.reasoningSegmentIdByTurnId.size,
    });
  }
}
