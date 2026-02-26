import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useMessagingChannelBindingSetupStore } from '~/stores/messagingChannelBindingSetupStore';
import { useMessagingProviderFlowStore } from '~/stores/messagingProviderFlowStore';
import { useMessagingProviderScopeStore } from '~/stores/messagingProviderScopeStore';
import { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';

describe('messagingProviderFlowStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('stepStates returns READY states when WhatsApp prerequisites are ready', () => {
    const gatewayStore = useGatewaySessionSetupStore();
    const bindingStore = useMessagingChannelBindingSetupStore();
    const providerFlowStore = useMessagingProviderFlowStore();

    gatewayStore.gatewayStatus = 'READY';
    gatewayStore.setSessionProvider('WHATSAPP');
    gatewayStore.session = {
      sessionId: 'session-1',
      accountLabel: 'Home',
      status: 'ACTIVE',
    };

    bindingStore.capabilities.bindingCrudEnabled = true;
    bindingStore.bindings = [
      {
        id: 'binding-1',
        provider: 'WHATSAPP',
        transport: 'PERSONAL_SESSION',
        accountId: 'Home',
        peerId: 'peer-1',
        threadId: null,
        targetType: 'AGENT',
        targetId: 'agent-1',
        updatedAt: '2026-02-09T12:00:00.000Z',
      },
    ];

    const steps = providerFlowStore.stepStates;

    expect(steps.find((step) => step.key === 'gateway')?.status).toBe('READY');
    expect(steps.find((step) => step.key === 'personal_session')?.status).toBe('READY');
    expect(steps.find((step) => step.key === 'binding')?.status).toBe('READY');
  });

  it('stepStates keeps personal_session as PENDING before any session is started', () => {
    const gatewayStore = useGatewaySessionSetupStore();
    const bindingStore = useMessagingChannelBindingSetupStore();
    const providerFlowStore = useMessagingProviderFlowStore();

    gatewayStore.gatewayStatus = 'READY';
    gatewayStore.session = null;
    gatewayStore.personalModeBlockedReason = null;
    bindingStore.capabilities.bindingCrudEnabled = true;
    bindingStore.bindings = [];

    const steps = providerFlowStore.stepStates;
    const personalStep = steps.find((step) => step.key === 'personal_session');

    expect(personalStep?.status).toBe('PENDING');
    expect(personalStep?.detail).toBeUndefined();
  });

  it('keeps binding step pending until gateway/session prerequisites are completed', () => {
    const providerScopeStore = useMessagingProviderScopeStore();
    const gatewayStore = useGatewaySessionSetupStore();
    const bindingStore = useMessagingChannelBindingSetupStore();
    const providerFlowStore = useMessagingProviderFlowStore();

    providerScopeStore.initialize({
      wechatModes: ['WECOM_APP_BRIDGE'],
      defaultWeChatMode: 'WECOM_APP_BRIDGE',
      wechatPersonalEnabled: false,
      wecomAppEnabled: true,
      discordEnabled: true,
      discordAccountId: 'discord-1',
      telegramEnabled: false,
      telegramAccountId: null,
    });
    providerScopeStore.setSelectedProvider('DISCORD');

    gatewayStore.gatewayStatus = 'UNKNOWN';
    bindingStore.capabilities.bindingCrudEnabled = true;
    bindingStore.bindings = [
      {
        id: 'binding-1',
        provider: 'DISCORD',
        transport: 'BUSINESS_API',
        accountId: 'discord-1',
        peerId: 'user:1',
        threadId: null,
        targetType: 'AGENT',
        targetId: 'agent-1',
        updatedAt: '2026-02-09T12:00:00.000Z',
      },
    ];

    const steps = providerFlowStore.stepStates;
    expect(steps.find((step) => step.key === 'gateway')?.status).toBe('PENDING');
    expect(steps.find((step) => step.key === 'binding')?.status).toBe('PENDING');
  });

  it('uses provider-specific step order and skips session for WECOM scope', () => {
    const gatewayStore = useGatewaySessionSetupStore();
    const bindingStore = useMessagingChannelBindingSetupStore();
    const providerScopeStore = useMessagingProviderScopeStore();
    const providerFlowStore = useMessagingProviderFlowStore();

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

    gatewayStore.gatewayStatus = 'READY';
    gatewayStore.session = null;
    bindingStore.capabilities.bindingCrudEnabled = true;
    bindingStore.bindings = [
      {
        id: 'binding-1',
        provider: 'WECOM',
        transport: 'BUSINESS_API',
        accountId: 'wecom-account',
        peerId: 'peer-1',
        threadId: null,
        targetType: 'AGENT',
        targetId: 'agent-1',
        updatedAt: '2026-02-09T12:00:00.000Z',
      },
    ];

    const steps = providerFlowStore.stepStates;
    expect(steps.map((step) => step.key)).toEqual(['gateway', 'binding', 'verification']);
  });
});
