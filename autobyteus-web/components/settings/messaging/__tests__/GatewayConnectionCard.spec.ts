import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import GatewayConnectionCard from '../GatewayConnectionCard.vue';
import { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';

describe('GatewayConnectionCard', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  it('renders managed lifecycle state and runtime diagnostics', () => {
    const store = useGatewaySessionSetupStore();
    store.gatewayStatus = 'READY';
    store.managedStatus = {
      supported: true,
      enabled: true,
      lifecycleState: 'STARTING',
      message: 'Installing managed messaging gateway runtime.',
      lastError: null,
      activeVersion: '0.1.0',
      desiredVersion: '0.1.0',
      releaseTag: 'v-test-1',
      installedVersions: ['0.1.0'],
      bindHost: '127.0.0.1',
      bindPort: 8010,
      pid: 1234,
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

    expect(wrapper.get('[data-testid="gateway-status-badge"]').text()).toContain('STARTING');
    expect(wrapper.get('[data-testid="managed-gateway-active-version"]').text()).toBe('0.1.0');
    expect(wrapper.get('[data-testid="managed-gateway-port"]').text()).toBe('127.0.0.1:8010');
    expect(wrapper.get('[data-testid="managed-gateway-message"]').text()).toContain(
      'Installing managed messaging gateway runtime.',
    );
    expect(wrapper.text()).toContain('Excluded providers: WECHAT');
  });

  it('does not expose the legacy raw gateway URL or validate-connection flow', () => {
    const wrapper = mount(GatewayConnectionCard, {
      global: {
        plugins: [pinia],
      },
    });

    expect(wrapper.text()).toContain('Managed Messaging Gateway');
    expect(wrapper.text()).not.toContain('Validate Connection');
    expect(wrapper.text()).not.toContain('Gateway URL');
    expect(wrapper.find('input[placeholder="WhatsApp Business secret"]').exists()).toBe(true);
  });
});
