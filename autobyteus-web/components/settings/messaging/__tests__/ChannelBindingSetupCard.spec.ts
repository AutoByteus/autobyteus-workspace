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

  it('disables peer refresh until gateway connection and personal session are both ready', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    gatewayStore.gatewayStatus = 'READY';
    gatewayStore.session = {
      sessionId: 'session-1',
      accountLabel: 'Home WhatsApp',
      status: 'PENDING_QR',
    };

    const wrapper = mountWithPinia();
    await flushPromises();

    const refreshButton = wrapper.get('[data-testid="refresh-peer-candidates-button"]');
    expect(refreshButton.attributes('disabled')).toBeDefined();
  });

  it('refreshes peer candidates when readiness prerequisites are satisfied', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    gatewayStore.gatewayStatus = 'READY';
    gatewayStore.session = {
      sessionId: 'session-2',
      accountLabel: 'Home WhatsApp',
      status: 'ACTIVE',
    };

    const optionsStore = useMessagingChannelBindingOptionsStore();
    const loadPeerCandidatesSpy = vi
      .spyOn(optionsStore, 'loadPeerCandidates')
      .mockResolvedValue([]);

    const wrapper = mountWithPinia();
    await flushPromises();

    const refreshButton = wrapper.get('[data-testid="refresh-peer-candidates-button"]');
    expect(refreshButton.attributes('disabled')).toBeUndefined();

    await refreshButton.trigger('click');
    await flushPromises();

    expect(loadPeerCandidatesSpy).toHaveBeenCalledWith(
      'session-2',
      { includeGroups: true, limit: 50 },
      'WHATSAPP',
    );
  });

  it('hides transport fallback toggle in setup UI', async () => {
    const optionsStore = useMessagingChannelBindingOptionsStore();
    optionsStore.peerCandidates = [
      {
        peerId: 'peer-1',
        peerType: 'USER',
        threadId: null,
        displayName: 'Peer One',
        lastMessageAt: '2026-02-09T12:00:00.000Z',
      },
    ];
    optionsStore.targetOptions = [
      {
        targetType: 'AGENT',
        targetId: 'agent-1',
        displayName: 'Agent One',
        status: 'RUNNING',
      },
    ];

    const wrapper = mountWithPinia();
    await flushPromises();

    expect(wrapper.find('[data-testid="binding-allow-fallback"]').exists()).toBe(false);
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

  it('renders threadId field errors from binding store', async () => {
    const bindingStore = useMessagingChannelBindingSetupStore();
    bindingStore.fieldErrors.threadId = 'Thread ID is invalid';

    const wrapper = mountWithPinia();
    await flushPromises();

    expect(wrapper.text()).toContain('Thread ID is invalid');
  });

  it('refreshes Discord peer candidates without personal session prerequisite', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    gatewayStore.gatewayStatus = 'READY';
    gatewayStore.session = null;

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

    const optionsStore = useMessagingChannelBindingOptionsStore();
    const loadPeerCandidatesSpy = vi
      .spyOn(optionsStore, 'loadPeerCandidates')
      .mockResolvedValue([]);

    const wrapper = mountWithPinia();
    await flushPromises();

    const refreshButton = wrapper.get('[data-testid="refresh-peer-candidates-button"]');
    expect(refreshButton.attributes('disabled')).toBeUndefined();

    await refreshButton.trigger('click');
    await flushPromises();

    expect(loadPeerCandidatesSpy).toHaveBeenCalledWith(
      'discord-acct-1',
      { includeGroups: true, limit: 50 },
      'DISCORD',
    );
  });

  it('renders binding list scoped to selected provider', async () => {
    const bindingStore = useMessagingChannelBindingSetupStore();
    bindingStore.bindings = [
      {
        id: 'binding-whatsapp',
        provider: 'WHATSAPP',
        transport: 'PERSONAL_SESSION',
        accountId: 'home-whatsapp',
        peerId: 'wa-peer',
        threadId: null,
        targetType: 'AGENT',
        targetId: 'agent-1',
        updatedAt: '2026-02-09T12:00:00.000Z',
      },
      {
        id: 'binding-discord',
        provider: 'DISCORD',
        transport: 'BUSINESS_API',
        accountId: 'discord-acct-1',
        peerId: 'user:123456',
        threadId: null,
        targetType: 'TEAM',
        targetId: 'team-1',
        updatedAt: '2026-02-09T11:00:00.000Z',
      },
    ];

    const wrapper = mountWithPinia();
    await flushPromises();

    expect(wrapper.text()).toContain('WHATSAPP / PERSONAL_SESSION / home-whatsapp / wa-peer');
    expect(wrapper.text()).not.toContain('DISCORD / BUSINESS_API / discord-acct-1 / user:123456');
  });

  it('shows Telegram AGENT-only hint and refreshes Telegram peer candidates without session', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    gatewayStore.gatewayStatus = 'READY';
    gatewayStore.session = null;

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

    const optionsStore = useMessagingChannelBindingOptionsStore();
    const loadPeerCandidatesSpy = vi
      .spyOn(optionsStore, 'loadPeerCandidates')
      .mockResolvedValue([]);

    const wrapper = mountWithPinia();
    await flushPromises();

    expect(wrapper.find('[data-testid="telegram-target-policy-hint"]').exists()).toBe(true);

    const targetTypeOptions = wrapper
      .findAll('[data-testid="binding-target-type"] option')
      .map((option) => option.text());
    expect(targetTypeOptions).toEqual(['AGENT']);

    const refreshButton = wrapper.get('[data-testid="refresh-peer-candidates-button"]');
    expect(refreshButton.attributes('disabled')).toBeUndefined();

    await refreshButton.trigger('click');
    await flushPromises();

    expect(loadPeerCandidatesSpy).toHaveBeenCalledWith(
      'telegram-acct-1',
      { includeGroups: true, limit: 50 },
      'TELEGRAM',
    );
  });
});
