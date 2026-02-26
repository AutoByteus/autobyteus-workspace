/**
 * Message parser - Converts raw JSON strings to typed messages.
 * 
 * Layer 2 of the agent streaming architecture - handles JSON parsing
 * and type validation without any business logic.
 */

import type { ServerMessage, ClientMessage } from './messageTypes';

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

  if (typeof msg.type !== 'string') {
    throw new Error('Message missing "type" field');
  }

  // We trust the backend to send valid payloads matching the type
  // Runtime validation can be added here if needed
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
