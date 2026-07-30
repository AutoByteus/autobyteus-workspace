import { AgentRunEventType, type AgentRunEvent } from "./agent-run-event.js";
import { resolveAgentRunEventTurnId } from "./agent-run-event-turn-id.js";

export type AgentRunErrorEvidence =
  | { kind: "TURN_DIAGNOSTIC"; turnId: string }
  | { kind: "TURN_TERMINAL"; turnId: string }
  | { kind: "RUNTIME_GLOBAL" };

export const resolveAgentRunErrorEvidence = (
  event: AgentRunEvent,
): AgentRunErrorEvidence | null => {
  if (event.eventType !== AgentRunEventType.ERROR) {
    return null;
  }

  const scope = event.payload.error_scope;
  const effect = event.payload.error_effect;
  const turnId = resolveAgentRunEventTurnId(event);

  if (scope === "turn" && effect === "diagnostic" && turnId) {
    return { kind: "TURN_DIAGNOSTIC", turnId };
  }
  if (scope === "turn" && effect === "terminal" && turnId) {
    return { kind: "TURN_TERMINAL", turnId };
  }
  if (scope === "runtime" && effect === "terminal" && !turnId) {
    return { kind: "RUNTIME_GLOBAL" };
  }
  return null;
};
