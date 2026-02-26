import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useMessagingProviderScopeStore } from '~/stores/messagingProviderScopeStore';

describe('messagingProviderScopeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('initializes available providers from gateway capabilities', () => {
    const store = useMessagingProviderScopeStore();

    store.initialize({
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
  });

  it('falls back to first available provider when current selection is no longer available', () => {
    const store = useMessagingProviderScopeStore();

    store.initialize({
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
      wechatModes: ['WECOM_APP_BRIDGE'],
      defaultWeChatMode: 'WECOM_APP_BRIDGE',
      wechatPersonalEnabled: false,
      wecomAppEnabled: false,
      discordEnabled: false,
      discordAccountId: null,
      telegramEnabled: false,
      telegramAccountId: null,
    });

    expect(store.selectedProvider).toBe('WHATSAPP');
  });

  it('resolves transport and personal-session requirement based on provider', () => {
    const store = useMessagingProviderScopeStore();

    store.initialize({
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
});
