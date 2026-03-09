import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ManagedGatewayRuntimeCard from '../ManagedGatewayRuntimeCard.vue';
import { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';

describe('ManagedGatewayRuntimeCard', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  it('renders lifecycle state and runtime endpoint persistently', () => {
    const store = useGatewaySessionSetupStore();
    store.gatewayStatus = 'READY';
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
      providerStatusByProvider: {},
      supportedProviders: ['WHATSAPP', 'WECOM', 'DISCORD', 'TELEGRAM'],
      excludedProviders: ['WECHAT'],
      diagnostics: {},
      runtimeReliabilityStatus: null,
      runtimeRunning: true,
    };

    const wrapper = mount(ManagedGatewayRuntimeCard, {
      global: {
        plugins: [pinia],
      },
    });

    expect(wrapper.get('[data-testid="gateway-status-badge"]').text()).toContain('RUNNING');
    expect(wrapper.get('[data-testid="managed-gateway-runtime-state"]').text()).toBe('Running');
    expect(wrapper.get('[data-testid="managed-gateway-active-version"]').text()).toBe('0.1.0');
    expect(wrapper.get('[data-testid="managed-gateway-port"]').text()).toBe('127.0.0.1:8010');
    expect(wrapper.get('[data-testid="managed-gateway-message"]').text()).toContain(
      'Managed messaging gateway is running.',
    );
    expect(wrapper.text()).toContain('Excluded providers: WECHAT');
  });

  it('uses install/start language when nothing is installed yet', () => {
    const wrapper = mount(ManagedGatewayRuntimeCard, {
      global: {
        plugins: [pinia],
      },
    });

    expect(wrapper.get('[data-testid="gateway-enable-button"]').text()).toContain(
      'Install and Start Gateway',
    );
    expect(wrapper.get('[data-testid="managed-gateway-port"]').text()).toBe('Not running');
  });
});
