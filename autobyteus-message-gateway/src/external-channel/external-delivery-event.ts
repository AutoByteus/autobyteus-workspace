import { ExternalChannelTransport, parseExternalChannelTransport } from './channel-transport.js';
import { throwParseError } from './errors.js';
import { ExternalChannelProvider, parseExternalChannelProvider } from './provider.js';

export enum ExternalDeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED'
}

export type ExternalDeliveryEvent = {
  provider: ExternalChannelProvider;
  transport: ExternalChannelTransport;
  accountId: string;
  peerId: string;
  threadId: string | null;
  correlationMessageId: string;
  status: ExternalDeliveryStatus;
  occurredAt: string;
  metadata: Record<string, unknown>;
};

export function parseExternalDeliveryEvent(input: unknown): ExternalDeliveryEvent {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throwParseError('INVALID_INPUT', 'External delivery event must be an object.');
  }
  const record = input as Record<string, unknown>;

  const provider = parseExternalChannelProvider(record.provider);
  const transport = parseExternalChannelTransport(record.transport);
  const accountId = parseRequiredString(record.accountId, 'accountId');
  const peerId = parseRequiredString(record.peerId, 'peerId');
  const threadId = parseThreadId(record.threadId);
  const correlationMessageId = parseRequiredString(record.correlationMessageId, 'correlationMessageId');
  const status = parseDeliveryStatus(record.status);
  const occurredAt = parseOccurredAt(record.occurredAt);
  const metadata = parseMetadata(record.metadata);

  return {
    provider,
    transport,
    accountId,
    peerId,
    threadId,
    correlationMessageId,
    status,
    occurredAt,
    metadata
  };
}

function parseRequiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throwParseError('INVALID_INPUT', `${field} must be a non-empty string.`, field);
  }
  return value.trim();
}

function parseThreadId(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throwParseError('INVALID_THREAD_ID', 'threadId must be a string or null.', 'threadId');
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseDeliveryStatus(input: unknown): ExternalDeliveryStatus {
  if (typeof input !== 'string') {
    throwParseError('INVALID_INPUT', 'status must be a string.', 'status');
  }
  const normalized = input.trim().toUpperCase();
  if (normalized === ExternalDeliveryStatus.PENDING) {
    return ExternalDeliveryStatus.PENDING;
  }
  if (normalized === ExternalDeliveryStatus.SENT) {
    return ExternalDeliveryStatus.SENT;
  }
  if (normalized === ExternalDeliveryStatus.DELIVERED) {
    return ExternalDeliveryStatus.DELIVERED;
  }
  if (normalized === ExternalDeliveryStatus.FAILED) {
    return ExternalDeliveryStatus.FAILED;
  }
  throwParseError('INVALID_INPUT', `Unsupported delivery status: ${input}`, 'status');
}

function parseOccurredAt(value: unknown): string {
  if (typeof value !== 'string') {
    throwParseError('INVALID_INPUT', 'occurredAt must be an ISO datetime string.', 'occurredAt');
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throwParseError('INVALID_INPUT', 'occurredAt must be a valid ISO datetime string.', 'occurredAt');
  }
  return parsed.toISOString();
}

function parseMetadata(value: unknown): Record<string, unknown> {
  if (value === undefined || value === null) {
    return {};
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throwParseError('INVALID_METADATA', 'metadata must be an object when provided.', 'metadata');
  }
  return value as Record<string, unknown>;
}

