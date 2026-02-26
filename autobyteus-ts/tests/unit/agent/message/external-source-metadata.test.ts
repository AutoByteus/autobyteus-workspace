import { describe, expect, it } from 'vitest';
import { ExternalChannelTransport } from '../../../../src/external-channel/channel-transport.js';
import { ExternalChannelParseError } from '../../../../src/external-channel/errors.js';
import { parseExternalMessageEnvelope } from '../../../../src/external-channel/external-message-envelope.js';
import {
  AGENT_EXTERNAL_SOURCE_SCHEMA_VERSION,
  buildAgentExternalSourceMetadata,
  parseAgentExternalSourceMetadata
} from '../../../../src/agent/message/external-source-metadata.js';

describe('external-source-metadata', () => {
  it('builds metadata from a valid envelope', () => {
    const envelope = parseExternalMessageEnvelope({
      provider: 'WHATSAPP',
      transport: 'BUSINESS_API',
      accountId: 'acct-1',
      peerId: 'peer-1',
      peerType: 'USER',
      threadId: null,
      externalMessageId: 'msg-1',
      content: 'hello',
      receivedAt: '2026-02-08T00:00:00.000Z'
    });

    const metadata = buildAgentExternalSourceMetadata(envelope);

    expect(metadata.schemaVersion).toBe(AGENT_EXTERNAL_SOURCE_SCHEMA_VERSION);
    expect(metadata.transport).toBe(ExternalChannelTransport.BUSINESS_API);
    expect(metadata.routingKey).toBe('WHATSAPP:BUSINESS_API:acct-1:peer-1:direct');
  });

  it('returns null when external source block does not exist', () => {
    expect(parseAgentExternalSourceMetadata({})).toBeNull();
  });

  it('throws on unsupported schema version', () => {
    expect(() =>
      parseAgentExternalSourceMetadata({
        externalSource: {
          schemaVersion: 2,
          provider: 'WHATSAPP',
          transport: 'BUSINESS_API',
          accountId: 'acct-1',
          peerId: 'peer-1',
          peerType: 'USER',
          threadId: null,
          externalMessageId: 'msg-1',
          receivedAt: '2026-02-08T00:00:00.000Z',
          routingKey: 'r'
        }
      })
    ).toThrowError(ExternalChannelParseError);
  });
});

