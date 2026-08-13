import type { ApplicationAgentStreamEvent } from "@autobyteus/application-sdk-contracts";
import { AgentRunEventType, type AgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import { APPLICATION_AGENT_EVENT_TEXT_LIMIT } from "../domain/application-agent-streaming-models.js";
import type { TeamAgentEvent } from "../../agent-team-execution/domain/team-agent-event.js";
import { resolveAgentRunErrorEvidence } from "../../agent-execution/domain/agent-run-error-evidence.js";

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
        return this.isDiagnostic(resolveAgentRunErrorEvidence(event)?.kind)
          ? null
          : { type: "ERROR", message: "The agent response failed." };
      default:
        return null;
    }
  }

  projectTeam(event: TeamAgentEvent): ApplicationAgentStreamEvent | null {
    switch (event.eventType) {
      case "TURN_STARTED": return { type: "TURN_STARTED" };
      case "SEGMENT_CONTENT": return event.details.segmentType === "text"
        ? this.projectTextDelta({ delta: event.details.delta, segment_type: "text" })
        : null;
      case "TURN_COMPLETED": return { type: "TURN_COMPLETED" };
      case "TURN_INTERRUPTED": return { type: "TURN_INTERRUPTED" };
      case "ERROR": return event.details.errorEffect === "diagnostic"
        ? null
        : { type: "ERROR", message: "The agent response failed." };
      default: return null;
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

  private isDiagnostic(kind: string | undefined): boolean {
    return kind === "TURN_DIAGNOSTIC" || kind === "RUNTIME_DIAGNOSTIC";
  }
}
