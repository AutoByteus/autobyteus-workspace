import {
  APPLICATION_AGENT_COMMUNICATION_PROTOCOL,
  type ApplicationAgentConnectionClose,
  type ApplicationAgentConnectionErrorPayload,
  type ApplicationAgentServerFrame,
  type ApplicationAgentTargetAddress,
} from "@autobyteus/application-sdk-contracts";
import {
  isApplicationAgentEvent,
  isApplicationAgentTargetAddress,
} from "./application-agent-event-validator.js";

const APPLICATION_AGENT_SERVER_FRAME_BYTES_LIMIT = 1024 * 1024;
const ERROR_CODES = new Set([
  "APPLICATION_NOT_AVAILABLE", "TARGET_NOT_AVAILABLE", "INVALID_TARGET", "RUNTIME_NOT_ACTIVE",
  "CONNECTION_ABORTED", "PROTOCOL_ERROR", "INPUT_REJECTED", "EVENT_MAPPING_FAILED",
  "EVENT_SERIALIZATION_FAILED", "BACKPRESSURE_LIMIT", "TRANSPORT_FAILED",
]);
const CLOSE_REASONS = new Set([
  "CLIENT_CLOSED", "ABORTED", "ESTABLISHMENT_FAILED", "BINDING_ENDED", "STREAM_FAILED",
  "BACKPRESSURE_LIMIT", "PROTOCOL_ERROR", "TRANSPORT_FAILED",
]);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
const isError = (value: unknown): value is ApplicationAgentConnectionErrorPayload =>
  isRecord(value) && hasExactKeys(value, ["code", "message", "recoverable"]) &&
  typeof value.code === "string" && ERROR_CODES.has(value.code) &&
  typeof value.message === "string" && typeof value.recoverable === "boolean";
const isClose = (value: unknown): value is ApplicationAgentConnectionClose =>
  isRecord(value) && hasExactKeys(value, ["reason"]) &&
  typeof value.reason === "string" && CLOSE_REASONS.has(value.reason);

export const sameApplicationAgentTargetAddress = (
  left: ApplicationAgentTargetAddress,
  right: ApplicationAgentTargetAddress,
): boolean => left.bindingId === right.bindingId &&
  left.memberAddress === right.memberAddress;

export const parseApplicationAgentServerFrame = (raw: unknown): ApplicationAgentServerFrame | null => {
  if (typeof raw !== "string" || new TextEncoder().encode(raw).byteLength > APPLICATION_AGENT_SERVER_FRAME_BYTES_LIMIT) {
    return null;
  }
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!isRecord(value) || value.protocol !== APPLICATION_AGENT_COMMUNICATION_PROTOCOL || typeof value.type !== "string") {
    return null;
  }
  if (value.type === "READY") {
    return hasExactKeys(value, ["protocol", "type", "address"]) && isApplicationAgentTargetAddress(value.address)
      ? value as ApplicationAgentServerFrame
      : null;
  }
  if (value.type === "INPUT_ACCEPTED") {
    return hasExactKeys(value, ["protocol", "type", "requestId"]) && typeof value.requestId === "string" && value.requestId.length > 0
      ? value as ApplicationAgentServerFrame
      : null;
  }
  if (value.type === "INPUT_REJECTED") {
    return hasExactKeys(value, ["protocol", "type", "requestId", "error"]) &&
      typeof value.requestId === "string" && value.requestId.length > 0 && isError(value.error)
      ? value as ApplicationAgentServerFrame
      : null;
  }
  if (value.type === "EVENT") {
    return hasExactKeys(value, ["protocol", "type", "event"]) && isApplicationAgentEvent(value.event)
      ? value as ApplicationAgentServerFrame
      : null;
  }
  if (value.type === "ERROR") {
    return hasExactKeys(value, ["protocol", "type", "error"]) && isError(value.error)
      ? value as ApplicationAgentServerFrame
      : null;
  }
  if (value.type === "CLOSED") {
    return hasExactKeys(value, ["protocol", "type", "close"]) && isClose(value.close)
      ? value as ApplicationAgentServerFrame
      : null;
  }
  return null;
};
