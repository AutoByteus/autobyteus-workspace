import { serializePayload } from "../../../../services/agent-streaming/payload-serialization.js";
import type { JsonObject } from "../codex-app-server-json.js";
import { CodexThreadEventName } from "./codex-thread-event-name.js";

/** Surfaces observed in the Codex stream. */
export type CodexObservedCompactionSourceSurface =
  | "codex.thread_compacted"
  | "codex.raw_response_compaction_item"
  | "codex.context_compaction_started"
  | "codex.context_compaction_completed";

/** `abandoned` is AutoByteus closing a started compaction whose turn or run ended first. */
export type CodexCompactionSourceSurface =
  | CodexObservedCompactionSourceSurface
  | "codex.context_compaction_abandoned";

export type CodexCompactionAbandonReason =
  | "interrupted"
  | "turn_failed"
  | "turn_ended"
  | "runtime_error"
  | "app_server_closed"
  | "run_terminated";

const ABANDON_MESSAGES: Readonly<Record<CodexCompactionAbandonReason, string>> = {
  interrupted: "Compaction interrupted before it completed (turn interrupted).",
  turn_failed: "Compaction did not complete (turn failed).",
  turn_ended: "Compaction did not complete before its turn ended.",
  runtime_error: "Compaction did not complete (Codex runtime error).",
  app_server_closed: "Compaction did not complete (Codex app server closed).",
  run_terminated: "Compaction did not complete (run terminated).",
};

type OpenCompaction = Readonly<{ itemId: string; turnId: string | null; threadId: string | null }>;

export type CodexProviderCompactionProjection = Readonly<{
  codexEventName: CodexThreadEventName;
  payload: Record<string, unknown>;
}>;

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export class CodexProviderCompactionStatusProjector {
  private providerBoundarySequence = 0;
  private readonly emittedBoundaryKeys: string[] = [];
  private readonly emittedBoundaryWindowKeys: string[] = [];
  private readonly emittedNoStableIdBoundaryWindowKeys: string[] = [];
  /** Started compactions (by stable item id) not yet completed. */
  private readonly open = new Map<string, OpenCompaction>();

  project(
    sourceSurface: CodexObservedCompactionSourceSurface,
    payload: JsonObject,
    status: "compacting" | "compacted",
    rotationEligible: boolean,
  ): CodexProviderCompactionProjection | null {
    const boundary = this.buildPayload(sourceSurface, payload, status, rotationEligible);
    const boundaryKey = asString(boundary.boundary_key);
    const stableId = asString(boundary.provider_event_id);
    if (stableId && rotationEligible) this.open.delete(stableId);
    if (!boundaryKey || (rotationEligible && this.hasEmittedBoundary(boundaryKey, boundary))) {
      return null;
    }
    if (rotationEligible) this.rememberBoundary(boundaryKey, boundary);
    else if (stableId) this.open.set(stableId, { itemId: stableId,
      turnId: asString(boundary.turn_id), threadId: asString(boundary.provider_thread_id) });
    return Object.freeze({
      codexEventName: this.resolveEventName(sourceSurface),
      payload: boundary,
    });
  }

  /** Closes the started compactions of a turn that ended before their item completed. */
  closeOpenForTurn(turnId: string, reason: CodexCompactionAbandonReason): Record<string, unknown>[] {
    return this.close([...this.open.values()].filter((entry) => entry.turnId === turnId), reason);
  }

  /** Closes every started compaction when the runtime or run ends. */
  closeAllOpen(reason: CodexCompactionAbandonReason): Record<string, unknown>[] {
    return this.close([...this.open.values()], reason);
  }

  private close(entries: OpenCompaction[], reason: CodexCompactionAbandonReason): Record<string, unknown>[] {
    return entries.map((entry) => {
      this.open.delete(entry.itemId);
      return {
        kind: "provider_compaction_boundary",
        runtime_kind: "CODEX",
        provider: "codex",
        source_surface: "codex.context_compaction_abandoned",
        boundary_key: ["codex", entry.threadId ?? "thread", entry.itemId, "failed"].join(":"),
        provider_thread_id: entry.threadId,
        provider_event_id: entry.itemId,
        provider_timestamp: null,
        turn_id: entry.turnId,
        status: "failed",
        rotation_eligible: false,
        semantic_compaction: false,
        error_message: ABANDON_MESSAGES[reason],
      };
    });
  }

  private buildPayload(
    sourceSurface: CodexObservedCompactionSourceSurface,
    payload: JsonObject,
    status: "compacting" | "compacted",
    rotationEligible: boolean,
  ): Record<string, unknown> {
    this.providerBoundarySequence += 1;
    const item = asObject(payload.item);
    const stableId =
      asString(payload.compaction_id) ??
      asString(payload.compactionId) ??
      asString(payload.event_id) ??
      asString(payload.eventId) ??
      asString(payload.id) ??
      asString(item?.id) ??
      asString(item?.compaction_id) ??
      asString(item?.response_id);
    const threadId =
      asString(payload.thread_id) ??
      asString(payload.threadId) ??
      asString(item?.thread_id) ??
      asString(item?.threadId);
    const responseId =
      asString(payload.response_id) ??
      asString(payload.responseId) ??
      asString(item?.response_id) ??
      asString(item?.responseId);
    const turnId =
      asString(payload.turn_id) ??
      asString(payload.turnId) ??
      asString(item?.turn_id) ??
      asString(item?.turnId);
    const boundaryKeyParts = stableId
      ? ["codex", threadId ?? "thread", stableId, ...(rotationEligible ? [] : [status])]
      : [
          "codex",
          threadId ?? "thread",
          sourceSurface,
          turnId ?? "turn",
          String(this.providerBoundarySequence),
        ];
    return {
      kind: "provider_compaction_boundary",
      runtime_kind: "CODEX",
      provider: "codex",
      source_surface: sourceSurface,
      boundary_key: boundaryKeyParts.join(":"),
      provider_thread_id: threadId,
      provider_event_id: stableId,
      provider_response_id: responseId,
      provider_timestamp: asNumber(payload.ts) ?? asNumber(payload.timestamp) ?? null,
      turn_id: turnId,
      trigger: asString(payload.trigger) ?? asString(item?.trigger) ?? "auto",
      status,
      pre_tokens: asNumber(payload.pre_tokens) ?? asNumber(item?.pre_tokens) ?? null,
      rotation_eligible: rotationEligible,
      semantic_compaction: false,
      raw: serializePayload(payload),
    };
  }

  private resolveEventName(sourceSurface: CodexObservedCompactionSourceSurface): CodexThreadEventName {
    switch (sourceSurface) {
      case "codex.thread_compacted":
        return CodexThreadEventName.THREAD_COMPACTED;
      case "codex.context_compaction_started":
        return CodexThreadEventName.ITEM_STARTED;
      case "codex.context_compaction_completed":
        return CodexThreadEventName.ITEM_COMPLETED;
      case "codex.raw_response_compaction_item":
        return CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED;
    }
  }

  private hasEmittedBoundary(
    boundaryKey: string,
    boundary: Record<string, unknown>,
  ): boolean {
    if (this.emittedBoundaryKeys.includes(boundaryKey)) return true;
    const stableId = asString(boundary.provider_event_id);
    const windowKey = this.buildBoundaryWindowKey(boundary);
    return (!stableId && this.emittedBoundaryWindowKeys.includes(windowKey)) ||
      Boolean(stableId && this.emittedNoStableIdBoundaryWindowKeys.includes(windowKey));
  }

  private rememberBoundary(boundaryKey: string, boundary: Record<string, unknown>): void {
    this.remember(this.emittedBoundaryKeys, boundaryKey);
    const windowKey = this.buildBoundaryWindowKey(boundary);
    this.remember(this.emittedBoundaryWindowKeys, windowKey);
    if (!asString(boundary.provider_event_id)) {
      this.remember(this.emittedNoStableIdBoundaryWindowKeys, windowKey);
    }
  }

  private buildBoundaryWindowKey(boundary: Record<string, unknown>): string {
    return [
      "codex",
      asString(boundary.provider_thread_id) ?? "thread",
      asString(boundary.turn_id) ?? asString(boundary.provider_response_id) ?? "turn",
    ].join(":");
  }

  private remember(target: string[], key: string): void {
    target.push(key);
    if (target.length > 100) target.shift();
  }
}
