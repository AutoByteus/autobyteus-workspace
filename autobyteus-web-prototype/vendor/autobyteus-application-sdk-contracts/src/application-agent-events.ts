import type {
  ApplicationAgentTargetAddress,
  ApplicationExecutionProducer,
} from "./application-agent-bindings.js";

export type ApplicationAgentStreamEvent =
  | { type: "TURN_STARTED" }
  | { type: "TEXT_DELTA"; delta: string }
  | { type: "TURN_COMPLETED" }
  | { type: "TURN_INTERRUPTED" }
  | { type: "ERROR"; message: string };

export type ApplicationAgentEvent = {
  sequence: number;
  observedAt: string;
  applicationId: string;
  address: ApplicationAgentTargetAddress;
  runtimeSubject: "AGENT_RUN" | "TEAM_RUN";
  producer: ApplicationExecutionProducer;
  event: ApplicationAgentStreamEvent;
};
