import { ServerMessageType } from "../models.js";
import type { StreamEgressMessage } from "./agent-stream-egress-control.js";
import { streamPayloadsEqual } from "./stream-payload-equality.js";

const payloadWithoutDelta = (message: StreamEgressMessage): Record<string, unknown> => {
  const { delta: _delta, ...payload } = message.payload;
  return payload;
};

export const isCoalescibleStreamContent = (message: StreamEgressMessage): boolean =>
  message.type === ServerMessageType.SEGMENT_CONTENT &&
  typeof message.payload.delta === "string";

export const cloneStreamContentMessage = (
  message: StreamEgressMessage,
): StreamEgressMessage => ({
  type: message.type,
  payload: { ...message.payload },
});

export const canAppendStreamContent = (
  target: StreamEgressMessage,
  incoming: StreamEgressMessage,
): boolean =>
  isCoalescibleStreamContent(target) &&
  isCoalescibleStreamContent(incoming) &&
  streamPayloadsEqual(payloadWithoutDelta(target), payloadWithoutDelta(incoming));

export const appendStreamContent = (
  target: StreamEgressMessage,
  incoming: StreamEgressMessage,
): StreamEgressMessage => ({
  type: target.type,
  payload: {
    ...target.payload,
    delta: `${String(target.payload.delta)}${String(incoming.payload.delta)}`,
  },
});
