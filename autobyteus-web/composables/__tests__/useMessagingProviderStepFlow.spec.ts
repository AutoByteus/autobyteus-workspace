import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { useMessagingProviderStepFlow } from '../useMessagingProviderStepFlow';
import { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';
import { useMessagingChannelBindingSetupStore } from '~/stores/messagingChannelBindingSetupStore';
import { useMessagingProviderScopeStore } from '~/stores/messagingProviderScopeStore';
import { useMessagingSetupNavigationStore } from '~/stores/messagingSetupNavigationStore';

describe('useMessagingProviderStepFlow', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('uses manual selection over guided step until user returns to guided mode', async () => {
    const providerScopeStore = useMessagingProviderScopeStore();
    providerScopeStore.initialize({
      wechatModes: ['DIRECT_PERSONAL_SESSION'],
      defaultWeChatMode: 'DIRECT_PERSONAL_SESSION',
      wechatPersonalEnabled: true,
      wecomAppEnabled: true,
      discordEnabled: true,
      discordAccountId: 'discord-acct-1',
      telegramEnabled: false,
      telegramAccountId: null,
    });

    const gatewayStore = useGatewaySessionSetupStore();
    const bindingStore = useMessagingChannelBindingSetupStore();
    const navigationStore = useMessagingSetupNavigationStore();
    const flow = useMessagingProviderStepFlow('WHATSAPP');

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
        updatedAt: '2026-02-12T00:00:00.000Z',
      },
    ];
    await nextTick();
    await nextTick();

    expect(flow.guidedStepKey.value).toBe('verification');
    expect(flow.activeStepKey.value).toBe('verification');

    expect(flow.requestStepSelection('binding')).toBe(true);
    await nextTick();
    await nextTick();
    expect(flow.hasManualSelection.value).toBe(true);
    expect(navigationStore.selectedStepForProvider('WHATSAPP')).toBe('binding');

    gatewayStore.gatewayStatus = 'UNKNOWN';
    await nextTick();
    await nextTick();
    expect(navigationStore.selectedStepForProvider('WHATSAPP')).toBe('binding');
    const guidedAfterStatusChange = flow.guidedStepKey.value;

    flow.returnToGuidedStep();
    await nextTick();
    await nextTick();
    expect(flow.activeStepKey.value).toBe(guidedAfterStatusChange);
  });

  it('keeps step selections scoped by provider', async () => {
    const providerScopeStore = useMessagingProviderScopeStore();
    providerScopeStore.initialize({
      wechatModes: [],
      defaultWeChatMode: null,
      wechatPersonalEnabled: false,
      wecomAppEnabled: true,
      discordEnabled: true,
      discordAccountId: 'discord-acct-1',
      telegramEnabled: false,
      telegramAccountId: null,
    });

    const whatsappFlow = useMessagingProviderStepFlow('WHATSAPP');
    const discordFlow = useMessagingProviderStepFlow('DISCORD');

    expect(whatsappFlow.requestStepSelection('binding')).toBe(true);
    expect(discordFlow.requestStepSelection('verification')).toBe(true);
    await nextTick();

    expect(whatsappFlow.activeStepKey.value).toBe('binding');
    expect(discordFlow.activeStepKey.value).toBe('verification');
  });

  it('clears invalid manual selection when step is not allowed for provider', async () => {
    const providerScopeStore = useMessagingProviderScopeStore();
    providerScopeStore.initialize({
      wechatModes: [],
      defaultWeChatMode: null,
      wechatPersonalEnabled: false,
      wecomAppEnabled: true,
      discordEnabled: true,
      discordAccountId: 'discord-acct-1',
      telegramEnabled: false,
      telegramAccountId: null,
    });

    const navigationStore = useMessagingSetupNavigationStore();
    navigationStore.selectedStepByProvider.DISCORD = 'personal_session';

    const discordFlow = useMessagingProviderStepFlow('DISCORD');
    await nextTick();

    expect(navigationStore.selectedStepForProvider('DISCORD')).toBeNull();
    expect(discordFlow.activeStepKey.value).toBe('gateway');
  });
});
