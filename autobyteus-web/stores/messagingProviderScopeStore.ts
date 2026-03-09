import { defineStore } from 'pinia';
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

const PROVIDER_OPTIONS: Record<MessagingProvider, ProviderScopeOption> = {
  WHATSAPP: {
    provider: 'WHATSAPP',
    label: 'WhatsApp Business',
  },
  WECHAT: {
    provider: 'WECHAT',
    label: 'WeChat Personal',
  },
  WECOM: {
    provider: 'WECOM',
    label: 'WeCom App',
  },
  DISCORD: {
    provider: 'DISCORD',
    label: 'Discord Bot',
  },
  TELEGRAM: {
    provider: 'TELEGRAM',
    label: 'Telegram Bot',
  },
};

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
        return state.availableProviders.map((provider) => PROVIDER_OPTIONS[provider]);
      },

      selectedOption(state): ProviderScopeOption {
        return PROVIDER_OPTIONS[state.selectedProvider];
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
