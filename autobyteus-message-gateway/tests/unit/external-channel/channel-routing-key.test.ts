import { describe, it, expect } from 'vitest';
import { ExternalChannelTransport } from '../../../src/external-channel/channel-transport.js';
import { createChannelRoutingKey } from '../../../src/external-channel/channel-routing-key.js';
import { ExternalChannelProvider } from '../../../src/external-channel/provider.js';

describe('createChannelRoutingKey', () => {
  it('creates deterministic key including transport', () => {
    const key = createChannelRoutingKey({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId: 'acct-1',
      peerId: 'peer-1',
      threadId: 'thread-1'
    });

    expect(key).toBe('WHATSAPP:BUSINESS_API:acct-1:peer-1:thread-1');
  });

  it('normalizes missing threadId to direct', () => {
    const key = createChannelRoutingKey({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId: 'acct-1',
      peerId: 'peer-1'
    });

    expect(key).toBe('WHATSAPP:PERSONAL_SESSION:acct-1:peer-1:direct');
  });
});

