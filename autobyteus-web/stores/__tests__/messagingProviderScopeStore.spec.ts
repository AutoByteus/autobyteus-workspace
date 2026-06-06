import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useMessagingProviderScopeStore } from '~/stores/messagingProviderScopeStore';

describe('messagingProviderScopeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('starts with no available providers before gateway capabilities initialize', () => {
    const store = useMessagingProviderScopeStore();

    expect(store.availableProviders).toEqual([]);
    expect(store.options).toEqual([]);
    expect(store.initialized).toBe(false);
    expect(store.hasActiveProvider).toBe(false);
  });

  it('initializes available providers from gateway capabilities', () => {
    const store = useMessagingProviderScopeStore();

    store.initialize({
      whatsappBusinessEnabled: true,
      wechatModes: ['DIRECT_PERSONAL_SESSION', 'WECOM_APP_BRIDGE'],
      defaultWeChatMode: 'DIRECT_PERSONAL_SESSION',
      wechatPersonalEnabled: true,
      wecomAppEnabled: true,
      discordEnabled: true,
      discordAccountId: 'discord-acct-1',
      telegramEnabled: true,
      telegramAccountId: 'telegram-acct-1',
    });

    expect(store.availableProviders).toEqual([
      'WHATSAPP',
      'WECHAT',
      'WECOM',
      'DISCORD',
      'TELEGRAM',
    ]);
    expect(store.options.map((entry) => entry.provider)).toEqual([
      'WHATSAPP',
      'WECHAT',
      'WECOM',
      'DISCORD',
      'TELEGRAM',
    ]);
    expect(store.initialized).toBe(true);
    expect(store.hasActiveProvider).toBe(true);
  });

  it('uses Discord and Telegram only for the default managed active providers', () => {
    const store = useMessagingProviderScopeStore();

    store.initialize({
      whatsappBusinessEnabled: false,
      wechatModes: [],
      defaultWeChatMode: null,
      wechatPersonalEnabled: false,
      wecomAppEnabled: false,
      discordEnabled: true,
      discordAccountId: 'discord-acct-1',
      telegramEnabled: true,
      telegramAccountId: 'telegram-acct-1',
    });

    expect(store.availableProviders).toEqual(['DISCORD', 'TELEGRAM']);
    expect(store.options.map((entry) => entry.provider)).toEqual([
      'DISCORD',
      'TELEGRAM',
    ]);
    expect(store.selectedProvider).toBe('DISCORD');
    expect(store.hasActiveProvider).toBe(true);
  });

  it('falls back to first available provider when current selection is no longer available', () => {
    const store = useMessagingProviderScopeStore();

    store.initialize({
      whatsappBusinessEnabled: false,
      wechatModes: ['DIRECT_PERSONAL_SESSION'],
      defaultWeChatMode: 'DIRECT_PERSONAL_SESSION',
      wechatPersonalEnabled: true,
      wecomAppEnabled: false,
      discordEnabled: false,
      discordAccountId: null,
      telegramEnabled: false,
      telegramAccountId: null,
    });
    store.setSelectedProvider('WECHAT');

    store.initialize({
      whatsappBusinessEnabled: false,
      wechatModes: ['WECOM_APP_BRIDGE'],
      defaultWeChatMode: 'WECOM_APP_BRIDGE',
      wechatPersonalEnabled: false,
      wecomAppEnabled: false,
      discordEnabled: true,
      discordAccountId: 'discord-acct-1',
      telegramEnabled: true,
      telegramAccountId: 'telegram-acct-1',
    });

    expect(store.selectedProvider).toBe('DISCORD');
  });

  it('resolves transport and personal-session requirement based on provider', () => {
    const store = useMessagingProviderScopeStore();

    store.initialize({
      whatsappBusinessEnabled: false,
      wechatModes: ['WECOM_APP_BRIDGE'],
      defaultWeChatMode: 'WECOM_APP_BRIDGE',
      wechatPersonalEnabled: false,
      wecomAppEnabled: true,
      discordEnabled: false,
      discordAccountId: null,
      telegramEnabled: false,
      telegramAccountId: null,
    });
    store.setSelectedProvider('WECOM');

    expect(store.requiresPersonalSession).toBe(false);
    expect(store.resolvedTransport).toBe('BUSINESS_API');
  });

  it('adds DISCORD provider when capability is enabled', () => {
    const store = useMessagingProviderScopeStore();

    store.initialize({
      whatsappBusinessEnabled: false,
      wechatModes: [],
      defaultWeChatMode: null,
      wechatPersonalEnabled: false,
      wecomAppEnabled: false,
      discordEnabled: true,
      discordAccountId: 'discord-acct-1',
      telegramEnabled: false,
      telegramAccountId: null,
    });
    store.setSelectedProvider('DISCORD');

    expect(store.availableProviders).toContain('DISCORD');
    expect(store.requiresPersonalSession).toBe(false);
    expect(store.resolvedTransport).toBe('BUSINESS_API');
  });

  it('adds TELEGRAM provider when capability is enabled', () => {
    const store = useMessagingProviderScopeStore();

    store.initialize({
      whatsappBusinessEnabled: false,
      wechatModes: [],
      defaultWeChatMode: null,
      wechatPersonalEnabled: false,
      wecomAppEnabled: false,
      discordEnabled: false,
      discordAccountId: null,
      telegramEnabled: true,
      telegramAccountId: 'telegram-acct-1',
    });
    store.setSelectedProvider('TELEGRAM');

    expect(store.availableProviders).toContain('TELEGRAM');
    expect(store.requiresPersonalSession).toBe(false);
    expect(store.resolvedTransport).toBe('BUSINESS_API');
  });

  it('updates managed account hints without resetting provider selection', () => {
    const store = useMessagingProviderScopeStore();

    store.initialize({
      whatsappBusinessEnabled: false,
      wechatModes: [],
      defaultWeChatMode: null,
      wechatPersonalEnabled: false,
      wecomAppEnabled: false,
      discordEnabled: true,
      discordAccountId: 'discord-acct-1',
      telegramEnabled: true,
      telegramAccountId: 'telegram-acct-1',
    });
    store.setSelectedProvider('TELEGRAM');

    store.applyManagedAccountHints({
      discordAccountId: 'discord-acct-2',
      telegramAccountId: 'telegram-main',
    });

    expect(store.selectedProvider).toBe('TELEGRAM');
    expect(store.discordAccountId).toBe('discord-acct-2');
    expect(store.telegramAccountId).toBe('telegram-main');
  });
});
