import type { ApplicationAgentStreamEvent } from "@autobyteus/application-sdk-contracts";
import { AgentRunEventType, type AgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import { APPLICATION_AGENT_EVENT_TEXT_LIMIT } from "../domain/application-agent-streaming-models.js";

export class ApplicationAgentStreamProjectionError extends Error {}

export class ApplicationAgentStreamEventProjector {
  project(event: AgentRunEvent): ApplicationAgentStreamEvent | null {
    switch (event.eventType) {
      case AgentRunEventType.TURN_STARTED:
        return { type: "TURN_STARTED" };
      case AgentRunEventType.SEGMENT_CONTENT:
        return this.projectTextDelta(event.payload);
      case AgentRunEventType.TURN_COMPLETED:
        return { type: "TURN_COMPLETED" };
      case AgentRunEventType.TURN_INTERRUPTED:
        return { type: "TURN_INTERRUPTED" };
      case AgentRunEventType.ERROR:
        return { type: "ERROR", message: "The agent response failed." };
      default:
        return null;
    }
  }

  private projectTextDelta(payload: Record<string, unknown>): ApplicationAgentStreamEvent | null {
    if (payload.segment_type !== "text") return null;
    const delta = payload.delta;
    if (typeof delta !== "string" || Buffer.byteLength(delta, "utf8") > APPLICATION_AGENT_EVENT_TEXT_LIMIT) {
      throw new ApplicationAgentStreamProjectionError("Invalid text delta.");
    }
    return delta.length > 0 ? { type: "TEXT_DELTA", delta } : null;
  }
}
