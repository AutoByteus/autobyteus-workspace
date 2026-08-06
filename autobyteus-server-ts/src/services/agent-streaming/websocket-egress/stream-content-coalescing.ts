import { ServerMessage, ServerMessageType } from "../models.js";

const valuesEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) {
    return true;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }
    return left.every((value, index) => valuesEqual(value, right[index]));
  }
  if (
    !left ||
    !right ||
    typeof left !== "object" ||
    typeof right !== "object"
  ) {
    return false;
  }

  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) =>
      key === rightKeys[index] && valuesEqual(leftRecord[key], rightRecord[key])
    );
};

const payloadWithoutDelta = (message: ServerMessage): Record<string, unknown> => {
  const { delta: _delta, ...payload } = message.payload;
  return payload;
};

export const isCoalescibleStreamContent = (message: ServerMessage): boolean =>
  message.type === ServerMessageType.SEGMENT_CONTENT &&
  typeof message.payload.delta === "string";

export const cloneStreamContentMessage = (message: ServerMessage): ServerMessage =>
  new ServerMessage(message.type, { ...message.payload });

export const canAppendStreamContent = (
  target: ServerMessage,
  incoming: ServerMessage,
): boolean =>
  isCoalescibleStreamContent(target) &&
  isCoalescibleStreamContent(incoming) &&
  valuesEqual(payloadWithoutDelta(target), payloadWithoutDelta(incoming));

export const appendStreamContent = (
  target: ServerMessage,
  incoming: ServerMessage,
): void => {
  target.payload.delta = `${String(target.payload.delta)}${String(incoming.payload.delta)}`;
};
