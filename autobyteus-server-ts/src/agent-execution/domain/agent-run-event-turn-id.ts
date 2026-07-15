import type { AgentRunEvent } from "./agent-run-event.js";

const asTurnId = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const resolveAgentRunEventTurnId = (
  event: Pick<AgentRunEvent, "payload">,
): string | null =>
  asTurnId(event.payload.turnId) ?? asTurnId(event.payload.turn_id);
