import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ChannelBindingSetupCard from '../ChannelBindingSetupCard.vue';
import { useMessagingChannelBindingSetupStore } from '~/stores/messagingChannelBindingSetupStore';
import { useMessagingChannelBindingOptionsStore } from '~/stores/messagingChannelBindingOptionsStore';
import { useMessagingProviderScopeStore } from '~/stores/messagingProviderScopeStore';
import { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';

describe('ChannelBindingSetupCard', () => {
  let pinia: ReturnType<typeof createPinia>;

  const mountWithPinia = () =>
    mount(ChannelBindingSetupCard, {
      global: {
        plugins: [pinia],
      },
    });

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
  });

  it('disables peer refresh until the Discord gateway runtime is ready', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    const providerScopeStore = useMessagingProviderScopeStore();
    gatewayStore.gatewayStatus = 'UNKNOWN';
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

    const wrapper = mountWithPinia();
    await flushPromises();

    const refreshButton = wrapper.get('[data-testid="refresh-peer-candidates-button"]');
    expect(refreshButton.attributes('disabled')).toBeDefined();
  });

  it('refreshes Telegram peer candidates when managed runtime prerequisites are satisfied', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    const providerScopeStore = useMessagingProviderScopeStore();
    gatewayStore.gatewayStatus = 'READY';
    gatewayStore.session = null;
    providerScopeStore.initialize({
      wechatModes: [],
      defaultWeChatMode: null,
      wechatPersonalEnabled: false,
      wecomAppEnabled: false,
      discordEnabled: false,
      discordAccountId: null,
      telegramEnabled: true,
      telegramAccountId: 'telegram-acct-1',
    });
    providerScopeStore.setSelectedProvider('TELEGRAM');

    const optionsStore = useMessagingChannelBindingOptionsStore();
    const loadPeerCandidatesSpy = vi.spyOn(optionsStore, 'loadPeerCandidates').mockResolvedValue([]);

    const wrapper = mountWithPinia();
    await flushPromises();

    await wrapper.get('[data-testid="refresh-peer-candidates-button"]').trigger('click');
    await flushPromises();

    expect(loadPeerCandidatesSpy).toHaveBeenCalledWith(
      'telegram-acct-1',
      { includeGroups: true, limit: 50 },
      'TELEGRAM',
    );
  });

  it('shows Discord identity guidance and applies capability account default', async () => {
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

    const wrapper = mountWithPinia();
    await flushPromises();

    expect(wrapper.find('[data-testid="discord-identity-hint"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Account ID should be');
    expect(wrapper.text()).toContain('discord-acct-1');
  });

  it('shows Telegram AGENT-only hint without a target-type selector', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    gatewayStore.gatewayStatus = 'READY';

    const providerScopeStore = useMessagingProviderScopeStore();
    providerScopeStore.initialize({
      wechatModes: [],
      defaultWeChatMode: null,
      wechatPersonalEnabled: false,
      wecomAppEnabled: false,
      discordEnabled: false,
      discordAccountId: null,
      telegramEnabled: true,
      telegramAccountId: 'telegram-acct-1',
    });
    providerScopeStore.setSelectedProvider('TELEGRAM');

    const wrapper = mountWithPinia();
    await flushPromises();

    expect(wrapper.find('[data-testid="telegram-target-policy-hint"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="binding-agent-definition-select"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="binding-target-type"]').exists()).toBe(false);
  });

  it('renders scoped bindings with agent definition and launch preset summary', async () => {
    const bindingStore = useMessagingChannelBindingSetupStore();
    bindingStore.bindings = [
      {
        id: 'binding-whatsapp',
        provider: 'WHATSAPP',
        transport: 'BUSINESS_API',
        accountId: 'home-whatsapp',
        peerId: 'wa-peer',
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
      {
        id: 'binding-discord',
        provider: 'DISCORD',
        transport: 'BUSINESS_API',
        accountId: 'discord-acct-1',
        peerId: 'user:123456',
        threadId: null,
        targetType: 'AGENT',
        targetAgentDefinitionId: 'agent-definition-2',
        launchPreset: {
          workspaceRootPath: '/tmp/discord-workspace',
          llmModelIdentifier: 'gpt-other',
          runtimeKind: 'AUTOBYTEUS',
          autoExecuteTools: false,
          skillAccessMode: 'PRELOADED_ONLY',
          llmConfig: null,
        },
        updatedAt: '2026-02-09T11:00:00.000Z',
      },
    ];

    const wrapper = mountWithPinia();
    await flushPromises();

    expect(wrapper.text()).toContain('WHATSAPP / BUSINESS_API / home-whatsapp / wa-peer');
    expect(wrapper.text()).toContain('runtime: AUTOBYTEUS | model: gpt-test | workspace: /tmp/workspace');
    expect(wrapper.text()).not.toContain('DISCORD / BUSINESS_API / discord-acct-1 / user:123456');
  });
});
