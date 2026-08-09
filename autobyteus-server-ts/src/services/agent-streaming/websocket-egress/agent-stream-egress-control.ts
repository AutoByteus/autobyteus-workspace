import type { ServerMessage } from "../models.js";

export type AgentStreamEgressFilterDecision =
  | { action: "FORWARD" }
  | { action: "SUPPRESS"; reason: string };

export interface AgentStreamEgressFilter {
  evaluate(message: Readonly<ServerMessage>): AgentStreamEgressFilterDecision;
  dispose?(): void;
}

export type AgentStreamEgressForward = (message: ServerMessage) => void;

export interface AgentStreamEgressScheduler {
  accept(message: ServerMessage, forward: AgentStreamEgressForward): void;
  flush(forward: AgentStreamEgressForward): void;
  dispose(): void;
}

export type AgentStreamEgressObservation = Readonly<
  | { type: "MESSAGE_RECEIVED"; message: Readonly<ServerMessage> }
  | { type: "MESSAGE_SUPPRESSED"; message: Readonly<ServerMessage>; reason: string }
  | { type: "MESSAGE_FORWARDED"; message: Readonly<ServerMessage> }
  | { type: "FLUSHED" }
  | { type: "DISPOSED" }
>;

export interface AgentStreamEgressObserver {
  observe(observation: AgentStreamEgressObservation): void;
  dispose?(): void;
}

export type AgentStreamEgressControlFactory<T> = () => T;

export type AgentStreamEgressControlExtensions = {
  filterFactories?: readonly AgentStreamEgressControlFactory<AgentStreamEgressFilter>[];
  observerFactories?: readonly AgentStreamEgressControlFactory<AgentStreamEgressObserver>[];
};

export type AgentStreamEgressControlComposition = {
  filters: AgentStreamEgressFilter[];
  scheduler: AgentStreamEgressScheduler;
  observers: AgentStreamEgressObserver[];
};
