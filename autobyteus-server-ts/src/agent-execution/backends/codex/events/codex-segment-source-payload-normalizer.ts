import { AgentRunEventType } from "../../../domain/agent-run-event.js";

type ResolveTurnId = (payload: Record<string, unknown>) => string | null;

export const normalizeCodexSegmentSourcePayload = (
  eventType: AgentRunEventType,
  payload: Record<string, unknown>,
  resolveTurnId: ResolveTurnId,
): Record<string, unknown> | null => {
  const identity = {
    id: payload.id,
    turn_id: resolveTurnId(payload),
  };
  if (eventType === AgentRunEventType.SEGMENT_START) {
    return {
      ...identity,
      segment_type: payload.segment_type,
      ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {}),
    };
  }
  if (eventType === AgentRunEventType.SEGMENT_CONTENT) {
    return {
      ...identity,
      delta: payload.delta,
    };
  }
  if (eventType !== AgentRunEventType.SEGMENT_END) {
    return null;
  }
  return {
    ...identity,
    ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {}),
    ...(payload.interrupted !== undefined ? { interrupted: payload.interrupted } : {}),
    ...(payload.reason !== undefined ? { reason: payload.reason } : {}),
    ...(payload.failed !== undefined ? { failed: payload.failed } : {}),
    ...(payload.error !== undefined ? { error: payload.error } : {}),
  };
};
