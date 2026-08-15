import type { ApplicationExecutionContext } from "@autobyteus/application-sdk-contracts";

const required = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required for ApplicationExecutionContext.`);
  return normalized;
};

const clone = (
  context: ApplicationExecutionContext,
  agentRunId: string,
): ApplicationExecutionContext => Object.freeze({
  applicationId: required(context.applicationId, "applicationId"),
  bindingId: required(context.bindingId, "bindingId"),
  producer: Object.freeze({
    agentRunId: required(agentRunId, "producer.agentRunId"),
    displayName: context.producer.displayName?.trim() || null,
    runtimeKind: context.producer.runtimeKind,
  }),
});

export const assertPersistentApplicationExecutionContext = (
  context: ApplicationExecutionContext,
  agentRunId: string,
): ApplicationExecutionContext => {
  const expected = required(agentRunId, "agentRunId");
  if (required(context.producer.agentRunId, "producer.agentRunId") !== expected) {
    throw new Error("Persistent application producer AgentRun ID does not match the AgentRun being constructed.");
  }
  return clone(context, expected);
};

export const rebindApplicationExecutionContext = (
  context: ApplicationExecutionContext,
  agentRunId: string,
): ApplicationExecutionContext => clone(context, agentRunId);
