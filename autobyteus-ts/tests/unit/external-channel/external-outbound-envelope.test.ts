import { describe, expect, it } from 'vitest';
import { ExternalChannelTransport } from '../../../src/external-channel/channel-transport.js';
import { ExternalChannelParseError } from '../../../src/external-channel/errors.js';
import { parseExternalOutboundEnvelope } from '../../../src/external-channel/external-outbound-envelope.js';
import { ExternalChannelProvider } from '../../../src/external-channel/provider.js';

describe('parseExternalOutboundEnvelope', () => {
  it('parses outbound envelope and normalizes callback key alias', () => {
    const envelope = parseExternalOutboundEnvelope({
      provider: 'WHATSAPP',
      transport: 'PERSONAL_SESSION',
      accountId: 'acct-1',
      peerId: 'peer-1',
      threadId: 'thread-1',
      correlationMessageId: 'corr-1',
      callback_idempotency_key: 'cb-key-1',
      replyText: 'hi there',
      chunks: [{ text: 'hi', index: 0 }]
    });

    expect(envelope.provider).toBe(ExternalChannelProvider.WHATSAPP);
    expect(envelope.transport).toBe(ExternalChannelTransport.PERSONAL_SESSION);
    expect(envelope.callbackIdempotencyKey).toBe('cb-key-1');
    expect(envelope.chunks.length).toBe(1);
  });

  it('throws on missing correlation id', () => {
    expect(() =>
      parseExternalOutboundEnvelope({
        provider: 'WHATSAPP',
        transport: 'BUSINESS_API',
        accountId: 'acct-1',
        peerId: 'peer-1',
        callbackIdempotencyKey: 'cb-1',
        replyText: 'hello'
      })
    ).toThrowError(ExternalChannelParseError);

    try {
      parseExternalOutboundEnvelope({
        provider: 'WHATSAPP',
        transport: 'BUSINESS_API',
        accountId: 'acct-1',
        peerId: 'peer-1',
        callbackIdempotencyKey: 'cb-1',
        replyText: 'hello'
      });
    } catch (error) {
      expect((error as ExternalChannelParseError).code).toBe('MISSING_CORRELATION_ID');
    }
  });

  it('throws on missing callback idempotency key', () => {
    expect(() =>
      parseExternalOutboundEnvelope({
        provider: 'WHATSAPP',
        transport: 'BUSINESS_API',
        accountId: 'acct-1',
        peerId: 'peer-1',
        correlationMessageId: 'corr-1',
        replyText: 'hello'
      })
    ).toThrowError(ExternalChannelParseError);

    try {
      parseExternalOutboundEnvelope({
        provider: 'WHATSAPP',
        transport: 'BUSINESS_API',
        accountId: 'acct-1',
        peerId: 'peer-1',
        correlationMessageId: 'corr-1',
        replyText: 'hello'
      });
    } catch (error) {
      expect((error as ExternalChannelParseError).code).toBe('MISSING_CALLBACK_IDEMPOTENCY_KEY');
    }
  });

  it('parses WECHAT personal-session outbound envelope', () => {
    const envelope = parseExternalOutboundEnvelope({
      provider: 'WECHAT',
      transport: 'PERSONAL_SESSION',
      accountId: 'acct-1',
      peerId: 'peer-1',
      correlationMessageId: 'corr-1',
      callbackIdempotencyKey: 'cb-1',
      replyText: 'hello'
    });

    expect(envelope.provider).toBe(ExternalChannelProvider.WECHAT);
    expect(envelope.transport).toBe(ExternalChannelTransport.PERSONAL_SESSION);
  });

  it('rejects WECHAT business-api outbound envelope', () => {
    expect(() =>
      parseExternalOutboundEnvelope({
        provider: 'WECHAT',
        transport: 'BUSINESS_API',
        accountId: 'acct-1',
        peerId: 'peer-1',
        correlationMessageId: 'corr-1',
        callbackIdempotencyKey: 'cb-1',
        replyText: 'hello'
      })
    ).toThrowError(ExternalChannelParseError);
  });

  it('parses DISCORD business-api outbound envelope', () => {
    const envelope = parseExternalOutboundEnvelope({
      provider: 'DISCORD',
      transport: 'BUSINESS_API',
      accountId: 'discord-acct-1',
      peerId: 'channel:1234567890',
      threadId: '9876543210',
      correlationMessageId: 'corr-1',
      callbackIdempotencyKey: 'cb-1',
      replyText: 'hello'
    });

    expect(envelope.provider).toBe(ExternalChannelProvider.DISCORD);
    expect(envelope.transport).toBe(ExternalChannelTransport.BUSINESS_API);
    expect(envelope.threadId).toBe('9876543210');
  });

  it('rejects DISCORD personal-session outbound envelope', () => {
    expect(() =>
      parseExternalOutboundEnvelope({
        provider: 'DISCORD',
        transport: 'PERSONAL_SESSION',
        accountId: 'discord-acct-1',
        peerId: 'channel:1234567890',
        correlationMessageId: 'corr-1',
        callbackIdempotencyKey: 'cb-1',
        replyText: 'hello'
      })
    ).toThrowError(ExternalChannelParseError);
  });

  it('parses TELEGRAM business-api outbound envelope', () => {
    const envelope = parseExternalOutboundEnvelope({
      provider: 'TELEGRAM',
      transport: 'BUSINESS_API',
      accountId: 'telegram-acct-1',
      peerId: 'chat-123456',
      threadId: 'topic-42',
      correlationMessageId: 'corr-1',
      callbackIdempotencyKey: 'cb-1',
      replyText: 'hello'
    });

    expect(envelope.provider).toBe(ExternalChannelProvider.TELEGRAM);
    expect(envelope.transport).toBe(ExternalChannelTransport.BUSINESS_API);
    expect(envelope.threadId).toBe('topic-42');
  });

  it('rejects TELEGRAM personal-session outbound envelope', () => {
    expect(() =>
      parseExternalOutboundEnvelope({
        provider: 'TELEGRAM',
        transport: 'PERSONAL_SESSION',
        accountId: 'telegram-acct-1',
        peerId: 'chat-123456',
        correlationMessageId: 'corr-1',
        callbackIdempotencyKey: 'cb-1',
        replyText: 'hello'
      })
    ).toThrowError(ExternalChannelParseError);
  });

  it('rejects DISCORD user peer with threadId', () => {
    expect(() =>
      parseExternalOutboundEnvelope({
        provider: 'DISCORD',
        transport: 'BUSINESS_API',
        accountId: 'discord-acct-1',
        peerId: 'user:1234567890',
        threadId: '9876543210',
        correlationMessageId: 'corr-1',
        callbackIdempotencyKey: 'cb-1',
        replyText: 'hello'
      })
    ).toThrowError(ExternalChannelParseError);

    try {
      parseExternalOutboundEnvelope({
        provider: 'DISCORD',
        transport: 'BUSINESS_API',
        accountId: 'discord-acct-1',
        peerId: 'user:1234567890',
        threadId: '9876543210',
        correlationMessageId: 'corr-1',
        callbackIdempotencyKey: 'cb-1',
        replyText: 'hello'
      });
    } catch (error) {
      expect((error as ExternalChannelParseError).code).toBe('INVALID_DISCORD_THREAD_TARGET_COMBINATION');
      expect((error as ExternalChannelParseError).field).toBe('threadId');
    }
  });
});
