import { AgentRunEventType } from "../../../domain/agent-run-event.js";
import {
  isAgentSegmentJsonValue,
  isAgentSegmentType,
} from "../../../domain/agent-segment.js";

type ResolveTurnId = (payload: Record<string, unknown>) => string | null;

export class CodexSegmentSourcePayloadRejected extends Error {}

const nonEmpty = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const reject = (): never => {
  throw new CodexSegmentSourcePayloadRejected(
    "Codex segment source payload is missing canonical provider identity.",
  );
};

export const normalizeCodexSegmentSourcePayload = (
  eventType: AgentRunEventType,
  payload: Record<string, unknown>,
  resolveTurnId: ResolveTurnId,
): Record<string, unknown> | null => {
  if (
    eventType !== AgentRunEventType.SEGMENT_START &&
    eventType !== AgentRunEventType.SEGMENT_CONTENT &&
    eventType !== AgentRunEventType.SEGMENT_END
  ) {
    return null;
  }
  const segmentId = nonEmpty(payload.id) ?? reject();
  const turnId = nonEmpty(resolveTurnId(payload)) ?? reject();
  const identity = {
    id: segmentId,
    turn_id: turnId,
  };
  if (eventType === AgentRunEventType.SEGMENT_START) {
    if (!isAgentSegmentType(payload.segment_type)) reject();
    if (payload.metadata !== undefined && !isAgentSegmentJsonValue(payload.metadata)) reject();
    return {
      ...identity,
      segment_type: payload.segment_type,
      ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {}),
    };
  }
  if (eventType === AgentRunEventType.SEGMENT_CONTENT) {
    if (typeof payload.delta !== "string") reject();
    return {
      ...identity,
      delta: payload.delta,
    };
  }
  if (payload.metadata !== undefined && !isAgentSegmentJsonValue(payload.metadata)) reject();
  if (payload.interrupted !== undefined && typeof payload.interrupted !== "boolean") reject();
  if (payload.reason !== undefined && typeof payload.reason !== "string") reject();
  if (payload.failed !== undefined && typeof payload.failed !== "boolean") reject();
  if (payload.error !== undefined && typeof payload.error !== "string") reject();
  return {
    ...identity,
    ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {}),
    ...(payload.interrupted !== undefined ? { interrupted: payload.interrupted } : {}),
    ...(payload.reason !== undefined ? { reason: payload.reason } : {}),
    ...(payload.failed !== undefined ? { failed: payload.failed } : {}),
    ...(payload.error !== undefined ? { error: payload.error } : {}),
  };
};
