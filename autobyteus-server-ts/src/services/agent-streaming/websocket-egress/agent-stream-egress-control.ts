import type { ServerMessage } from "../models.js";

export type AgentStreamEgressControlValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | { readonly [key: string]: AgentStreamEgressControlValue }
  | readonly AgentStreamEgressControlValue[];

export type AgentStreamEgressControlMessage = Readonly<{
  type: ServerMessage["type"];
  payload: Readonly<Record<string, AgentStreamEgressControlValue>>;
}>;

const cloneAndFreezeControlValue = (value: unknown): AgentStreamEgressControlValue => {
  if (Array.isArray(value)) {
    return Object.freeze(value.map(cloneAndFreezeControlValue));
  }
  if (!value || typeof value !== "object") {
    return value as AgentStreamEgressControlValue;
  }
  return Object.freeze(Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, cloneAndFreezeControlValue(entry)]),
  ));
};

export const createAgentStreamEgressControlMessage = (
  message: Pick<ServerMessage, "type" | "payload">,
): AgentStreamEgressControlMessage => Object.freeze({
  type: message.type,
  payload: cloneAndFreezeControlValue(message.payload),
}) as AgentStreamEgressControlMessage;

export type AgentStreamEgressFilterDecision =
  | { action: "FORWARD" }
  | { action: "SUPPRESS"; reason: string };

export interface AgentStreamEgressFilter {
  evaluate(message: AgentStreamEgressControlMessage): AgentStreamEgressFilterDecision;
  dispose?(): void;
}

export type AgentStreamEgressForward = (message: ServerMessage) => void;

export interface AgentStreamEgressScheduler {
  accept(message: ServerMessage, forward: AgentStreamEgressForward): void;
  flush(forward: AgentStreamEgressForward): void;
  dispose(): void;
}

export type AgentStreamEgressObservation = Readonly<
  | { type: "MESSAGE_RECEIVED"; message: AgentStreamEgressControlMessage }
  | { type: "MESSAGE_SUPPRESSED"; message: AgentStreamEgressControlMessage; reason: string }
  | { type: "MESSAGE_FORWARDED"; message: AgentStreamEgressControlMessage }
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
