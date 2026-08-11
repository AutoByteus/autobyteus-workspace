import type { ApplicationExecutionContext } from "@autobyteus/application-sdk-contracts";
import {
  createTeamExecutionAddress,
  serializeTeamExecutionAddress,
  type TeamExecutionAddress,
} from "../../agent-team-execution/domain/team-execution-address.js";

const required = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required for ApplicationExecutionContext.`);
  return normalized;
};

const clone = (
  context: ApplicationExecutionContext,
  executionAddress: TeamExecutionAddress,
): ApplicationExecutionContext => Object.freeze({
  applicationId: required(context.applicationId, "applicationId"),
  bindingId: required(context.bindingId, "bindingId"),
  producer: Object.freeze({
    executionAddress: createTeamExecutionAddress(executionAddress),
    displayName: context.producer.displayName?.trim() || null,
    runtimeKind: context.producer.runtimeKind,
  }),
});

export const assertPersistentApplicationExecutionContext = (
  context: ApplicationExecutionContext,
  executionAddress: TeamExecutionAddress,
): ApplicationExecutionContext => {
  const actual = createTeamExecutionAddress(context.producer.executionAddress);
  const expected = createTeamExecutionAddress(executionAddress);
  if (serializeTeamExecutionAddress(actual) !== serializeTeamExecutionAddress(expected)) {
    throw new Error("Persistent application producer execution address does not match the Team Agent execution being constructed.");
  }
  return clone(context, expected);
};

export const rebindApplicationExecutionContext = (
  context: ApplicationExecutionContext,
  executionAddress: TeamExecutionAddress,
): ApplicationExecutionContext => clone(context, executionAddress);
