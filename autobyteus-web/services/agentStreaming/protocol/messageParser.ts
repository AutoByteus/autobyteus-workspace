/**
 * Message parser - Converts raw JSON strings to typed messages.
 * 
 * Layer 2 of the agent streaming architecture - handles JSON parsing
 * and type validation without any business logic.
 */

import type { ServerMessage, ClientMessage } from './messageTypes';

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const getPayloadObject = (msg: Record<string, unknown>): Record<string, unknown> => {
  if (!msg.payload || typeof msg.payload !== 'object' || Array.isArray(msg.payload)) {
    throw new Error('Message missing object "payload" field');
  }
  return msg.payload as Record<string, unknown>;
};

const validateServerMessageShape = (msg: Record<string, unknown>): void => {
  if (!isNonEmptyString(msg.type)) {
    throw new Error('Message missing "type" field');
  }

  const type = msg.type;
  if (type === 'SEGMENT_START' || type === 'SEGMENT_CONTENT' || type === 'SEGMENT_END') {
    const payload = getPayloadObject(msg);
    if (!isNonEmptyString(payload.id)) {
      throw new Error(`${type} payload missing non-empty "id"`);
    }
    if (type === 'SEGMENT_CONTENT' && typeof payload.delta !== 'string') {
      throw new Error('SEGMENT_CONTENT payload missing "delta"');
    }
  }
};

/**
 * Parse a raw JSON string from the WebSocket into a typed ServerMessage.
 * 
 * @param raw - Raw JSON string from WebSocket
 * @returns Parsed ServerMessage
 * @throws Error if parsing fails or message format is invalid
 */
export function parseServerMessage(raw: string): ServerMessage {
  let data: unknown;
  
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON: ${(e as Error).message}`);
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Message must be an object');
  }

  const msg = data as Record<string, unknown>;

  validateServerMessageShape(msg);
  return msg as unknown as ServerMessage;
}

/**
 * Serialize a ClientMessage to JSON string for sending over WebSocket.
 * 
 * @param message - Typed client message
 * @returns JSON string
 */
export function serializeClientMessage(message: ClientMessage): string {
  return JSON.stringify(message);
}
