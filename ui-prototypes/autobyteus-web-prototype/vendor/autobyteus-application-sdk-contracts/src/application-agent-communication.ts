import type { ApplicationAgentInput, ApplicationAgentTargetAddress } from "./application-agent-bindings.js";
import type { ApplicationAgentEvent } from "./application-agent-events.js";

export const APPLICATION_AGENT_COMMUNICATION_PROTOCOL = "autobyteus.application-agent-communication.v1" as const;

export type ApplicationAgentConnectionErrorCode =
  | "APPLICATION_NOT_AVAILABLE"
  | "TARGET_NOT_AVAILABLE"
  | "INVALID_TARGET"
  | "RUNTIME_NOT_ACTIVE"
  | "CONNECTION_ABORTED"
  | "PROTOCOL_ERROR"
  | "INPUT_REJECTED"
  | "EVENT_MAPPING_FAILED"
  | "EVENT_SERIALIZATION_FAILED"
  | "BACKPRESSURE_LIMIT"
  | "TRANSPORT_FAILED";

export type ApplicationAgentConnectionErrorPayload = {
  code: ApplicationAgentConnectionErrorCode;
  message: string;
  recoverable: boolean;
};

export class ApplicationAgentConnectionError extends Error {
  readonly code: ApplicationAgentConnectionErrorCode;
  readonly recoverable: boolean;

  constructor(input: ApplicationAgentConnectionErrorPayload) {
    super(input.message);
    this.name = "ApplicationAgentConnectionError";
    this.code = input.code;
    this.recoverable = input.recoverable;
  }
}

export type ApplicationAgentConnectionCloseReason =
  | "CLIENT_CLOSED"
  | "ABORTED"
  | "ESTABLISHMENT_FAILED"
  | "BINDING_ENDED"
  | "STREAM_FAILED"
  | "BACKPRESSURE_LIMIT"
  | "PROTOCOL_ERROR"
  | "TRANSPORT_FAILED";

export type ApplicationAgentConnectionClose = { reason: ApplicationAgentConnectionCloseReason };

export type ApplicationAgentClientFrame = {
  protocol: typeof APPLICATION_AGENT_COMMUNICATION_PROTOCOL;
  type: "INPUT";
  requestId: string;
  input: ApplicationAgentInput;
};

export type ApplicationAgentServerFrame =
  | { protocol: typeof APPLICATION_AGENT_COMMUNICATION_PROTOCOL; type: "READY"; address: ApplicationAgentTargetAddress }
  | { protocol: typeof APPLICATION_AGENT_COMMUNICATION_PROTOCOL; type: "INPUT_ACCEPTED"; requestId: string }
  | { protocol: typeof APPLICATION_AGENT_COMMUNICATION_PROTOCOL; type: "INPUT_REJECTED"; requestId: string; error: ApplicationAgentConnectionErrorPayload }
  | { protocol: typeof APPLICATION_AGENT_COMMUNICATION_PROTOCOL; type: "EVENT"; event: ApplicationAgentEvent }
  | { protocol: typeof APPLICATION_AGENT_COMMUNICATION_PROTOCOL; type: "ERROR"; error: ApplicationAgentConnectionErrorPayload }
  | { protocol: typeof APPLICATION_AGENT_COMMUNICATION_PROTOCOL; type: "CLOSED"; close: ApplicationAgentConnectionClose };

export type ApplicationAgentEventStreamError = {
  code: "EVENT_MAPPING_FAILED" | "EVENT_SERIALIZATION_FAILED" | "WORKER_TRANSPORT_FAILED" | "BACKPRESSURE_LIMIT";
  message: string;
  recoverable: boolean;
};

export type ApplicationAgentEventStreamClose = {
  reason: "UNSUBSCRIBED" | "ABORTED" | "BINDING_ENDED" | "RUNTIME_UNAVAILABLE" | "STREAM_FAILED" | "WORKER_STOPPED";
};

export type ApplicationAgentEventStreamSubscribeErrorCode =
  | "SUBSCRIPTION_NOT_AVAILABLE"
  | "INVALID_STREAM_TARGET"
  | "RUNTIME_NOT_ACTIVE"
  | "SUBSCRIPTION_ABORTED"
  | "WORKER_TRANSPORT_FAILED";

export class ApplicationAgentEventStreamSubscribeError extends Error {
  readonly code: ApplicationAgentEventStreamSubscribeErrorCode;
  readonly recoverable: boolean;

  constructor(input: { code: ApplicationAgentEventStreamSubscribeErrorCode; message: string; recoverable: boolean }) {
    super(input.message);
    this.name = "ApplicationAgentEventStreamSubscribeError";
    this.code = input.code;
    this.recoverable = input.recoverable;
  }
}

export type ApplicationAgentEventStreamObserver = {
  onEvent: (event: ApplicationAgentEvent) => void | Promise<void>;
  onError?: (error: ApplicationAgentEventStreamError) => void | Promise<void>;
  onClosed?: (close: ApplicationAgentEventStreamClose) => void | Promise<void>;
};

export type ApplicationAgentEventStreamOptions = { signal?: AbortSignal };

export type ApplicationAgentEventStreamSubscription = {
  subscriptionId: string;
  unsubscribe: () => Promise<void>;
};
