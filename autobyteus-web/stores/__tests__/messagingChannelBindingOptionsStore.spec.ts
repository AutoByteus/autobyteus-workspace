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

  it('loads Discord peer candidates through the managed gateway store', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    vi.spyOn(gatewayStore, 'loadPeerCandidates').mockResolvedValue({
      accountId: 'discord-acct-1',
      updatedAt: '2026-03-08T12:00:00.000Z',
      items: [
        {
          peerId: 'user:111222333',
          peerType: 'USER',
          threadId: null,
          displayName: 'Alice',
          lastMessageAt: '2026-03-08T11:59:00.000Z',
        },
      ],
    } as any);

    const store = useMessagingChannelBindingOptionsStore();
    const result = await store.loadPeerCandidates('discord-acct-1', undefined, 'DISCORD');

    expect(gatewayStore.loadPeerCandidates).toHaveBeenCalledWith('DISCORD', {
      includeGroups: undefined,
      limit: undefined,
    });
    expect(result).toHaveLength(1);
  });

  it('rejects peer discovery for WhatsApp business mode', async () => {
    const store = useMessagingChannelBindingOptionsStore();

    await expect(store.loadPeerCandidates('whatsapp-main', undefined, 'WHATSAPP')).rejects.toThrow(
      'Peer discovery is only available for Discord and Telegram in managed mode.',
    );
    expect(store.peerCandidatesError).toBe(
      'Peer discovery is only available for Discord and Telegram in managed mode.',
    );
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
        peerId: 'discord-peer-1',
        peerType: 'USER',
        threadId: null,
        displayName: 'Alice',
        lastMessageAt: '2026-03-08T11:59:00.000Z',
      },
    ];

    expect(() =>
      store.assertSelectionsFresh({
        draft: {
          provider: 'DISCORD',
          transport: 'BUSINESS_API',
          accountId: 'discord-acct-1',
          peerId: 'discord-peer-1',
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
  });
});
