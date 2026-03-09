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

  it('shows reliability heartbeat and queue summary when runtime reliability is available', () => {
    const store = useGatewaySessionSetupStore();
    store.runtimeReliabilityStatus = {
      runtime: {
        state: 'HEALTHY',
        criticalCode: null,
        updatedAt: '2026-03-09T10:00:00.000Z',
        workers: {
          inboundForwarder: { running: true, lastError: null, lastErrorAt: null },
          outboundSender: { running: true, lastError: null, lastErrorAt: null },
        },
        locks: {
          inbox: {
            ownerId: 'inbox-owner',
            held: true,
            lost: false,
            lastHeartbeatAt: '2026-03-09T10:00:00.000Z',
            lastError: null,
          },
          outbox: {
            ownerId: 'outbox-owner',
            held: true,
            lost: false,
            lastHeartbeatAt: '2026-03-09T10:00:01.000Z',
            lastError: null,
          },
        },
      },
      queue: {
        inboundDeadLetterCount: 0,
        inboundCompletedUnboundCount: 1,
        outboundDeadLetterCount: 0,
      },
    };

    const wrapper = mount(ManagedGatewayRuntimeCard, {
      global: {
        plugins: [pinia],
      },
    });

    expect(wrapper.get('[data-testid="managed-gateway-reliability-summary"]').text()).toContain(
      'Queue heartbeat',
    );
    expect(wrapper.get('[data-testid="managed-gateway-reliability-state"]').text()).toBe('HEALTHY');
    expect(wrapper.text()).toContain('Inbound dead-letter 0');
    expect(wrapper.text()).toContain('unbound 1');
  });

  it('surfaces actionable recovery details when the gateway lifecycle is blocked', async () => {
    const store = useGatewaySessionSetupStore();
    store.gatewayStatus = 'BLOCKED';
    store.providerStatusByProvider = {
      TELEGRAM: {
        provider: 'TELEGRAM',
        supported: true,
        selectedTransport: 'BUSINESS_API',
        configured: true,
        effectivelyEnabled: false,
        blockedReason: 'Telegram polling conflict detected.',
        accountId: 'telegram-acct',
      },
    };
    store.managedStatus = {
      supported: true,
      enabled: true,
      lifecycleState: 'BLOCKED',
      message: 'Managed messaging gateway exited unexpectedly.',
      lastError: 'Process exit detected (code=1, signal=null).',
      activeVersion: '0.1.0',
      desiredVersion: '0.1.0',
      releaseTag: 'v-test-1',
      installedVersions: ['0.1.0'],
      bindHost: null,
      bindPort: null,
      pid: null,
      providerConfig: store.providerConfig,
      providerStatusByProvider: store.providerStatusByProvider,
      supportedProviders: ['WHATSAPP', 'WECOM', 'DISCORD', 'TELEGRAM'],
      excludedProviders: ['WECHAT'],
      diagnostics: {},
      runtimeReliabilityStatus: null,
      runtimeRunning: false,
    };

    const wrapper = mount(ManagedGatewayRuntimeCard, {
      global: {
        plugins: [pinia],
      },
    });

    expect(wrapper.get('[data-testid="gateway-enable-button"]').text()).toContain(
      'Recover Gateway',
    );
    expect(wrapper.get('[data-testid="managed-gateway-last-error"]').text()).toContain(
      'Process exit detected',
    );
    expect(wrapper.get('[data-testid="managed-gateway-recovery-hint"]').text()).toContain(
      'recover without reinstalling',
    );
    expect(wrapper.get('[data-testid="managed-gateway-provider-issues"]').text()).toContain(
      'TELEGRAM: Telegram polling conflict detected.',
    );
  });
});
