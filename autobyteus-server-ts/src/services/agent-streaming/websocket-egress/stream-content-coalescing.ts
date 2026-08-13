import { ServerMessage, ServerMessageType } from "../models.js";
import { streamPayloadsEqual } from "./stream-payload-equality.js";

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
  streamPayloadsEqual(payloadWithoutDelta(target), payloadWithoutDelta(incoming));

export const appendStreamContent = (
  target: ServerMessage,
  incoming: ServerMessage,
): void => {
  target.payload.delta = `${String(target.payload.delta)}${String(incoming.payload.delta)}`;
};
