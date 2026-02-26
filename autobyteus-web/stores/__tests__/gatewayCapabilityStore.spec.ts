import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useGatewayCapabilityStore } from '~/stores/gatewayCapabilityStore';
import { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';
import { GatewayClientError } from '~/services/messagingGatewayClient';

const { gatewayClientMock, createGatewayClientMock } = vi.hoisted(() => {
  const client = {
    getCapabilities: vi.fn(),
    getWeComAccounts: vi.fn(),
  };
  return {
    gatewayClientMock: client,
    createGatewayClientMock: vi.fn(() => client),
  };
});

vi.mock('~/services/messagingGatewayClient', () => ({
  createMessagingGatewayClient: createGatewayClientMock,
  GatewayClientError: class GatewayClientError extends Error {
    statusCode: number | null;

    code: string | null;

    details: { sessionId?: string } | null;

    constructor(
      message: string,
      statusCode: number | null,
      code: string | null,
      details: { sessionId?: string } | null = null,
    ) {
      super(message);
      this.name = 'GatewayClientError';
      this.statusCode = statusCode;
      this.code = code;
      this.details = details;
    }
  },
}));

describe('gatewayCapabilityStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('loads capabilities using gateway session config as source-of-truth', async () => {
    gatewayClientMock.getCapabilities.mockResolvedValue({
      wechatModes: ['WECOM_APP_BRIDGE'],
      defaultWeChatMode: 'WECOM_APP_BRIDGE',
      wecomAppEnabled: true,
      wechatPersonalEnabled: false,
      discordEnabled: true,
      discordAccountId: 'discord-acct-1',
      telegramEnabled: true,
      telegramAccountId: 'telegram-acct-1',
    });

    const sessionStore = useGatewaySessionSetupStore();
    sessionStore.gatewayBaseUrl = 'http://localhost:8010';
    sessionStore.gatewayAdminToken = 'admin-token';

    const store = useGatewayCapabilityStore();
    await store.loadCapabilities();

    expect(createGatewayClientMock).toHaveBeenCalledWith({
      baseUrl: 'http://localhost:8010',
      adminToken: 'admin-token',
    });
    expect(store.capabilities?.defaultWeChatMode).toBe('WECOM_APP_BRIDGE');
    expect(store.capabilities?.discordEnabled).toBe(true);
    expect(store.capabilities?.discordAccountId).toBe('discord-acct-1');
    expect(store.capabilities?.telegramEnabled).toBe(true);
    expect(store.capabilities?.telegramAccountId).toBe('telegram-acct-1');
  });

  it('loads wecom accounts from gateway', async () => {
    gatewayClientMock.getWeComAccounts.mockResolvedValue({
      items: [
        {
          accountId: 'corp-main',
          label: 'Corporate Main',
          mode: 'APP',
        },
      ],
    });

    const sessionStore = useGatewaySessionSetupStore();
    sessionStore.gatewayBaseUrl = 'http://localhost:8010';

    const store = useGatewayCapabilityStore();
    await store.loadWeComAccounts();

    expect(store.accounts).toEqual([
      {
        accountId: 'corp-main',
        label: 'Corporate Main',
        mode: 'APP',
      },
    ]);
  });

  it('surfaces capability errors as user-readable messages', async () => {
    gatewayClientMock.getCapabilities.mockRejectedValue(
      new GatewayClientError('gateway unavailable', 503, 'GATEWAY_UNAVAILABLE'),
    );

    const sessionStore = useGatewaySessionSetupStore();
    sessionStore.gatewayBaseUrl = 'http://localhost:8010';

    const store = useGatewayCapabilityStore();

    await expect(store.loadCapabilities()).rejects.toThrow('gateway unavailable');
    expect(store.capabilitiesError).toBe('gateway unavailable');
  });

  it('normalizes missing discord fields to safe defaults', async () => {
    gatewayClientMock.getCapabilities.mockResolvedValue({
      wechatModes: ['WECOM_APP_BRIDGE'],
      defaultWeChatMode: 'WECOM_APP_BRIDGE',
      wecomAppEnabled: true,
      wechatPersonalEnabled: false,
    });

    const sessionStore = useGatewaySessionSetupStore();
    sessionStore.gatewayBaseUrl = 'http://localhost:8010';

    const store = useGatewayCapabilityStore();
    const capabilities = await store.loadCapabilities();

    expect(capabilities.discordEnabled).toBe(false);
    expect(capabilities.discordAccountId).toBeNull();
    expect(capabilities.telegramEnabled).toBe(false);
    expect(capabilities.telegramAccountId).toBeNull();
  });
});
