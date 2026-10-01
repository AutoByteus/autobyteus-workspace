import { AgentRunEventType, type AgentRunEvent } from "../domain/agent-run-event.js";
import { resolveAgentRunErrorEvidence } from "../domain/agent-run-error-evidence.js";
import { resolveAgentRunEventTurnId } from "../domain/agent-run-event-turn-id.js";
import type { AgentRunInterruptState } from "../domain/agent-run-interrupt-state.js";
import type { AgentRunInputAdmissionState } from "./agent-run-input-admission-state.js";

export function observeAgentRunInputEvents(events: readonly AgentRunEvent[], inputState: AgentRunInputAdmissionState, interruptState: AgentRunInterruptState): void {
    for (const event of events) {
      if (event.eventType === AgentRunEventType.TURN_STARTED) {
        inputState.observeTurnStarted(resolveAgentRunEventTurnId(event));
        continue;
      }
      if (event.eventType === AgentRunEventType.TURN_COMPLETED) {
        interruptState.observeTerminal(resolveAgentRunEventTurnId(event));
        inputState.observeTurnTerminal({
          kind: "completed",
          turnId: resolveAgentRunEventTurnId(event),
        });
        continue;
      }
      if (event.eventType === AgentRunEventType.TURN_INTERRUPTED) {
        interruptState.observeTerminal(resolveAgentRunEventTurnId(event));
        inputState.observeTurnTerminal({
          kind: "interrupted",
          turnId: resolveAgentRunEventTurnId(event),
        });
        continue;
      }
      if (event.eventType !== AgentRunEventType.ERROR) continue;
      const evidence = resolveAgentRunErrorEvidence(event);
      const errorMessage = typeof event.payload.message === "string" && event.payload.message.trim()
        ? event.payload.message
        : null;
      if (evidence?.kind === "TURN_TERMINAL") {
        interruptState.observeTerminal(evidence.turnId);
        inputState.observeTurnFailure({
          turnId: evidence.turnId,
          code: "RUNTIME_TURN_FAILED",
          message: errorMessage ?? "Runtime turn failed.",
        });
      } else if (evidence?.kind === "RUNTIME_GLOBAL") {
        interruptState.clear();
        inputState.observeRuntimeFailure({
          code: "RUNTIME_GLOBAL_FAILURE",
          message: errorMessage ?? "Runtime failed.",
        });
      }
    }
}
