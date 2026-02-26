import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MessagingSetupManager from '../MessagingSetupManager.vue';
import { useMessagingChannelBindingSetupStore } from '~/stores/messagingChannelBindingSetupStore';
import { useMessagingChannelBindingOptionsStore } from '~/stores/messagingChannelBindingOptionsStore';
import { useGatewayCapabilityStore } from '~/stores/gatewayCapabilityStore';
import { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';

describe('MessagingSetupManager', () => {
  let pinia: ReturnType<typeof createPinia>;
  const capabilitiesFixture = {
    wechatModes: ['WECOM_APP_BRIDGE'] as const,
    defaultWeChatMode: 'WECOM_APP_BRIDGE' as const,
    wecomAppEnabled: true,
    wechatPersonalEnabled: true,
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
    const optionsStore = useMessagingChannelBindingOptionsStore();

    const initSpy = vi.spyOn(gatewayStore, 'initializeFromConfig').mockImplementation(() => {});
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
    const loadTargetOptionsSpy = vi.spyOn(optionsStore, 'loadTargetOptions').mockResolvedValue([]);

    mount(MessagingSetupManager, {
      global: {
        plugins: [pinia],
      },
    });
    await flushPromises();

    expect(initSpy).toHaveBeenCalledTimes(1);
    expect(loadGatewayCapabilitiesSpy).toHaveBeenCalledTimes(1);
    expect(loadWeComAccountsSpy).toHaveBeenCalledTimes(1);
    expect(loadCapabilitiesSpy).toHaveBeenCalledTimes(1);
    expect(loadBindingsSpy).toHaveBeenCalledTimes(1);
    expect(loadTargetOptionsSpy).toHaveBeenCalledTimes(1);
  });

  it('stops session auto sync on unmount', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    const capabilityStore = useGatewayCapabilityStore();
    const bindingStore = useMessagingChannelBindingSetupStore();
    const optionsStore = useMessagingChannelBindingOptionsStore();

    vi.spyOn(gatewayStore, 'initializeFromConfig').mockImplementation(() => {});
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
    vi.spyOn(optionsStore, 'loadTargetOptions').mockResolvedValue([]);
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

});
