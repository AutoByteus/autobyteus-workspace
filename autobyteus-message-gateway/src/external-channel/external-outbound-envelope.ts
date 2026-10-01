import { ExternalChannelTransport, parseExternalChannelTransport } from './channel-transport.js';
import { assertValidDiscordBindingIdentity } from './discord-binding-identity.js';
import { throwParseError } from './errors.js';
import { parseExternalAttachmentList, type ExternalAttachment } from './external-attachment.js';
import { assertProviderTransportCompatibility } from './provider-transport-compatibility.js';
import { ExternalChannelProvider, parseExternalChannelProvider } from './provider.js';

export type ExternalOutboundChunk = {
  index: number;
  text: string;
};

export type ExternalOutboundEnvelope = {
  provider: ExternalChannelProvider;
  transport: ExternalChannelTransport;
  accountId: string;
  peerId: string;
  threadId: string | null;
  correlationMessageId: string;
  callbackIdempotencyKey: string;
  replyText: string;
  attachments: ExternalAttachment[];
  chunks: ExternalOutboundChunk[];
  metadata: Record<string, unknown>;
};

export function parseExternalOutboundEnvelope(input: unknown): ExternalOutboundEnvelope {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throwParseError('INVALID_INPUT', 'External outbound envelope must be an object.');
  }

  const record = input as Record<string, unknown>;
  const provider = parseExternalChannelProvider(record.provider);
  const transport = parseExternalChannelTransport(record.transport);
  assertProviderTransportCompatibility(provider, transport);
  const accountId = parseRequiredString(record.accountId, 'accountId');
  const peerId = parseRequiredString(record.peerId, 'peerId');
  const threadId = parseThreadId(record.threadId);
  if (provider === ExternalChannelProvider.DISCORD) {
    assertValidDiscordBindingIdentity({
      accountId,
      peerId,
      threadId
    });
  }
  const correlationMessageId = parseCorrelationMessageId(record);
  const callbackIdempotencyKey = parseCallbackIdempotencyKey(record);
  const replyText = parseReplyText(record.replyText);
  const attachments = parseExternalAttachmentList(record.attachments);
  const chunks = parseChunkPlan(record.chunks);
  const metadata = parseMetadata(record.metadata);

  return {
    provider,
    transport,
    accountId,
    peerId,
    threadId,
    correlationMessageId,
    callbackIdempotencyKey,
    replyText,
    attachments,
    chunks,
    metadata
  };
}

export function parseChunkPlan(input: unknown): ExternalOutboundChunk[] {
  if (input === undefined || input === null) {
    return [];
  }
  if (!Array.isArray(input)) {
    throwParseError('INVALID_INPUT', 'chunks must be an array when provided.', 'chunks');
  }
  return input.map((chunk, index) => parseChunk(chunk, index));
}

function parseChunk(input: unknown, fallbackIndex: number): ExternalOutboundChunk {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throwParseError('INVALID_INPUT', 'chunk must be an object.', 'chunks');
  }
  const record = input as Record<string, unknown>;
  const indexRaw = record.index ?? fallbackIndex;
  const textRaw = record.text;
  if (typeof indexRaw !== 'number' || !Number.isInteger(indexRaw) || indexRaw < 0) {
    throwParseError('INVALID_INPUT', 'chunk.index must be a non-negative integer.', 'chunks.index');
  }
  if (typeof textRaw !== 'string') {
    throwParseError('INVALID_INPUT', 'chunk.text must be a string.', 'chunks.text');
  }
  return {
    index: indexRaw,
    text: textRaw
  };
}

function parseCorrelationMessageId(record: Record<string, unknown>): string {
  const value = record.correlationMessageId ?? record.correlation_message_id;
  if (typeof value !== 'string' || value.trim().length === 0) {
    throwParseError('MISSING_CORRELATION_ID', 'correlationMessageId is required.', 'correlationMessageId');
  }
  return value.trim();
}

function parseCallbackIdempotencyKey(record: Record<string, unknown>): string {
  const value = record.callbackIdempotencyKey ?? record.callback_idempotency_key;
  if (typeof value !== 'string' || value.trim().length === 0) {
    throwParseError(
      'MISSING_CALLBACK_IDEMPOTENCY_KEY',
      'callbackIdempotencyKey is required.',
      'callbackIdempotencyKey'
    );
  }
  return value.trim();
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

function parseReplyText(value: unknown): string {
  if (typeof value !== 'string') {
    throwParseError('INVALID_INPUT', 'replyText must be a string.', 'replyText');
  }
  return value;
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
