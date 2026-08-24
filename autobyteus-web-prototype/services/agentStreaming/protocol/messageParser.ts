/**
 * Message parser - Converts raw JSON strings to typed messages.
 * 
 * Layer 2 of the agent streaming architecture - handles JSON parsing
 * and type validation without any business logic.
 */

import type { ServerMessage, SerializableClientMessage } from './messageTypes';

const SEGMENT_TYPES = new Set([
  'text', 'tool_call', 'write_file', 'run_bash', 'reasoning', 'edit_file', 'media',
]);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, allowed: readonly string[]): boolean =>
  Object.keys(value).every((key) => allowed.includes(key));
const nonEmpty = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
const hasOwn = (value: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);
const isJsonValue = (value: unknown, seen = new Set<object>()): boolean => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (!value || typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);
  const valid = Array.isArray(value)
    ? value.every((entry) => isJsonValue(entry, seen))
    : isRecord(value) && Object.values(value).every((entry) => isJsonValue(entry, seen));
  seen.delete(value);
  return valid;
};
const validOptionalMetadata = (payload: Record<string, unknown>): boolean =>
  !hasOwn(payload, 'metadata') || isJsonValue(payload.metadata);
const validOptionalBoolean = (payload: Record<string, unknown>, key: string): boolean =>
  !hasOwn(payload, key) || typeof payload[key] === 'boolean';
const validOptionalNullableString = (payload: Record<string, unknown>, key: string): boolean =>
  !hasOwn(payload, key) || payload[key] === null || typeof payload[key] === 'string';

const validateCanonicalBoundary = (type: string, payload: unknown): void => {
  if (!isRecord(payload)) throw new Error(`${type} payload must be an object`);
  if (type === 'SYSTEM_INSTRUCTIONS_SUPPLIED') {
    if (!exactKeys(payload, ['trace_id', 'content', 'ts'])
      || Object.keys(payload).length !== 3
      || typeof payload.trace_id !== 'string' || payload.trace_id.trim().length === 0
      || typeof payload.content !== 'string'
      || typeof payload.ts !== 'number' || !Number.isFinite(payload.ts) || payload.ts <= 0) {
      throw new Error('Invalid canonical SYSTEM_INSTRUCTIONS_SUPPLIED payload');
    }
  } else if (type === 'SEGMENT_START') {
    if (!exactKeys(payload, ['id', 'turn_id', 'segment_type', 'metadata']) ||
      !nonEmpty(payload.id) || !nonEmpty(payload.turn_id) || !SEGMENT_TYPES.has(payload.segment_type as string) ||
      !validOptionalMetadata(payload)) {
      throw new Error('Invalid canonical SEGMENT_START payload');
    }
  } else if (type === 'SEGMENT_CONTENT') {
    if (!exactKeys(payload, ['id', 'turn_id', 'segment_type', 'delta']) ||
      !nonEmpty(payload.id) || !nonEmpty(payload.turn_id) ||
      !SEGMENT_TYPES.has(payload.segment_type as string) || typeof payload.delta !== 'string') {
      throw new Error('Invalid canonical SEGMENT_CONTENT payload');
    }
  } else if (type === 'SEGMENT_END') {
    if (!exactKeys(payload, ['id', 'turn_id', 'metadata', 'interrupted', 'reason', 'failed', 'error']) ||
      !nonEmpty(payload.id) || !nonEmpty(payload.turn_id) || !validOptionalMetadata(payload) ||
      !validOptionalBoolean(payload, 'interrupted') || !validOptionalNullableString(payload, 'reason') ||
      !validOptionalBoolean(payload, 'failed') || !validOptionalNullableString(payload, 'error')) {
      throw new Error('Invalid canonical SEGMENT_END payload');
    }
  } else if (type === 'ERROR') {
    if (!exactKeys(payload, ['code', 'message', 'error_scope', 'error_effect', 'turn_id']) ||
      !nonEmpty(payload.code) || typeof payload.message !== 'string' ||
      !(payload.turn_id === null || nonEmpty(payload.turn_id)) ||
      !(
        (payload.error_scope === null && payload.error_effect === null && payload.turn_id === null) ||
        (payload.error_scope === 'turn' &&
          (payload.error_effect === 'diagnostic' || payload.error_effect === 'terminal') &&
          nonEmpty(payload.turn_id)) ||
        (payload.error_scope === 'runtime' &&
          payload.error_effect === 'terminal' &&
          payload.turn_id === null)
      )) {
      throw new Error('Invalid canonical ERROR payload');
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

  if (typeof msg.type !== 'string') {
    throw new Error('Message missing "type" field');
  }

  validateCanonicalBoundary(msg.type, msg.payload);

  return msg as unknown as ServerMessage;
}

/**
 * Serialize a client message to JSON string for sending over WebSocket.
 * 
 * @param message - Typed client message
 * @returns JSON string
 */
export function serializeClientMessage(message: SerializableClientMessage): string {
  return JSON.stringify(message);
}
