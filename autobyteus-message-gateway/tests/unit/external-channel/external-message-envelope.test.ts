import { describe, expect, it } from 'vitest';
import { ExternalChannelTransport } from '../../../src/external-channel/channel-transport.js';
import { ExternalChannelParseError } from '../../../src/external-channel/errors.js';
import { parseExternalMessageEnvelope } from '../../../src/external-channel/external-message-envelope.js';
import { ExternalPeerType } from '../../../src/external-channel/peer-type.js';
import { ExternalChannelProvider } from '../../../src/external-channel/provider.js';

describe('parseExternalMessageEnvelope', () => {
  it('parses a valid inbound envelope', () => {
    const envelope = parseExternalMessageEnvelope({
      provider: 'WHATSAPP',
      transport: 'BUSINESS_API',
      accountId: 'acct-1',
      peerId: 'peer-1',
      peerType: 'USER',
      threadId: null,
      externalMessageId: 'msg-1',
      content: 'hello',
      attachments: [],
      receivedAt: '2026-02-08T00:00:00.000Z',
      metadata: { language: 'en' }
    });

    expect(envelope.provider).toBe(ExternalChannelProvider.WHATSAPP);
    expect(envelope.transport).toBe(ExternalChannelTransport.BUSINESS_API);
    expect(envelope.peerType).toBe(ExternalPeerType.USER);
    expect(envelope.threadId).toBeNull();
    expect(envelope.routingKey).toBe('WHATSAPP:BUSINESS_API:acct-1:peer-1:direct');
  });

  it('throws when transport is missing', () => {
    expect(() =>
      parseExternalMessageEnvelope({
        provider: 'WHATSAPP',
        accountId: 'acct-1',
        peerId: 'peer-1',
        peerType: 'USER',
        externalMessageId: 'msg-1',
        content: 'hello',
        receivedAt: '2026-02-08T00:00:00.000Z'
      })
    ).toThrowError(ExternalChannelParseError);

    try {
      parseExternalMessageEnvelope({
        provider: 'WHATSAPP',
        accountId: 'acct-1',
        peerId: 'peer-1',
        peerType: 'USER',
        externalMessageId: 'msg-1',
        content: 'hello',
        receivedAt: '2026-02-08T00:00:00.000Z'
      });
    } catch (error) {
      expect((error as ExternalChannelParseError).code).toBe('MISSING_TRANSPORT');
    }
  });

  it('throws on transport and provider mismatch', () => {
    expect(() =>
      parseExternalMessageEnvelope({
        provider: 'WECOM',
        transport: 'PERSONAL_SESSION',
        accountId: 'acct-1',
        peerId: 'peer-1',
        peerType: 'GROUP',
        externalMessageId: 'msg-1',
        content: 'hello',
        receivedAt: '2026-02-08T00:00:00.000Z'
      })
    ).toThrowError(ExternalChannelParseError);

    try {
      parseExternalMessageEnvelope({
        provider: 'WECOM',
        transport: 'PERSONAL_SESSION',
        accountId: 'acct-1',
        peerId: 'peer-1',
        peerType: 'GROUP',
        externalMessageId: 'msg-1',
        content: 'hello',
        receivedAt: '2026-02-08T00:00:00.000Z'
      });
    } catch (error) {
      expect((error as ExternalChannelParseError).code).toBe('INCOMPATIBLE_TRANSPORT_PROVIDER');
    }
  });

  it('parses WECHAT personal-session envelope', () => {
    const envelope = parseExternalMessageEnvelope({
      provider: 'WECHAT',
      transport: 'PERSONAL_SESSION',
      accountId: 'acct-1',
      peerId: 'peer-1',
      peerType: 'USER',
      externalMessageId: 'msg-1',
      content: 'hello',
      receivedAt: '2026-02-08T00:00:00.000Z'
    });

    expect(envelope.provider).toBe(ExternalChannelProvider.WECHAT);
    expect(envelope.transport).toBe(ExternalChannelTransport.PERSONAL_SESSION);
  });

  it('rejects WECHAT business-api envelope', () => {
    expect(() =>
      parseExternalMessageEnvelope({
        provider: 'WECHAT',
        transport: 'BUSINESS_API',
        accountId: 'acct-1',
        peerId: 'peer-1',
        peerType: 'USER',
        externalMessageId: 'msg-1',
        content: 'hello',
        receivedAt: '2026-02-08T00:00:00.000Z'
      })
    ).toThrowError(ExternalChannelParseError);
  });

  it('parses DISCORD business-api envelope', () => {
    const envelope = parseExternalMessageEnvelope({
      provider: 'DISCORD',
      transport: 'BUSINESS_API',
      accountId: 'discord-acct-1',
      peerId: 'channel:1234567890',
      peerType: 'GROUP',
      threadId: '9876543210',
      externalMessageId: 'msg-1',
      content: 'hello',
      receivedAt: '2026-02-08T00:00:00.000Z'
    });

    expect(envelope.provider).toBe(ExternalChannelProvider.DISCORD);
    expect(envelope.transport).toBe(ExternalChannelTransport.BUSINESS_API);
    expect(envelope.threadId).toBe('9876543210');
  });

  it('rejects DISCORD personal-session envelope', () => {
    expect(() =>
      parseExternalMessageEnvelope({
        provider: 'DISCORD',
        transport: 'PERSONAL_SESSION',
        accountId: 'discord-acct-1',
        peerId: 'channel:1234567890',
        peerType: 'GROUP',
        externalMessageId: 'msg-1',
        content: 'hello',
        receivedAt: '2026-02-08T00:00:00.000Z'
      })
    ).toThrowError(ExternalChannelParseError);
  });

  it('parses TELEGRAM business-api envelope', () => {
    const envelope = parseExternalMessageEnvelope({
      provider: 'TELEGRAM',
      transport: 'BUSINESS_API',
      accountId: 'telegram-acct-1',
      peerId: 'chat-123456',
      peerType: 'GROUP',
      threadId: 'topic-42',
      externalMessageId: 'msg-1',
      content: 'hello',
      receivedAt: '2026-02-08T00:00:00.000Z'
    });

    expect(envelope.provider).toBe(ExternalChannelProvider.TELEGRAM);
    expect(envelope.transport).toBe(ExternalChannelTransport.BUSINESS_API);
    expect(envelope.threadId).toBe('topic-42');
  });

  it('rejects TELEGRAM personal-session envelope', () => {
    expect(() =>
      parseExternalMessageEnvelope({
        provider: 'TELEGRAM',
        transport: 'PERSONAL_SESSION',
        accountId: 'telegram-acct-1',
        peerId: 'chat-123456',
        peerType: 'USER',
        externalMessageId: 'msg-1',
        content: 'hello',
        receivedAt: '2026-02-08T00:00:00.000Z'
      })
    ).toThrowError(ExternalChannelParseError);
  });

  it('rejects DISCORD user peer with threadId', () => {
    expect(() =>
      parseExternalMessageEnvelope({
        provider: 'DISCORD',
        transport: 'BUSINESS_API',
        accountId: 'discord-acct-1',
        peerId: 'user:1234567890',
        peerType: 'USER',
        threadId: '9876543210',
        externalMessageId: 'msg-1',
        content: 'hello',
        receivedAt: '2026-02-08T00:00:00.000Z'
      })
    ).toThrowError(ExternalChannelParseError);

    try {
      parseExternalMessageEnvelope({
        provider: 'DISCORD',
        transport: 'BUSINESS_API',
        accountId: 'discord-acct-1',
        peerId: 'user:1234567890',
        peerType: 'USER',
        threadId: '9876543210',
        externalMessageId: 'msg-1',
        content: 'hello',
        receivedAt: '2026-02-08T00:00:00.000Z'
      });
    } catch (error) {
      expect((error as ExternalChannelParseError).code).toBe('INVALID_DISCORD_THREAD_TARGET_COMBINATION');
      expect((error as ExternalChannelParseError).field).toBe('threadId');
    }
  });
});
