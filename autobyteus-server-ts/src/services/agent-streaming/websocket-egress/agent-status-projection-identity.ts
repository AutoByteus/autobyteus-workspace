import { ServerMessageType } from "../models.js";
import type { AgentStreamEgressControlMessage } from "./agent-stream-egress-control.js";

const readNonEmptyString = (
  payload: Readonly<Record<string, unknown>>,
  key: string,
): string | null => {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const identityPart = (label: string, value: string): string =>
  `${label}:${value.length}:${value}`;

export const resolveAgentStatusProjectionIdentity = (
  message: AgentStreamEgressControlMessage,
): string | null => {
  if (message.type !== ServerMessageType.AGENT_STATUS) {
    return null;
  }
  const payload = message.payload;
  const agentRunId = readNonEmptyString(payload, "agent_run_id") ?? readNonEmptyString(payload, "agent_id");
  if (!agentRunId) {
    return null;
  }

  return `agent-run|${identityPart("agent", agentRunId)}`;
};
