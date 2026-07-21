import type {
  ApplicationAgentEvent,
  ApplicationAgentEventStreamClose,
  ApplicationAgentEventStreamError,
  ApplicationExecutionProducer,
} from "@autobyteus/application-sdk-contracts";
import type { AgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import type { TeamRunEvent } from "../../agent-team-execution/domain/team-run-event.js";

export {
  APPLICATION_AGENT_EVENT_ARRAY_LIMIT,
  APPLICATION_AGENT_EVENT_QUEUE_LIMIT,
  APPLICATION_AGENT_EVENT_SERIALIZED_FRAME_LIMIT,
  APPLICATION_AGENT_EVENT_SUMMARY_LIMIT,
  APPLICATION_AGENT_EVENT_TEXT_LIMIT,
} from "../../application-communication-limits.js";

export type ApplicationAgentStreamSourceEvent =
  | { source: "AGENT"; event: AgentRunEvent; producer: ApplicationExecutionProducer }
  | { source: "AGENT_TEAM"; event: TeamRunEvent; producer: ApplicationExecutionProducer | null };

export type ApplicationAgentStreamEmitter = {
  emitEvent: (event: ApplicationAgentEvent) => Promise<void> | void;
  emitError: (error: ApplicationAgentEventStreamError) => Promise<void> | void;
  emitClosed: (close: ApplicationAgentEventStreamClose) => Promise<void> | void;
};

export type ApplicationAgentStreamingEstablishmentErrorCode =
  | "APPLICATION_NOT_AVAILABLE"
  | "TARGET_NOT_AVAILABLE"
  | "INVALID_TARGET"
  | "RUNTIME_NOT_ACTIVE"
  | "SUBSCRIPTION_ABORTED"
  | "TRANSPORT_FAILED";

export class ApplicationAgentStreamingEstablishmentError extends Error {
  constructor(readonly code: ApplicationAgentStreamingEstablishmentErrorCode) {
    super(code);
    this.name = "ApplicationAgentStreamingEstablishmentError";
  }
}
