import type {
  ApplicationAgentClientFrame,
} from "@autobyteus/application-sdk-contracts";
import { APPLICATION_AGENT_COMMUNICATION_PROTOCOL } from "@autobyteus/application-sdk-contracts";
import {
  APPLICATION_AGENT_COMMUNICATION_CLIENT_FRAME_LIMIT,
  APPLICATION_AGENT_INPUT_REQUEST_ID_BYTES_LIMIT,
} from "../../application-communication-limits.js";
import { isApplicationAgentInputWithinLimits } from "../../application-orchestration/domain/application-agent-input-validator.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasOnlyKeys = (value: Record<string, unknown>, allowed: readonly string[]): boolean =>
  Object.keys(value).every((key) => allowed.includes(key));

export const parseApplicationAgentClientFrame = (
  data: unknown,
  isBinary: boolean,
): ApplicationAgentClientFrame | null => {
  if (isBinary) return null;
  const text = typeof data === "string"
    ? data
    : data instanceof Uint8Array || data instanceof ArrayBuffer
      ? Buffer.from(data as Uint8Array).toString("utf8")
      : null;
  if (text === null || Buffer.byteLength(text, "utf8") > APPLICATION_AGENT_COMMUNICATION_CLIENT_FRAME_LIMIT) {
    return null;
  }
  let candidate: unknown;
  try { candidate = JSON.parse(text); } catch { return null; }
  if (!isRecord(candidate) ||
      !hasOnlyKeys(candidate, ["protocol", "type", "requestId", "input"]) ||
      candidate.protocol !== APPLICATION_AGENT_COMMUNICATION_PROTOCOL ||
      candidate.type !== "INPUT" ||
      typeof candidate.requestId !== "string" ||
      !candidate.requestId.trim() ||
      Buffer.byteLength(candidate.requestId, "utf8") > APPLICATION_AGENT_INPUT_REQUEST_ID_BYTES_LIMIT ||
      !isApplicationAgentInputWithinLimits(candidate.input)) return null;
  return candidate as ApplicationAgentClientFrame;
};
