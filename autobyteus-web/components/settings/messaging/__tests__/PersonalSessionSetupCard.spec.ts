import { beforeEach, describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PersonalSessionSetupCard from '../PersonalSessionSetupCard.vue';
import { useMessagingProviderScopeStore } from '~/stores/messagingProviderScopeStore';
import { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';

describe('PersonalSessionSetupCard', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  it('shows not-required state for WECOM scope', async () => {
    const providerScopeStore = useMessagingProviderScopeStore();
    providerScopeStore.initialize({
      wechatModes: ['WECOM_APP_BRIDGE'],
      defaultWeChatMode: 'WECOM_APP_BRIDGE',
      wechatPersonalEnabled: false,
      wecomAppEnabled: true,
      discordEnabled: false,
      discordAccountId: null,
      telegramEnabled: false,
      telegramAccountId: null,
    });
    providerScopeStore.setSelectedProvider('WECOM');

    const wrapper = mount(PersonalSessionSetupCard, {
      global: {
        plugins: [pinia],
      },
    });
    await flushPromises();

    expect(wrapper.find('[data-testid="personal-session-not-required"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="start-session-button"]').exists()).toBe(false);
  });

  it('renders WeChat session copy when session provider is WECHAT', async () => {
    const providerScopeStore = useMessagingProviderScopeStore();
    const gatewayStore = useGatewaySessionSetupStore();

    providerScopeStore.$patch({
      availableProviders: ['WHATSAPP', 'WECHAT'],
      selectedProvider: 'WECHAT',
      initialized: true,
    });

    const wrapper = mount(PersonalSessionSetupCard, {
      global: {
        plugins: [pinia],
      },
    });
    await flushPromises();

    const accountInput = wrapper.get('[data-testid="session-account-label"]');
    expect(accountInput.attributes('placeholder')).toBe('Account label (e.g. Home WeChat)');
    expect(wrapper.text()).toContain('WeChat Personal Session');
    expect(gatewayStore.sessionProvider).toBe('WECHAT');
  });

  it('shows Discord business-mode copy when provider scope is DISCORD', async () => {
    const providerScopeStore = useMessagingProviderScopeStore();

    providerScopeStore.initialize({
      wechatModes: [],
      defaultWeChatMode: null,
      wechatPersonalEnabled: false,
      wecomAppEnabled: false,
      discordEnabled: true,
      discordAccountId: 'discord-acct-1',
      telegramEnabled: false,
      telegramAccountId: null,
    });
    providerScopeStore.setSelectedProvider('DISCORD');

    const wrapper = mount(PersonalSessionSetupCard, {
      global: {
        plugins: [pinia],
      },
    });
    await flushPromises();

    expect(wrapper.find('[data-testid="personal-session-not-required"]').text()).toContain(
      'Discord Bot',
    );
    expect(wrapper.text()).toContain('Discord Bot Bridge');
  });
});
