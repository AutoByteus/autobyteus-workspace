import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import MessagingSetupManager from '../MessagingSetupManager.vue';
import { useMessagingChannelBindingSetupStore } from '~/stores/messagingChannelBindingSetupStore';
import { useGatewayCapabilityStore } from '~/stores/gatewayCapabilityStore';
import { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';
import { useMessagingProviderScopeStore } from '~/stores/messagingProviderScopeStore';

describe('MessagingSetupManager', () => {
  let pinia: ReturnType<typeof createPinia>;
  const capabilitiesFixture = {
    whatsappBusinessEnabled: true,
    wechatModes: ['WECOM_APP_BRIDGE'],
    defaultWeChatMode: 'WECOM_APP_BRIDGE',
    wecomAppEnabled: true,
    wechatPersonalEnabled: false,
    discordEnabled: true,
    discordAccountId: 'discord-1',
    telegramEnabled: true,
    telegramAccountId: 'telegram-1',
  };

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
  });

  it('bootstraps setup stores on mount', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    const capabilityStore = useGatewayCapabilityStore();
    const bindingStore = useMessagingChannelBindingSetupStore();

    const initSpy = vi.spyOn(gatewayStore, 'initializeFromConfig').mockImplementation(() => {});
    const refreshStatusSpy = vi
      .spyOn(gatewayStore, 'refreshManagedGatewayStatus')
      .mockResolvedValue(null);
    const loadGatewayCapabilitiesSpy = vi
      .spyOn(capabilityStore, 'loadCapabilities')
      .mockImplementation(async () => {
        capabilityStore.capabilities = { ...capabilitiesFixture };
        return { ...capabilitiesFixture };
      });
    const loadWeComAccountsSpy = vi.spyOn(capabilityStore, 'loadWeComAccounts').mockResolvedValue([]);
    const loadCapabilitiesSpy = vi
      .spyOn(bindingStore, 'loadCapabilities')
      .mockResolvedValue({ bindingCrudEnabled: true, reason: undefined });
    const loadBindingsSpy = vi.spyOn(bindingStore, 'loadBindingsIfEnabled').mockResolvedValue([]);

    mount(MessagingSetupManager, {
      global: {
        plugins: [pinia],
      },
    });
    await flushPromises();

    expect(initSpy).toHaveBeenCalledTimes(1);
    expect(refreshStatusSpy).toHaveBeenCalledTimes(1);
    expect(loadGatewayCapabilitiesSpy).toHaveBeenCalledTimes(1);
    expect(loadWeComAccountsSpy).toHaveBeenCalledTimes(1);
    expect(loadCapabilitiesSpy).toHaveBeenCalledTimes(1);
    expect(loadBindingsSpy).toHaveBeenCalledTimes(1);
  });

  it('stops session auto sync on unmount', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    const capabilityStore = useGatewayCapabilityStore();
    const bindingStore = useMessagingChannelBindingSetupStore();

    vi.spyOn(gatewayStore, 'initializeFromConfig').mockImplementation(() => {});
    vi.spyOn(gatewayStore, 'refreshManagedGatewayStatus').mockResolvedValue(null);
    vi.spyOn(capabilityStore, 'loadCapabilities').mockImplementation(async () => {
      capabilityStore.capabilities = { ...capabilitiesFixture };
      return { ...capabilitiesFixture };
    });
    vi.spyOn(capabilityStore, 'loadWeComAccounts').mockResolvedValue([]);
    vi.spyOn(bindingStore, 'loadCapabilities').mockResolvedValue({
      bindingCrudEnabled: true,
      reason: undefined,
    });
    vi.spyOn(bindingStore, 'loadBindingsIfEnabled').mockResolvedValue([]);
    const stopSyncSpy = vi
      .spyOn(gatewayStore, 'stopSessionStatusAutoSync')
      .mockImplementation(() => {});

    const wrapper = mount(MessagingSetupManager, {
      global: {
        plugins: [pinia],
      },
    });
    await flushPromises();

    wrapper.unmount();
    expect(stopSyncSpy).toHaveBeenCalledWith('view_unmounted');
  });

  it('keeps provider configuration visible and synchronizes managed account hints', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    const capabilityStore = useGatewayCapabilityStore();
    const bindingStore = useMessagingChannelBindingSetupStore();
    const providerScopeStore = useMessagingProviderScopeStore();

    vi.spyOn(gatewayStore, 'initializeFromConfig').mockImplementation(() => {});
    vi.spyOn(gatewayStore, 'refreshManagedGatewayStatus').mockResolvedValue(null);
    vi.spyOn(capabilityStore, 'loadCapabilities').mockImplementation(async () => {
      capabilityStore.capabilities = { ...capabilitiesFixture };
      return { ...capabilitiesFixture };
    });
    vi.spyOn(capabilityStore, 'loadWeComAccounts').mockResolvedValue([]);
    vi.spyOn(bindingStore, 'loadCapabilities').mockResolvedValue({
      bindingCrudEnabled: true,
      reason: undefined,
    });
    vi.spyOn(bindingStore, 'loadBindingsIfEnabled').mockResolvedValue([]);

    const wrapper = mount(MessagingSetupManager, {
      global: {
        plugins: [pinia],
      },
    });
    await flushPromises();

    expect(wrapper.find('[data-testid="managed-provider-config-section"]').exists()).toBe(true);

    gatewayStore.managedStatus = {
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
      pid: 1234,
      providerConfig: gatewayStore.providerConfig,
      providerStatusByProvider: {
        TELEGRAM: {
          provider: 'TELEGRAM',
          supported: true,
          selectedTransport: 'BUSINESS_API',
          configured: true,
          effectivelyEnabled: true,
          blockedReason: null,
          accountId: 'telegram-main',
        },
      },
      supportedProviders: ['WHATSAPP', 'WECOM', 'DISCORD', 'TELEGRAM'],
      excludedProviders: ['WECHAT'],
      diagnostics: {},
      runtimeReliabilityStatus: null,
      runtimeRunning: true,
    };
    await nextTick();

    expect(providerScopeStore.telegramAccountId).toBe('telegram-main');
  });

});
