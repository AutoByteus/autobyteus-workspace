<template>
  <section
    id="managed-provider-config-section"
    class="border border-gray-200 rounded-lg p-4 bg-white"
    data-testid="managed-provider-config-section"
  >
    <h3 class="text-sm font-semibold text-gray-900">{{ selectedProviderLabel }} Configuration</h3>
    <p class="mt-1 text-xs text-gray-500">{{ $t('settings.components.settings.messaging.GatewayConnectionCard.configure_the_selected_provider_on_top') }}</p>
    <p class="mt-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
      Gateway lifecycle is managed in the card above. Use this section to configure
      {{ selectedProviderLabel.toLowerCase() }}.
    </p>
    <p v-if="configError" class="mt-2 text-sm text-red-600" data-testid="gateway-config-error">
      {{ configError }}
    </p>
    <p v-if="providerBlockedReason" class="mt-2 text-sm text-amber-700" data-testid="gateway-provider-blocked">
      {{ providerBlockedReason }}
    </p>

    <div class="mt-4 space-y-4">
      <div v-if="selectedProvider === 'WHATSAPP'" class="rounded-md border border-gray-200 p-3">
        <div>
          <h4 class="text-sm font-medium text-gray-900">{{ $t('settings.components.settings.messaging.GatewayConnectionCard.whatsapp_business') }}</h4>
          <p class="text-xs text-gray-500">{{ $t('settings.components.settings.messaging.GatewayConnectionCard.webhook_secret_only_saving_valid_config') }}</p>
        </div>
        <input
          v-model="gatewayStore.providerConfig.whatsappBusinessSecret"
          type="password"
          :placeholder="$t('settings.components.settings.messaging.GatewayConnectionCard.whatsapp_business_secret')"
          class="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          data-testid="provider-whatsapp-secret"
        />
        <p class="mt-2 text-xs text-gray-600">{{ providerStatusText('WHATSAPP') }}</p>
      </div>

      <div v-else-if="selectedProvider === 'WECOM'" class="rounded-md border border-gray-200 p-3">
        <div>
          <h4 class="text-sm font-medium text-gray-900">{{ $t('settings.components.settings.messaging.GatewayConnectionCard.wecom_app') }}</h4>
          <p class="text-xs text-gray-500">{{ $t('settings.components.settings.messaging.GatewayConnectionCard.configure_webhook_token_and_one_or') }}</p>
        </div>
        <input
          v-model="gatewayStore.providerConfig.wecomWebhookToken"
          type="password"
          :placeholder="$t('settings.components.settings.messaging.GatewayConnectionCard.wecom_webhook_token')"
          class="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          data-testid="provider-wecom-token"
        />
        <textarea
          v-model="wecomAccountsJson"
          rows="4"
          class="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
          data-testid="provider-wecom-accounts-json"
        />
        <p class="mt-2 text-xs text-gray-600">{{ providerStatusText('WECOM') }}</p>
      </div>

      <div v-else-if="selectedProvider === 'DISCORD'" class="rounded-md border border-gray-200 p-3">
        <div>
          <h4 class="text-sm font-medium text-gray-900">{{ $t('settings.components.settings.messaging.GatewayConnectionCard.discord_bot') }}</h4>
          <p class="text-xs text-gray-500">{{ $t('settings.components.settings.messaging.GatewayConnectionCard.peer_discovery_is_available_after_the') }}</p>
        </div>
        <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            v-model="gatewayStore.providerConfig.discordBotToken"
            type="password"
            :placeholder="$t('settings.components.settings.messaging.GatewayConnectionCard.discord_bot_token')"
            class="rounded-md border border-gray-300 px-3 py-2 text-sm"
            data-testid="provider-discord-token"
          />
          <input
            v-model="gatewayStore.providerConfig.discordAccountId"
            type="text"
            :placeholder="$t('settings.components.settings.messaging.GatewayConnectionCard.discord_account_id')"
            class="rounded-md border border-gray-300 px-3 py-2 text-sm"
            data-testid="provider-discord-account-id"
          />
        </div>
        <p class="mt-2 text-xs text-gray-600">{{ providerStatusText('DISCORD') }}</p>
      </div>

      <div v-else-if="selectedProvider === 'TELEGRAM'" class="rounded-md border border-gray-200 p-3">
        <div>
          <h4 class="text-sm font-medium text-gray-900">{{ $t('settings.components.settings.messaging.GatewayConnectionCard.telegram_bot') }}</h4>
          <p class="text-xs text-gray-500">
            Managed Telegram uses polling mode. Create the bot in BotFather, paste the token,
            choose an internal account label, then send the bot a message before binding.
          </p>
        </div>
        <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            v-model="gatewayStore.providerConfig.telegramBotToken"
            type="password"
            :placeholder="$t('settings.components.settings.messaging.GatewayConnectionCard.telegram_bot_token')"
            class="rounded-md border border-gray-300 px-3 py-2 text-sm"
            data-testid="provider-telegram-token"
          />
          <input
            v-model="gatewayStore.providerConfig.telegramAccountId"
            type="text"
            :placeholder="$t('settings.components.settings.messaging.GatewayConnectionCard.telegram_account_label_for_example_telegram')"
            class="rounded-md border border-gray-300 px-3 py-2 text-sm"
            data-testid="provider-telegram-account-id"
          />
        </div>
        <p class="mt-3 rounded-md border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-700">
          AutoByteus manages Telegram in polling mode on the selected node. Use the account label
          above as your internal binding scope. It does not need to match a Telegram numeric chat ID.
          Saving valid config makes Telegram active automatically and it stays active after restart.
        </p>
        <p class="mt-2 text-xs text-gray-600">{{ providerStatusText('TELEGRAM') }}</p>
      </div>
    </div>

    <div class="mt-3 flex items-center justify-between gap-3">
      <p class="text-xs text-gray-500">
        Excluded providers: {{ excludedProvidersLabel }}
      </p>
      <button
        class="px-4 py-2 rounded-md bg-slate-900 text-white text-sm disabled:opacity-50"
        :disabled="gatewayStore.isProviderConfigSaving"
        @click="onSaveConfig"
        data-testid="gateway-save-config-button"
      >
        {{ gatewayStore.isProviderConfigSaving ? 'Saving...' : 'Save Configuration' }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';
import { useMessagingProviderScopeStore } from '~/stores/messagingProviderScopeStore';
import type { GatewayWeComAccountModel, MessagingProvider } from '~/types/messaging';

const gatewayStore = useGatewaySessionSetupStore();
const providerScopeStore = useMessagingProviderScopeStore();
const configError = ref<string | null>(null);
const wecomAccountsJson = ref('[]');

watch(
  () => gatewayStore.providerConfig.wecomAppAccounts,
  (accounts) => {
    wecomAccountsJson.value = `${JSON.stringify(accounts, null, 2)}`;
  },
  { immediate: true, deep: true },
);

const selectedProvider = computed<MessagingProvider>(() => providerScopeStore.selectedProvider);

const selectedProviderLabel = computed(() => {
  switch (selectedProvider.value) {
    case 'WHATSAPP':
      return 'WhatsApp Business';
    case 'WECOM':
      return 'WeCom App';
    case 'DISCORD':
      return 'Discord Bot';
    case 'TELEGRAM':
      return 'Telegram Bot';
    case 'WECHAT':
      return 'WeChat';
    default:
      return 'Provider';
  }
});

const excludedProvidersLabel = computed(() => {
  const providers = gatewayStore.managedStatus?.excludedProviders || [];
  return providers.length > 0 ? providers.join(', ') : 'None';
});

const providerBlockedReason = computed(() => {
  const status = gatewayStore.providerStatusByProvider[selectedProvider.value];
  return status?.blockedReason || null;
});

function providerStatusText(provider: MessagingProvider): string {
  const status = gatewayStore.providerStatusByProvider[provider];
  if (!status) {
    return 'Provider status unavailable.';
  }
  if (status.effectivelyEnabled) {
    return `${provider} is configured and becomes active automatically whenever the managed gateway is running.`;
  }
  if (status.blockedReason) {
    return status.blockedReason;
  }
  return `${provider} is not configured yet.`;
}

async function onSaveConfig(): Promise<void> {
  configError.value = null;

  let wecomAppAccounts: GatewayWeComAccountModel[] = [];
  try {
    const parsed = JSON.parse(wecomAccountsJson.value);
    if (!Array.isArray(parsed)) {
      throw new Error('WeCom app accounts must be a JSON array.');
    }
    wecomAppAccounts = parsed.map((entry) => {
      if (typeof entry !== 'object' || entry === null) {
        throw new Error('WeCom app accounts must contain objects.');
      }
      return {
        accountId: String((entry as Record<string, unknown>).accountId ?? ''),
        label: String((entry as Record<string, unknown>).label ?? ''),
        mode: (entry as Record<string, unknown>).mode === 'LEGACY' ? 'LEGACY' : 'APP',
      };
    });
  } catch (error) {
    configError.value = error instanceof Error ? error.message : 'Invalid WeCom accounts JSON.';
    return;
  }

  try {
    await gatewayStore.saveManagedGatewayProviderConfig({
      ...gatewayStore.providerConfig,
      wecomAppAccounts,
    });
  } catch {
    // Store exposes error state.
  }
}
</script>
