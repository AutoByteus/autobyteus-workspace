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

  it('stepStates returns READY binding state when WhatsApp business prerequisites are ready', () => {
    const bindingStore = useMessagingChannelBindingSetupStore();
    const providerFlowStore = useMessagingProviderFlowStore();
    const gatewayStore = useGatewaySessionSetupStore();

    gatewayStore.gatewayStatus = 'READY';
    bindingStore.capabilities.bindingCrudEnabled = true;
    bindingStore.bindings = [
      {
        id: 'binding-1',
        provider: 'WHATSAPP',
        transport: 'BUSINESS_API',
        accountId: 'whatsapp-business',
        peerId: 'peer-1',
        threadId: null,
        targetType: 'AGENT',
        targetAgentDefinitionId: 'agent-definition-1',
        launchPreset: {
          workspaceRootPath: '/tmp/workspace',
          llmModelIdentifier: 'gpt-test',
          runtimeKind: 'AUTOBYTEUS',
          autoExecuteTools: false,
          skillAccessMode: 'PRELOADED_ONLY',
          llmConfig: null,
        },
        updatedAt: '2026-02-09T12:00:00.000Z',
      },
    ];

    const steps = providerFlowStore.stepStates;

    expect(steps.map((step) => step.key)).toEqual(['binding', 'verification']);
    expect(steps.find((step) => step.key === 'binding')?.status).toBe('READY');
    expect(steps.find((step) => step.key === 'verification')?.status).toBe('PENDING');
  });

  it('stepStates keeps personal_session as PENDING before any WeChat session is started', () => {
    const gatewayStore = useGatewaySessionSetupStore();
    const bindingStore = useMessagingChannelBindingSetupStore();
    const providerFlowStore = useMessagingProviderFlowStore();
    const providerScopeStore = useMessagingProviderScopeStore();

    providerScopeStore.initialize({
      wechatModes: ['DIRECT_PERSONAL_SESSION'],
      defaultWeChatMode: 'DIRECT_PERSONAL_SESSION',
      wechatPersonalEnabled: true,
      wecomAppEnabled: true,
      discordEnabled: false,
      discordAccountId: null,
      telegramEnabled: false,
      telegramAccountId: null,
    });
    providerScopeStore.setSelectedProvider('WECHAT');

    gatewayStore.gatewayStatus = 'READY';
    gatewayStore.session = null;
    bindingStore.capabilities.bindingCrudEnabled = true;
    bindingStore.bindings = [];

    const steps = providerFlowStore.stepStates;
    const personalStep = steps.find((step) => step.key === 'personal_session');

    expect(personalStep?.status).toBe('PENDING');
    expect(personalStep?.detail).toContain('WeChat');
  });

  it('keeps binding step pending until the managed gateway runtime is ready', () => {
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
        targetAgentDefinitionId: 'agent-definition-1',
        launchPreset: {
          workspaceRootPath: '/tmp/workspace',
          llmModelIdentifier: 'gpt-test',
          runtimeKind: 'AUTOBYTEUS',
          autoExecuteTools: false,
          skillAccessMode: 'PRELOADED_ONLY',
          llmConfig: null,
        },
        updatedAt: '2026-02-09T12:00:00.000Z',
      },
    ];

    const steps = providerFlowStore.stepStates;
    expect(steps.map((step) => step.key)).toEqual(['binding', 'verification']);
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
        targetAgentDefinitionId: 'agent-definition-1',
        launchPreset: {
          workspaceRootPath: '/tmp/workspace',
          llmModelIdentifier: 'gpt-test',
          runtimeKind: 'AUTOBYTEUS',
          autoExecuteTools: false,
          skillAccessMode: 'PRELOADED_ONLY',
          llmConfig: null,
        },
        updatedAt: '2026-02-09T12:00:00.000Z',
      },
    ];

    const steps = providerFlowStore.stepStates;
    expect(steps.map((step) => step.key)).toEqual(['binding', 'verification']);
  });
});
