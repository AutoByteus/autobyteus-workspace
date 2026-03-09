import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';
import { getApolloClient } from '~/utils/apolloClient';

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(),
}));

function buildStatus(overrides: Record<string, unknown> = {}) {
  return {
    supported: true,
    enabled: true,
    lifecycleState: 'RUNNING',
    message: 'Managed messaging gateway is running.',
    lastError: null,
    activeVersion: '0.1.0',
    desiredVersion: '0.1.0',
    releaseTag: 'v-test-1',
    installedVersions: ['0.1.0'],
    bindHost: '127.0.0.1',
    bindPort: 8010,
    pid: 4321,
    providerConfig: {
      whatsappBusinessEnabled: true,
      whatsappBusinessSecret: 'wa-secret',
      wecomAppEnabled: true,
      wecomWebhookToken: 'wecom-token',
      wecomAppAccounts: [{ accountId: 'wecom-main', label: 'WeCom Main', mode: 'APP' }],
      discordEnabled: true,
      discordBotToken: 'discord-token',
      discordAccountId: 'discord-acct',
      discordDiscoveryMaxCandidates: 100,
      discordDiscoveryTtlSeconds: 300,
      telegramEnabled: true,
      telegramBotToken: 'telegram-token',
      telegramAccountId: 'telegram-acct',
      telegramPollingEnabled: true,
      telegramWebhookEnabled: false,
      telegramWebhookSecretToken: '',
    },
    providerStatusByProvider: {
      WHATSAPP: {
        provider: 'WHATSAPP',
        supported: true,
        selectedTransport: 'BUSINESS_API',
        configured: true,
        effectivelyEnabled: true,
        blockedReason: null,
        accountId: null,
      },
      WECOM: {
        provider: 'WECOM',
        supported: true,
        selectedTransport: 'BUSINESS_API',
        configured: true,
        effectivelyEnabled: true,
        blockedReason: null,
        accountId: 'wecom-main',
      },
      DISCORD: {
        provider: 'DISCORD',
        supported: true,
        selectedTransport: 'BUSINESS_API',
        configured: true,
        effectivelyEnabled: true,
        blockedReason: null,
        accountId: 'discord-acct',
      },
      TELEGRAM: {
        provider: 'TELEGRAM',
        supported: true,
        selectedTransport: 'BUSINESS_API',
        configured: true,
        effectivelyEnabled: true,
        blockedReason: null,
        accountId: 'telegram-acct',
      },
    },
    supportedProviders: ['WHATSAPP', 'WECOM', 'DISCORD', 'TELEGRAM'],
    excludedProviders: ['WECHAT'],
    diagnostics: {
      logsRoot: '/tmp/logs',
    },
    runtimeReliabilityStatus: {
      runtime: {
        state: 'HEALTHY',
        criticalCode: null,
        updatedAt: '2026-03-08T12:00:00.000Z',
        workers: {
          inboundForwarder: { running: true, lastError: null, lastErrorAt: null },
          outboundSender: { running: true, lastError: null, lastErrorAt: null },
        },
        locks: {
          inbox: {
            ownerId: 'lock-1',
            held: true,
            lost: false,
            lastHeartbeatAt: '2026-03-08T12:00:00.000Z',
            lastError: null,
          },
          outbox: {
            ownerId: 'lock-2',
            held: true,
            lost: false,
            lastHeartbeatAt: '2026-03-08T12:00:00.000Z',
            lastError: null,
          },
        },
      },
      queue: {
        inboundDeadLetterCount: 0,
        inboundCompletedUnboundCount: 0,
        outboundDeadLetterCount: 0,
      },
    },
    runtimeRunning: true,
    ...overrides,
  };
}

describe('gatewaySessionSetupStore', () => {
  const apolloMock = {
    query: vi.fn(),
    mutate: vi.fn(),
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(getApolloClient).mockReturnValue(apolloMock as any);
  });

  it('refreshes managed gateway status through GraphQL and updates readiness', async () => {
    apolloMock.query.mockResolvedValue({
      data: {
        managedMessagingGatewayStatus: buildStatus(),
      },
      errors: [],
    });

    const store = useGatewaySessionSetupStore();
    const status = await store.refreshManagedGatewayStatus();

    expect(apolloMock.query).toHaveBeenCalledOnce();
    expect(status?.activeVersion).toBe('0.1.0');
    expect(store.gatewayReady).toBe(true);
    expect(store.managedStatus?.bindPort).toBe(8010);
    expect(store.providerConfig.wecomAppAccounts).toEqual([
      { accountId: 'wecom-main', label: 'WeCom Main', mode: 'APP' },
    ]);
  });

  it('enables the managed gateway through GraphQL mutation', async () => {
    apolloMock.mutate.mockResolvedValue({
      data: {
        enableManagedMessagingGateway: buildStatus({
          lifecycleState: 'RUNNING',
          activeVersion: '0.1.0',
        }),
      },
      errors: [],
    });

    const store = useGatewaySessionSetupStore();
    const status = await store.enableManagedGateway();

    expect(apolloMock.mutate).toHaveBeenCalledOnce();
    expect(status.activeVersion).toBe('0.1.0');
    expect(store.gatewayStatus).toBe('READY');
  });

  it('saves provider configuration using the server-owned boundary', async () => {
    apolloMock.mutate.mockResolvedValue({
      data: {
        saveManagedMessagingGatewayProviderConfig: buildStatus({
          providerConfig: {
            ...buildStatus().providerConfig,
            discordAccountId: 'discord-updated',
          },
          providerStatusByProvider: {
            ...buildStatus().providerStatusByProvider,
            DISCORD: {
              provider: 'DISCORD',
              supported: true,
              selectedTransport: 'BUSINESS_API',
              configured: true,
              effectivelyEnabled: true,
              blockedReason: null,
              accountId: 'discord-updated',
            },
          },
        }),
      },
      errors: [],
    });

    const store = useGatewaySessionSetupStore();
    store.providerConfig.discordAccountId = 'discord-updated';

    await store.saveManagedGatewayProviderConfig();

    expect(apolloMock.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          input: expect.objectContaining({
            discordAccountId: 'discord-updated',
          }),
        },
      }),
    );
    expect(store.providerConfig.discordAccountId).toBe('discord-updated');
  });

  it('normalizes non-WeChat provider flags to active when saving config', async () => {
    apolloMock.mutate.mockResolvedValue({
      data: {
        saveManagedMessagingGatewayProviderConfig: buildStatus({
          providerConfig: {
            ...buildStatus().providerConfig,
            telegramEnabled: true,
          },
        }),
      },
      errors: [],
    });

    const store = useGatewaySessionSetupStore();

    await store.saveManagedGatewayProviderConfig({
      telegramEnabled: false,
      telegramBotToken: 'telegram-token',
      telegramAccountId: 'telegram-main',
      discordEnabled: false,
    });

    expect(apolloMock.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          input: expect.objectContaining({
            telegramEnabled: true,
            telegramBotToken: 'telegram-token',
            telegramAccountId: 'telegram-main',
            discordEnabled: true,
          }),
        },
      }),
    );
  });

  it('loads Discord peer candidates through GraphQL', async () => {
    apolloMock.query.mockResolvedValue({
      data: {
        managedMessagingGatewayPeerCandidates: {
          accountId: 'discord-acct',
          updatedAt: '2026-03-08T12:00:00.000Z',
          items: [
            {
              peerId: 'discord-peer-1',
              peerType: 'USER',
              threadId: null,
              displayName: 'Discord Peer 1',
              lastMessageAt: '2026-03-08T12:00:00.000Z',
            },
          ],
        },
      },
      errors: [],
    });

    const store = useGatewaySessionSetupStore();
    const response = await store.loadPeerCandidates('DISCORD', {
      includeGroups: true,
      limit: 25,
    });

    expect(apolloMock.query).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          provider: 'DISCORD',
          includeGroups: true,
          limit: 25,
        },
      }),
    );
    expect(response.accountId).toBe('discord-acct');
    expect(response.items).toHaveLength(1);
  });
});
