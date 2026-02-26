import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
  buildPeerCandidateKey,
  useMessagingChannelBindingOptionsStore,
} from '~/stores/messagingChannelBindingOptionsStore';
import { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';
import { getApolloClient } from '~/utils/apolloClient';

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(),
}));

describe('messagingChannelBindingOptionsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('loads target options from GraphQL', async () => {
    const apolloMock = {
      query: vi.fn().mockResolvedValue({
        data: {
          externalChannelBindingTargetOptions: [
            {
              targetType: 'AGENT',
              targetId: 'agent-1',
              displayName: 'Setup Agent',
              status: 'IDLE',
            },
          ],
        },
        errors: [],
      }),
    };
    vi.mocked(getApolloClient).mockReturnValue(apolloMock as any);

    const store = useMessagingChannelBindingOptionsStore();
    const result = await store.loadTargetOptions();

    expect(result).toHaveLength(1);
    expect(store.targetOptionsByType('AGENT')).toHaveLength(1);
  });

  it('loads peer candidates through gateway client boundary', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    const gatewayClientMock = {
      getWhatsAppPersonalPeerCandidates: vi.fn().mockResolvedValue({
        sessionId: 'session-1',
        accountLabel: 'Home WhatsApp',
        status: 'ACTIVE',
        updatedAt: '2026-02-09T10:00:00.000Z',
        items: [
          {
            peerId: '491701111111@s.whatsapp.net',
            peerType: 'USER',
            threadId: null,
            displayName: 'Alice',
            lastMessageAt: '2026-02-09T09:59:00.000Z',
          },
        ],
      }),
      getWeChatPersonalPeerCandidates: vi.fn(),
      getDiscordPeerCandidates: vi.fn(),
      getTelegramPeerCandidates: vi.fn(),
    };
    vi.spyOn(gatewayStore, 'createClient').mockReturnValue(gatewayClientMock as any);

    const store = useMessagingChannelBindingOptionsStore();
    const result = await store.loadPeerCandidates('session-1');

    expect(result).toHaveLength(1);
    expect(gatewayClientMock.getWhatsAppPersonalPeerCandidates).toHaveBeenCalledWith(
      'session-1',
      {
        includeGroups: undefined,
        limit: undefined,
      },
    );
  });

  it('loads WeChat peer candidates through gateway client boundary', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    const gatewayClientMock = {
      getWhatsAppPersonalPeerCandidates: vi.fn(),
      getWeChatPersonalPeerCandidates: vi.fn().mockResolvedValue({
        sessionId: 'wechat-session-1',
        accountLabel: 'Home WeChat',
        status: 'ACTIVE',
        updatedAt: '2026-02-09T10:00:00.000Z',
        items: [
          {
            peerId: 'wxid_friend_001',
            peerType: 'USER',
            threadId: null,
            displayName: 'Friend',
            lastMessageAt: '2026-02-09T09:59:00.000Z',
          },
        ],
      }),
      getDiscordPeerCandidates: vi.fn(),
      getTelegramPeerCandidates: vi.fn(),
    };
    vi.spyOn(gatewayStore, 'createClient').mockReturnValue(gatewayClientMock as any);

    const store = useMessagingChannelBindingOptionsStore();
    const result = await store.loadPeerCandidates('wechat-session-1', undefined, 'WECHAT');

    expect(result).toHaveLength(1);
    expect(gatewayClientMock.getWeChatPersonalPeerCandidates).toHaveBeenCalledWith(
      'wechat-session-1',
      {
        includeGroups: undefined,
        limit: undefined,
      },
    );
    expect(gatewayClientMock.getWhatsAppPersonalPeerCandidates).not.toHaveBeenCalled();
  });

  it('loads Discord peer candidates through gateway client boundary', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    const gatewayClientMock = {
      getWhatsAppPersonalPeerCandidates: vi.fn(),
      getWeChatPersonalPeerCandidates: vi.fn(),
      getDiscordPeerCandidates: vi.fn().mockResolvedValue({
        accountId: 'discord-acct-1',
        updatedAt: '2026-02-09T10:00:00.000Z',
        items: [
          {
            peerId: 'user:111222333',
            peerType: 'USER',
            threadId: null,
            displayName: 'Alice',
            lastMessageAt: '2026-02-09T09:59:00.000Z',
          },
        ],
      }),
      getTelegramPeerCandidates: vi.fn(),
    };
    vi.spyOn(gatewayStore, 'createClient').mockReturnValue(gatewayClientMock as any);

    const store = useMessagingChannelBindingOptionsStore();
    const result = await store.loadPeerCandidates('discord-acct-1', undefined, 'DISCORD');

    expect(result).toHaveLength(1);
    expect(gatewayClientMock.getDiscordPeerCandidates).toHaveBeenCalledWith({
      accountId: 'discord-acct-1',
      includeGroups: undefined,
      limit: undefined,
    });
    expect(gatewayClientMock.getWhatsAppPersonalPeerCandidates).not.toHaveBeenCalled();
    expect(gatewayClientMock.getWeChatPersonalPeerCandidates).not.toHaveBeenCalled();
  });

  it('loads Telegram peer candidates through gateway client boundary', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    const gatewayClientMock = {
      getWhatsAppPersonalPeerCandidates: vi.fn(),
      getWeChatPersonalPeerCandidates: vi.fn(),
      getDiscordPeerCandidates: vi.fn(),
      getTelegramPeerCandidates: vi.fn().mockResolvedValue({
        accountId: 'telegram-acct-1',
        updatedAt: '2026-02-09T10:00:00.000Z',
        items: [
          {
            peerId: '100200300',
            peerType: 'USER',
            threadId: null,
            displayName: 'Alice',
            lastMessageAt: '2026-02-09T09:59:00.000Z',
          },
        ],
      }),
    };
    vi.spyOn(gatewayStore, 'createClient').mockReturnValue(gatewayClientMock as any);

    const store = useMessagingChannelBindingOptionsStore();
    const result = await store.loadPeerCandidates('telegram-acct-1', undefined, 'TELEGRAM');

    expect(result).toHaveLength(1);
    expect(gatewayClientMock.getTelegramPeerCandidates).toHaveBeenCalledWith({
      accountId: 'telegram-acct-1',
      includeGroups: undefined,
      limit: undefined,
    });
    expect(gatewayClientMock.getWhatsAppPersonalPeerCandidates).not.toHaveBeenCalled();
    expect(gatewayClientMock.getWeChatPersonalPeerCandidates).not.toHaveBeenCalled();
    expect(gatewayClientMock.getDiscordPeerCandidates).not.toHaveBeenCalled();
  });

  it('asserts stale selections for dropdown-driven values', () => {
    const store = useMessagingChannelBindingOptionsStore();
    store.targetOptions = [
      {
        targetType: 'AGENT',
        targetId: 'agent-1',
        displayName: 'Setup Agent',
        status: 'IDLE',
      },
    ];
    store.peerCandidates = [
      {
        peerId: '491701111111@s.whatsapp.net',
        peerType: 'USER',
        threadId: null,
        displayName: 'Alice',
        lastMessageAt: '2026-02-09T09:59:00.000Z',
      },
    ];

    expect(() =>
      store.assertSelectionsFresh({
        draft: {
          provider: 'WHATSAPP',
          transport: 'PERSONAL_SESSION',
          accountId: 'acc-1',
          peerId: '491701111111@s.whatsapp.net',
          threadId: null,
          targetType: 'AGENT',
          targetId: 'agent-1',
        },
        peerSelectionMode: 'dropdown',
        targetSelectionMode: 'dropdown',
        selectedPeerKey: buildPeerCandidateKey(store.peerCandidates[0]),
        selectedTargetId: 'agent-1',
      }),
    ).not.toThrow();

    expect(() =>
      store.assertSelectionsFresh({
        draft: {
          provider: 'WHATSAPP',
          transport: 'PERSONAL_SESSION',
          accountId: 'acc-1',
          peerId: '491701111111@s.whatsapp.net',
          threadId: null,
          targetType: 'AGENT',
          targetId: 'agent-stale',
        },
        peerSelectionMode: 'dropdown',
        targetSelectionMode: 'dropdown',
        selectedPeerKey: buildPeerCandidateKey(store.peerCandidates[0]),
        selectedTargetId: 'agent-stale',
      }),
    ).toThrow('Selection is outdated');
  });

  it('skips freshness checks in manual mode', () => {
    const store = useMessagingChannelBindingOptionsStore();

    expect(() =>
      store.assertSelectionsFresh({
        draft: {
          provider: 'WHATSAPP',
          transport: 'PERSONAL_SESSION',
          accountId: 'acc-1',
          peerId: 'manual-peer',
          threadId: null,
          targetType: 'AGENT',
          targetId: 'manual-target',
        },
        peerSelectionMode: 'manual',
        targetSelectionMode: 'manual',
      }),
    ).not.toThrow();
  });
});
