import type {
  AcpCompactionPhase,
  AcpCompactionStatusInput,
  AcpExtEffect,
} from "../acp/acp-agent-session-profile.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const asText = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

/** Grok `_x.ai/session_notification` compaction updates (Grok 1.0.46). */
const GROK_COMPACTION_PHASES: Readonly<Record<string, AcpCompactionPhase>> = {
  auto_compact_started: "started",
  auto_compact_completed: "completed",
  auto_compact_failed: "failed",
  auto_compact_cancelled: "cancelled",
};

const SOURCE_SURFACES: Readonly<Record<AcpCompactionStatusInput["phase"], string>> = {
  started: "grok.auto_compact_started",
  completed: "grok.auto_compact_completed",
  failed: "grok.auto_compact_failed",
  cancelled: "grok.auto_compact_cancelled",
  abandoned: "grok.compaction_abandoned",
};

/**
 * Maps a Grok compaction update to a compaction effect. Automatic compaction reports
 * `auto_compact_started` then `auto_compact_completed`; a manual `/compact` reports only the
 * completion. The only id is each notification's own `_meta.eventId`.
 */
export const interpretGrokCompactionUpdate = (
  update: Record<string, unknown>,
  params: Record<string, unknown>,
): AcpExtEffect | null => {
  const phase = typeof update.sessionUpdate === "string" ? GROK_COMPACTION_PHASES[update.sessionUpdate] : undefined;
  if (!phase) return null;
  const meta = isRecord(params._meta) ? params._meta : null;
  return { kind: "compaction", phase, eventId: asText(meta?.eventId), details: update };
};

/** COMPACTION_STATUS payload for Grok Build: only the completion rotates raw traces. */
export const buildGrokBuildCompactionStatusPayload = (input: AcpCompactionStatusInput): Record<string, unknown> => {
  const base = {
    kind: "provider_compaction_boundary",
    runtime_kind: "GROK_BUILD",
    provider: "grok",
    source_surface: SOURCE_SURFACES[input.phase],
    provider_session_id: input.sessionId,
    provider_event_id: input.operationId,
    provider_timestamp: null,
    turn_id: input.turnId,
    semantic_compaction: false,
  };
  const key = (kind: string, id: string) => ["grok", input.sessionId, kind, id].join(":");
  const { details } = input;
  if (input.phase === "started") {
    return {
      ...base,
      boundary_key: key("started", input.eventId ?? input.operationId),
      status: "compacting",
      rotation_eligible: false,
      trigger: "auto",
      ...(asNumber(details.tokens_used) !== null ? { tokens_used: asNumber(details.tokens_used) } : {}),
      ...(asNumber(details.context_window) !== null ? { context_window: asNumber(details.context_window) } : {}),
      ...(asNumber(details.percentage) !== null ? { percentage: asNumber(details.percentage) } : {}),
    };
  }
  if (input.phase === "completed") {
    return {
      ...base,
      boundary_key: key("completed", input.eventId ?? input.operationId),
      status: "compacted",
      rotation_eligible: true,
      trigger: input.trigger,
      pre_tokens: asNumber(details.tokens_before),
      post_tokens: asNumber(details.tokens_after),
      duration_ms: asNumber(details.elapsed_ms),
    };
  }
  const reported = asText(details.error) ?? asText(details.message) ?? asText(details.reason);
  return {
    ...base,
    boundary_key: key("failed", input.operationId),
    status: "failed",
    rotation_eligible: false,
    trigger: input.trigger,
    error_message: input.reason ?? reported ?? (input.phase === "cancelled"
      ? "Grok cancelled the compaction."
      : "Grok reported that the compaction failed."),
  };
};
