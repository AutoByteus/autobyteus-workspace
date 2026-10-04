/**
 * Maps one AGY `checkpoint` DONE step (one automatic compaction) to the runtime-neutral
 * COMPACTION_STATUS payload. AGY reports only completion, so the single event is the completed,
 * rotation-eligible boundary; conversation + step index is its stable identity.
 */
export const buildAgyCompactionStatusPayload = (input: {
  conversationId: string;
  turnId: string;
  stepIndex: number;
  durationSeconds: number | null;
}): Record<string, unknown> => ({
  kind: "provider_compaction_boundary",
  runtime_kind: "ANTIGRAVITY",
  provider: "antigravity",
  source_surface: "antigravity.checkpoint",
  boundary_key: `agy:${input.conversationId}:checkpoint:${input.stepIndex}`,
  provider_session_id: input.conversationId,
  provider_event_id: `checkpoint:${input.stepIndex}`,
  provider_timestamp: null,
  turn_id: input.turnId,
  status: "compacted",
  trigger: "auto",
  rotation_eligible: true,
  semantic_compaction: false,
  duration_ms: input.durationSeconds === null ? null : Math.round(input.durationSeconds * 1000),
});
