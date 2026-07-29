import { resolveAgentRunErrorEvidence } from "../domain/agent-run-error-evidence.js";
import { AgentRunEventType, type AgentRunEvent } from "../domain/agent-run-event.js";
import { normalizeAgentApiStatus } from "../domain/agent-status-payload.js";

export type AgentRunFailureObservation = {
  message: string | null;
};

export class AgentRunCanonicalFailureObserver {
  private pendingError: { token: object; message: string | null } | null = null;

  observe(event: AgentRunEvent): AgentRunFailureObservation | null {
    if (event.eventType === AgentRunEventType.ERROR) {
      const evidence = resolveAgentRunErrorEvidence(event);
      if (evidence?.kind !== "TURN_TERMINAL" && evidence?.kind !== "RUNTIME_GLOBAL") {
        this.pendingError = null;
        return null;
      }
      const token = {};
      this.pendingError = { token, message: this.extractMessage(event.payload) };
      queueMicrotask(() => {
        if (this.pendingError?.token === token) this.pendingError = null;
      });
      return null;
    }

    if (event.eventType !== AgentRunEventType.AGENT_STATUS) {
      this.pendingError = null;
      return null;
    }
    const pendingMessage = this.pendingError?.message ?? null;
    this.pendingError = null;
    return normalizeAgentApiStatus(event.payload.status) === "error"
      ? { message: this.extractMessage(event.payload) ?? pendingMessage }
      : null;
  }

  private extractMessage(payload: Record<string, unknown>): string | null {
    return typeof payload.message === "string"
      ? payload.message
      : typeof payload.error === "string"
        ? payload.error
        : null;
  }
}
