import { defineStore } from 'pinia';
import {
  GatewayClientError,
} from '~/services/messagingGatewayClient';
import { createGatewayClient } from '~/services/gatewayClientFactory';
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
  if (error instanceof GatewayClientError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Gateway request failed';
}

function normalizeCapabilities(capabilities: GatewayCapabilitiesModel): GatewayCapabilitiesModel {
  return {
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
    createClient() {
      const gatewaySessionStore = useGatewaySessionSetupStore();
      return createGatewayClient({
        baseUrl: gatewaySessionStore.gatewayBaseUrl,
        adminToken: gatewaySessionStore.gatewayAdminToken || undefined,
      });
    },

    async loadCapabilities() {
      this.isCapabilitiesLoading = true;
      this.capabilitiesError = null;
      try {
        const capabilities = normalizeCapabilities(await this.createClient().getCapabilities());
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
        const response = await this.createClient().getWeComAccounts();
        this.accounts = response.items;
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
