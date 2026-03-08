import { defineStore } from 'pinia';
import { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';
import type {
  GatewayCapabilitiesModel,
  GatewayWeComAccountModel,
} from '~/types/messaging';

interface GatewayCapabilityState {
  capabilities: GatewayCapabilitiesModel | null;
  accounts: GatewayWeComAccountModel[];
  isCapabilitiesLoading: boolean;
  isAccountsLoading: boolean;
  capabilitiesError: string | null;
  accountsError: string | null;
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Managed messaging request failed';
}

function normalizeCapabilities(capabilities: Partial<GatewayCapabilitiesModel>): GatewayCapabilitiesModel {
  return {
    whatsappBusinessEnabled: capabilities.whatsappBusinessEnabled === true,
    wechatModes: Array.isArray(capabilities.wechatModes) ? capabilities.wechatModes : [],
    defaultWeChatMode: capabilities.defaultWeChatMode ?? null,
    wecomAppEnabled: capabilities.wecomAppEnabled === true,
    wechatPersonalEnabled: capabilities.wechatPersonalEnabled === true,
    discordEnabled: capabilities.discordEnabled === true,
    discordAccountId:
      typeof capabilities.discordAccountId === 'string' && capabilities.discordAccountId.trim().length > 0
        ? capabilities.discordAccountId
        : null,
    telegramEnabled: capabilities.telegramEnabled === true,
    telegramAccountId:
      typeof capabilities.telegramAccountId === 'string' &&
      capabilities.telegramAccountId.trim().length > 0
        ? capabilities.telegramAccountId
        : null,
  };
}

export const useGatewayCapabilityStore = defineStore('gatewayCapabilityStore', {
  state: (): GatewayCapabilityState => ({
    capabilities: null,
    accounts: [],
    isCapabilitiesLoading: false,
    isAccountsLoading: false,
    capabilitiesError: null,
    accountsError: null,
  }),

  actions: {
    async loadCapabilities() {
      this.isCapabilitiesLoading = true;
      this.capabilitiesError = null;
      try {
        const gatewaySessionStore = useGatewaySessionSetupStore();
        const status =
          gatewaySessionStore.managedStatus ||
          (await gatewaySessionStore.refreshManagedGatewayStatus());
        const supportedProviders = new Set(status?.supportedProviders || []);
        const providerStatus = status?.providerStatusByProvider || {};
        const capabilities = normalizeCapabilities({
          whatsappBusinessEnabled: supportedProviders.has('WHATSAPP'),
          wechatModes: supportedProviders.has('WECOM') ? ['WECOM_APP_BRIDGE'] : [],
          defaultWeChatMode: supportedProviders.has('WECOM') ? 'WECOM_APP_BRIDGE' : null,
          wecomAppEnabled: supportedProviders.has('WECOM'),
          wechatPersonalEnabled: false,
          discordEnabled: supportedProviders.has('DISCORD'),
          discordAccountId:
            typeof providerStatus.DISCORD?.accountId === 'string'
              ? providerStatus.DISCORD.accountId
              : null,
          telegramEnabled: supportedProviders.has('TELEGRAM'),
          telegramAccountId:
            typeof providerStatus.TELEGRAM?.accountId === 'string'
              ? providerStatus.TELEGRAM.accountId
              : null,
        });
        this.capabilities = capabilities;
        return capabilities;
      } catch (error) {
        this.capabilitiesError = normalizeErrorMessage(error);
        throw error;
      } finally {
        this.isCapabilitiesLoading = false;
      }
    },

    async loadWeComAccounts() {
      this.isAccountsLoading = true;
      this.accountsError = null;
      try {
        const gatewaySessionStore = useGatewaySessionSetupStore();
        this.accounts = await gatewaySessionStore.loadWeComAccounts();
        return this.accounts;
      } catch (error) {
        this.accountsError = normalizeErrorMessage(error);
        throw error;
      } finally {
        this.isAccountsLoading = false;
      }
    },
  },
});
