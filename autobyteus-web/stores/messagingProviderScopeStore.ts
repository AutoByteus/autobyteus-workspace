import { defineStore } from 'pinia';
import { localizationRuntime } from '~/localization/runtime/localizationRuntime';
import type {
  MessagingProvider,
  MessagingTransport,
  GatewayCapabilitiesModel,
} from '~/types/messaging';

export interface ProviderScopeOption {
  provider: MessagingProvider;
  label: string;
}

interface MessagingProviderScopeState {
  selectedProvider: MessagingProvider;
  availableProviders: MessagingProvider[];
  discordAccountId: string | null;
  telegramAccountId: string | null;
  initialized: boolean;
}

function normalizeOptionalAccountId(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function providerLabel(provider: MessagingProvider): string {
  switch (provider) {
    case 'WHATSAPP':
      return localizationRuntime.translate('settings.messaging.providers.whatsappBusiness');
    case 'WECHAT':
      return localizationRuntime.translate('settings.messaging.providers.wechatPersonal');
    case 'WECOM':
      return localizationRuntime.translate('settings.messaging.providers.wecomApp');
    case 'DISCORD':
      return localizationRuntime.translate('settings.messaging.providers.discordBot');
    case 'TELEGRAM':
      return localizationRuntime.translate('settings.messaging.providers.telegramBot');
    default:
      return provider;
  }
}

function providerOption(provider: MessagingProvider): ProviderScopeOption {
  return {
    provider,
    label: providerLabel(provider),
  };
}

function resolveAvailableProviders(
  capabilities: GatewayCapabilitiesModel | null | undefined,
): MessagingProvider[] {
  const providers: MessagingProvider[] = [];
  if (capabilities?.whatsappBusinessEnabled !== false) {
    providers.push('WHATSAPP');
  }
  if (capabilities?.wechatPersonalEnabled) {
    providers.push('WECHAT');
  }
  if (capabilities?.wecomAppEnabled) {
    providers.push('WECOM');
  }
  if (capabilities?.discordEnabled) {
    providers.push('DISCORD');
  }
  if (capabilities?.telegramEnabled) {
    providers.push('TELEGRAM');
  }
  return providers;
}

export const useMessagingProviderScopeStore = defineStore(
  'messagingProviderScopeStore',
  {
    state: (): MessagingProviderScopeState => ({
      selectedProvider: 'WHATSAPP',
      availableProviders: ['WHATSAPP'],
      discordAccountId: null,
      telegramAccountId: null,
      initialized: false,
    }),

    getters: {
      options(state): ProviderScopeOption[] {
        localizationRuntime.resolvedLocale.value;
        return state.availableProviders.map((provider) => providerOption(provider));
      },

      selectedOption(state): ProviderScopeOption {
        localizationRuntime.resolvedLocale.value;
        return providerOption(state.selectedProvider);
      },

      requiresPersonalSession(state): boolean {
        return state.selectedProvider === 'WECHAT';
      },

      resolvedTransport(state): MessagingTransport {
        return state.selectedProvider === 'WECHAT' ? 'PERSONAL_SESSION' : 'BUSINESS_API';
      },
    },

    actions: {
      initialize(capabilities: GatewayCapabilitiesModel | null | undefined): void {
        const nextAvailableProviders = resolveAvailableProviders(capabilities);
        this.availableProviders = nextAvailableProviders;
        this.discordAccountId =
          typeof capabilities?.discordAccountId === 'string' &&
          capabilities.discordAccountId.trim().length > 0
            ? capabilities.discordAccountId
            : null;
        this.telegramAccountId =
          typeof capabilities?.telegramAccountId === 'string' &&
          capabilities.telegramAccountId.trim().length > 0
            ? capabilities.telegramAccountId
            : null;

        if (!nextAvailableProviders.includes(this.selectedProvider)) {
          this.selectedProvider = nextAvailableProviders[0] || 'WHATSAPP';
        }

        this.initialized = true;
      },

      applyManagedAccountHints(input: {
        discordAccountId?: string | null;
        telegramAccountId?: string | null;
      }): void {
        this.discordAccountId = normalizeOptionalAccountId(input.discordAccountId);
        this.telegramAccountId = normalizeOptionalAccountId(input.telegramAccountId);
      },

      setSelectedProvider(provider: MessagingProvider): void {
        if (!this.availableProviders.includes(provider)) {
          return;
        }
        this.selectedProvider = provider;
      },
    },
  },
);
