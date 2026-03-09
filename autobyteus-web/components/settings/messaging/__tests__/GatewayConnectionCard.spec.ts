import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import GatewayConnectionCard from '../GatewayConnectionCard.vue';
import { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';
import { useMessagingProviderScopeStore } from '~/stores/messagingProviderScopeStore';

describe('GatewayConnectionCard', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  it('renders provider-specific configuration for the selected provider', () => {
    const store = useGatewaySessionSetupStore();
    const providerScopeStore = useMessagingProviderScopeStore();
    providerScopeStore.selectedProvider = 'DISCORD';
    store.managedStatus = {
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
      pid: 1234,
      providerConfig: store.providerConfig,
      providerStatusByProvider: {
        DISCORD: {
          provider: 'DISCORD',
          supported: true,
          selectedTransport: 'BUSINESS_API',
          configured: true,
          effectivelyEnabled: true,
          blockedReason: null,
          accountId: 'discord-1',
        },
      },
      supportedProviders: ['WHATSAPP', 'WECOM', 'DISCORD', 'TELEGRAM'],
      excludedProviders: ['WECHAT'],
      diagnostics: {},
      runtimeReliabilityStatus: null,
      runtimeRunning: true,
    };

    const wrapper = mount(GatewayConnectionCard, {
      global: {
        plugins: [pinia],
      },
    });

    expect(wrapper.text()).toContain('Discord Bot Configuration');
    expect(wrapper.find('[data-testid="provider-discord-token"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="provider-whatsapp-secret"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Excluded providers: WECHAT');
  });

  it('surfaces provider blocking feedback for the selected provider', () => {
    const store = useGatewaySessionSetupStore();
    const providerScopeStore = useMessagingProviderScopeStore();
    providerScopeStore.selectedProvider = 'TELEGRAM';
    store.providerStatusByProvider = {
      TELEGRAM: {
        provider: 'TELEGRAM',
        supported: true,
        selectedTransport: 'BUSINESS_API',
        configured: false,
        effectivelyEnabled: false,
        blockedReason: 'Gateway runtime must be started before peer discovery is available.',
        accountId: null,
      },
    };

    const wrapper = mount(GatewayConnectionCard, {
      global: {
        plugins: [pinia],
      },
    });

    expect(wrapper.get('[data-testid="gateway-provider-blocked"]').text()).toContain(
      'Gateway runtime must be started before peer discovery is available.',
    );
  });

  it('renders Telegram as a managed polling-only configuration surface', () => {
    const store = useGatewaySessionSetupStore();
    const providerScopeStore = useMessagingProviderScopeStore();
    providerScopeStore.selectedProvider = 'TELEGRAM';
    store.providerStatusByProvider = {
      TELEGRAM: {
        provider: 'TELEGRAM',
        supported: true,
        selectedTransport: 'BUSINESS_API',
        configured: true,
        effectivelyEnabled: true,
        blockedReason: null,
        accountId: 'telegram-main',
      },
    };

    const wrapper = mount(GatewayConnectionCard, {
      global: {
        plugins: [pinia],
      },
    });

    expect(wrapper.text()).toContain('Managed Telegram uses polling mode.');
    expect(wrapper.text()).toContain('Saving valid config makes Telegram active automatically');
    expect(
      wrapper.get('[data-testid="provider-telegram-account-id"]').attributes('placeholder'),
    ).toContain('Telegram account label');
    expect(wrapper.find('[data-testid="provider-telegram-webhook-secret"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="provider-telegram-enabled"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Webhook Enabled');
  });

  it('does not expose legacy raw gateway URL fields', () => {
    const providerScopeStore = useMessagingProviderScopeStore();
    const store = useGatewaySessionSetupStore();
    providerScopeStore.selectedProvider = 'WHATSAPP';
    store.managedStatus = {
      supported: true,
      enabled: false,
      lifecycleState: 'DISABLED',
      message: null,
      lastError: null,
      activeVersion: null,
      desiredVersion: null,
      releaseTag: null,
      installedVersions: [],
      bindHost: null,
      bindPort: null,
      pid: null,
      providerConfig: store.providerConfig,
      providerStatusByProvider: {},
      supportedProviders: ['WHATSAPP', 'WECOM', 'DISCORD', 'TELEGRAM'],
      excludedProviders: ['WECHAT'],
      diagnostics: {},
      runtimeReliabilityStatus: null,
      runtimeRunning: false,
    };

    const wrapper = mount(GatewayConnectionCard, {
      global: {
        plugins: [pinia],
      },
    });

    expect(wrapper.text()).toContain('Configuration');
    expect(wrapper.text()).not.toContain('Validate Connection');
    expect(wrapper.text()).not.toContain('Gateway URL');
    expect(wrapper.find('input[placeholder="WhatsApp Business secret"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Excluded providers: WECHAT');
  });
});
