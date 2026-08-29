import type {
  ApplicationAgentEvent,
  ApplicationAgentTargetAddress,
} from "@autobyteus/application-sdk-contracts";
import { isApplicationAgentMemberAddress } from "@autobyteus/application-sdk-contracts";

type RecordValue = Record<string, unknown>;
type ValueValidator = (value: unknown) => boolean;

const isRecord = (value: unknown): value is RecordValue =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isString: ValueValidator = (value) => typeof value === "string";
const isNullableString: ValueValidator = (value) => value === null || isString(value);
const isNonEmptyString: ValueValidator = (value) => typeof value === "string" && value.trim().length > 0;
const isOneOf = (...allowed: readonly string[]): ValueValidator => (value) =>
  typeof value === "string" && allowed.includes(value);
const exact = (value: unknown, shape: Record<string, ValueValidator>): boolean => {
  if (!isRecord(value)) return false;
  const keys = Object.keys(shape);
  return Object.keys(value).length === keys.length && keys.every((key) =>
    Object.prototype.hasOwnProperty.call(value, key) && shape[key]!(value[key]));
};

export const isApplicationAgentTargetAddress = (value: unknown): value is ApplicationAgentTargetAddress => {
  return exact(value, {
    bindingId: isNonEmptyString,
    memberAddress: (memberAddress) =>
      memberAddress === null || isApplicationAgentMemberAddress(memberAddress),
  });
};

const isProducer: ValueValidator = (value) => exact(value, {
  agentRunId: isNonEmptyString,
  displayName: isNullableString,
});

const isStreamEvent: ValueValidator = (value) => {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  switch (value.type) {
    case "TURN_STARTED":
    case "TURN_COMPLETED":
    case "TURN_INTERRUPTED":
      return exact(value, { type: isOneOf(value.type) });
    case "TEXT_DELTA":
      return exact(value, {
        type: isOneOf("TEXT_DELTA"),
        delta: (delta) => typeof delta === "string" && delta.length > 0,
      });
    case "ERROR":
      return exact(value, {
        type: isOneOf("ERROR"),
        message: (message) => typeof message === "string" && message.length > 0,
      });
    default:
      return false;
  }
};

export const isApplicationAgentEvent = (value: unknown): value is ApplicationAgentEvent => {
  if (!isRecord(value) || !exact(value, {
    sequence: (sequence) => typeof sequence === "number" && Number.isSafeInteger(sequence) && sequence > 0,
    observedAt: isString,
    applicationId: isString,
    address: isApplicationAgentTargetAddress,
    runtimeSubject: isOneOf("AGENT_RUN", "TEAM_RUN"),
    producer: isProducer,
    event: isStreamEvent,
  })) return false;
  const address = value.address as ApplicationAgentTargetAddress;
  return address.memberAddress === null || value.runtimeSubject === "TEAM_RUN";
};
