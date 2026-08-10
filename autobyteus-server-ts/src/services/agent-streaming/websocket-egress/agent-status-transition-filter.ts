import type { ServerMessagePayload } from "../models.js";
import type {
  AgentStreamEgressFilter,
  AgentStreamEgressFilterDecision,
} from "./agent-stream-egress-control.js";
import { resolveAgentStatusProjectionIdentity } from "./agent-status-projection-identity.js";
import { cloneStreamPayload, streamPayloadsEqual } from "./stream-payload-equality.js";

const FORWARD: AgentStreamEgressFilterDecision = { action: "FORWARD" };

export class AgentStatusTransitionFilter implements AgentStreamEgressFilter {
  private readonly lastPayloadByIdentity = new Map<string, ServerMessagePayload>();

  evaluate(message: Parameters<AgentStreamEgressFilter["evaluate"]>[0]): AgentStreamEgressFilterDecision {
    const identity = resolveAgentStatusProjectionIdentity(message);
    if (!identity) {
      return FORWARD;
    }
    const previous = this.lastPayloadByIdentity.get(identity);
    if (previous && streamPayloadsEqual(previous, message.payload)) {
      return { action: "SUPPRESS", reason: "EXACT_REPEATED_AGENT_STATUS" };
    }
    this.lastPayloadByIdentity.set(identity, cloneStreamPayload(message.payload) as ServerMessagePayload);
    return FORWARD;
  }

  dispose(): void {
    this.lastPayloadByIdentity.clear();
  }
}
