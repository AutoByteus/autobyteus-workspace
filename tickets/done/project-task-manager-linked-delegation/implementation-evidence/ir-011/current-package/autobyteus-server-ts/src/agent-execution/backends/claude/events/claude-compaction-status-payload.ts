import { asString } from "../claude-runtime-shared.js";

export type ClaudeCompactionSourceSurface =
  | "claude.status_compacting"
  | "claude.compact_boundary"
  | "claude.compaction_failed";

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const STATUS_BY_SURFACE: Record<ClaudeCompactionSourceSurface, "compacting" | "compacted" | "failed"> = {
  "claude.status_compacting": "compacting",
  "claude.compact_boundary": "compacted",
  "claude.compaction_failed": "failed",
};

/**
 * Maps one tracked Claude compaction session event to the runtime-neutral
 * COMPACTION_STATUS payload. Every event of one operation shares `provider_event_id`
 * (the operation id); only the boundary is rotation eligible, keyed by its own frame uuid.
 */
export const buildClaudeCompactionStatusPayload = (
  params: Record<string, unknown>,
  sourceSurface: ClaudeCompactionSourceSurface,
): Record<string, unknown> => {
  const sessionId = asString(params.sessionId);
  const turnId = asString(params.turnId);
  const operationId = asString(params.operationId);
  const isBoundary = sourceSurface === "claude.compact_boundary";
  const boundaryIdentity = isBoundary ? asString(params.frameUuid) ?? operationId : operationId;
  const boundaryKey = [
    "claude",
    sessionId ?? "session",
    sourceSurface,
    boundaryIdentity ?? "event",
    turnId ?? "turn",
  ].join(":");
  return {
    kind: "provider_compaction_boundary",
    runtime_kind: "CLAUDE",
    provider: "claude",
    source_surface: sourceSurface,
    boundary_key: boundaryKey,
    provider_session_id: sessionId,
    provider_event_id: operationId,
    provider_timestamp: null,
    turn_id: turnId,
    status: STATUS_BY_SURFACE[sourceSurface],
    rotation_eligible: isBoundary,
    semantic_compaction: false,
    ...(isBoundary
      ? {
          trigger: asString(params.trigger),
          pre_tokens: asNumber(params.pre_tokens),
          post_tokens: asNumber(params.post_tokens),
          duration_ms: asNumber(params.duration_ms),
        }
      : {}),
    ...(sourceSurface === "claude.compaction_failed"
      ? { error_message: asString(params.error_message) }
      : {}),
  };
};
