import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useGatewayCapabilityStore } from '~/stores/gatewayCapabilityStore';
import { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';

describe('gatewayCapabilityStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('maps managed gateway status into provider capability flags', async () => {
    const sessionStore = useGatewaySessionSetupStore();
    vi.spyOn(sessionStore, 'refreshManagedGatewayStatus').mockResolvedValue({
      supported: true,
      enabled: true,
      lifecycleState: 'RUNNING',
      message: null,
      lastError: null,
      activeVersion: '0.1.0',
      desiredVersion: '0.1.0',
      releaseTag: 'v-test-1',
      installedVersions: ['0.1.0'],
      bindHost: '127.0.0.1',
      bindPort: 8010,
      pid: 1111,
      providerConfig: sessionStore.providerConfig,
      providerStatusByProvider: {
        DISCORD: {
          provider: 'DISCORD',
          supported: true,
          selectedTransport: 'BUSINESS_API',
          configured: true,
          effectivelyEnabled: true,
          blockedReason: null,
          accountId: 'discord-acct-1',
        },
        TELEGRAM: {
          provider: 'TELEGRAM',
          supported: true,
          selectedTransport: 'BUSINESS_API',
          configured: true,
          effectivelyEnabled: true,
          blockedReason: null,
          accountId: 'telegram-acct-1',
        },
      },
      supportedProviders: ['WHATSAPP', 'WECOM', 'DISCORD', 'TELEGRAM'],
      excludedProviders: ['WECHAT'],
      diagnostics: {},
      runtimeReliabilityStatus: null,
      runtimeRunning: true,
    } as any);

    const store = useGatewayCapabilityStore();
    const capabilities = await store.loadCapabilities();

    expect(capabilities.whatsappBusinessEnabled).toBe(true);
    expect(capabilities.wechatPersonalEnabled).toBe(false);
    expect(capabilities.discordEnabled).toBe(true);
    expect(capabilities.discordAccountId).toBe('discord-acct-1');
    expect(capabilities.telegramEnabled).toBe(true);
    expect(capabilities.telegramAccountId).toBe('telegram-acct-1');
  });

  it('loads wecom accounts through the managed session store', async () => {
    const sessionStore = useGatewaySessionSetupStore();
    vi.spyOn(sessionStore, 'loadWeComAccounts').mockResolvedValue([
      {
        accountId: 'corp-main',
        label: 'Corporate Main',
        mode: 'APP',
      },
    ]);

    const store = useGatewayCapabilityStore();
    const accounts = await store.loadWeComAccounts();

    expect(accounts).toEqual([
      {
        accountId: 'corp-main',
        label: 'Corporate Main',
        mode: 'APP',
      },
    ]);
  });
});
