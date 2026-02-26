import {
  createChannelRoutingKey,
  parseExternalChannelProvider,
  parseExternalChannelTransport,
  parseExternalPeerType,
  throwParseError,
  type ChannelRoutingKey,
  type ExternalChannelProvider,
  type ExternalChannelTransport,
  type ExternalMessageEnvelope,
  type ExternalPeerType
} from '../../external-channel/index.js';

export const AGENT_EXTERNAL_SOURCE_SCHEMA_VERSION = 1;

export type AgentExternalSourceMetadata = {
  schemaVersion: number;
  source: 'external-channel';
  provider: ExternalChannelProvider;
  transport: ExternalChannelTransport;
  accountId: string;
  peerId: string;
  peerType: ExternalPeerType;
  threadId: string | null;
  externalMessageId: string;
  routingKey: ChannelRoutingKey;
  receivedAt: string;
};

export function buildAgentExternalSourceMetadata(envelope: ExternalMessageEnvelope): AgentExternalSourceMetadata {
  const routingKey = createChannelRoutingKey({
    provider: envelope.provider,
    transport: envelope.transport,
    accountId: envelope.accountId,
    peerId: envelope.peerId,
    threadId: envelope.threadId
  });

  return {
    schemaVersion: AGENT_EXTERNAL_SOURCE_SCHEMA_VERSION,
    source: 'external-channel',
    provider: envelope.provider,
    transport: envelope.transport,
    accountId: envelope.accountId,
    peerId: envelope.peerId,
    peerType: envelope.peerType,
    threadId: envelope.threadId,
    externalMessageId: envelope.externalMessageId,
    routingKey,
    receivedAt: envelope.receivedAt
  };
}

export function parseAgentExternalSourceMetadata(input: unknown): AgentExternalSourceMetadata | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return null;
  }

  const container = input as Record<string, unknown>;
  const metadataRaw = container.externalSource ?? container.external_source;
  if (metadataRaw === undefined || metadataRaw === null) {
    return null;
  }
  if (typeof metadataRaw !== 'object' || Array.isArray(metadataRaw)) {
    throwParseError('INVALID_METADATA', 'externalSource must be an object.', 'externalSource');
  }
  const metadata = metadataRaw as Record<string, unknown>;

  if (metadata.schemaVersion !== AGENT_EXTERNAL_SOURCE_SCHEMA_VERSION) {
    throwParseError(
      'UNSUPPORTED_SCHEMA_VERSION',
      `Unsupported external source metadata schemaVersion: ${String(metadata.schemaVersion)}`,
      'externalSource.schemaVersion'
    );
  }

  const provider = parseExternalChannelProvider(metadata.provider);
  const transport = parseExternalChannelTransport(metadata.transport);
  const accountId = parseRequiredString(metadata.accountId, 'externalSource.accountId');
  const peerId = parseRequiredString(metadata.peerId, 'externalSource.peerId');
  const peerType = parseExternalPeerType(metadata.peerType);
  const threadId = parseNullableString(metadata.threadId, 'externalSource.threadId');
  const externalMessageId = parseRequiredString(metadata.externalMessageId, 'externalSource.externalMessageId');
  const receivedAt = parseRequiredString(metadata.receivedAt, 'externalSource.receivedAt');
  const routingKey = parseRoutingKey(metadata.routingKey, {
    provider,
    transport,
    accountId,
    peerId,
    threadId
  });

  return {
    schemaVersion: AGENT_EXTERNAL_SOURCE_SCHEMA_VERSION,
    source: 'external-channel',
    provider,
    transport,
    accountId,
    peerId,
    peerType,
    threadId,
    externalMessageId,
    routingKey,
    receivedAt
  };
}

function parseRequiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throwParseError('INVALID_METADATA', `${field} must be a non-empty string.`, field);
  }
  return value.trim();
}

function parseNullableString(value: unknown, field: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throwParseError('INVALID_METADATA', `${field} must be string|null.`, field);
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseRoutingKey(
  value: unknown,
  input: {
    provider: ExternalChannelProvider;
    transport: ExternalChannelTransport;
    accountId: string;
    peerId: string;
    threadId: string | null;
  }
): ChannelRoutingKey {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return createChannelRoutingKey(input);
}

