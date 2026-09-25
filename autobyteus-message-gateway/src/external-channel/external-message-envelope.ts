import { createChannelRoutingKey, type ChannelRoutingKey } from './channel-routing-key.js';
import { ExternalChannelTransport, parseExternalChannelTransport } from './channel-transport.js';
import { assertValidDiscordBindingIdentity } from './discord-binding-identity.js';
import { throwParseError } from './errors.js';
import { parseExternalAttachmentList, type ExternalAttachment } from './external-attachment.js';
import { ExternalPeerType, parseExternalPeerType } from './peer-type.js';
import { assertProviderTransportCompatibility } from './provider-transport-compatibility.js';
import { ExternalChannelProvider, parseExternalChannelProvider } from './provider.js';

export type ExternalMessageEnvelopeInput = {
  provider: unknown;
  transport?: unknown;
  accountId: unknown;
  peerId: unknown;
  peerType: unknown;
  threadId?: unknown;
  externalMessageId: unknown;
  content: unknown;
  attachments?: unknown;
  receivedAt: unknown;
  metadata?: unknown;
};

export type ExternalMessageEnvelope = {
  provider: ExternalChannelProvider;
  transport: ExternalChannelTransport;
  accountId: string;
  peerId: string;
  peerType: ExternalPeerType;
  threadId: string | null;
  externalMessageId: string;
  content: string;
  attachments: ExternalAttachment[];
  receivedAt: string;
  metadata: Record<string, unknown>;
  routingKey: ChannelRoutingKey;
};

export function parseExternalMessageEnvelope(input: unknown): ExternalMessageEnvelope {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throwParseError('INVALID_INPUT', 'External message envelope must be an object.');
  }
  const record = input as Record<string, unknown>;

  const provider = parseExternalChannelProvider(record.provider);
  const transport = parseTransport(record);
  assertProviderTransportCompatibility(provider, transport);
  const accountId = parseRequiredString(record.accountId, 'accountId');
  const peerId = parseRequiredString(record.peerId, 'peerId');
  const peerType = parseExternalPeerType(record.peerType);
  const threadId = parseThreadId(record.threadId);
  const externalMessageId = parseRequiredString(record.externalMessageId, 'externalMessageId');
  const content = parseMessageContent(record.content);
  const attachments = parseExternalAttachmentList(record.attachments);
  const receivedAt = parseReceivedAt(record.receivedAt);
  const metadata = parseMetadata(record.metadata);

  if (provider === ExternalChannelProvider.DISCORD) {
    assertValidDiscordBindingIdentity({
      accountId,
      peerId,
      threadId
    });
  }

  const routingKey = createChannelRoutingKey({
    provider,
    transport,
    accountId,
    peerId,
    threadId
  });

  return freezeEnvelope({
    provider,
    transport,
    accountId,
    peerId,
    peerType,
    threadId,
    externalMessageId,
    content,
    attachments,
    receivedAt,
    metadata,
    routingKey
  });
}

function parseTransport(record: Record<string, unknown>): ExternalChannelTransport {
  if (record.transport === undefined || record.transport === null) {
    throwParseError('MISSING_TRANSPORT', 'Transport is required for external message envelopes.', 'transport');
  }
  return parseExternalChannelTransport(record.transport);
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

function parseMessageContent(value: unknown): string {
  if (typeof value !== 'string') {
    throwParseError('INVALID_INPUT', 'content must be a string.', 'content');
  }
  return value;
}

function parseReceivedAt(value: unknown): string {
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throwParseError('INVALID_RECEIVED_AT', 'receivedAt must be a valid ISO datetime string.', 'receivedAt');
    }
    return parsed.toISOString();
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throwParseError('INVALID_RECEIVED_AT', 'receivedAt Date is invalid.', 'receivedAt');
    }
    return value.toISOString();
  }
  throwParseError('INVALID_RECEIVED_AT', 'receivedAt must be a string or Date.', 'receivedAt');
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

function freezeEnvelope(envelope: ExternalMessageEnvelope): ExternalMessageEnvelope {
  return Object.freeze(envelope) as ExternalMessageEnvelope;
}
