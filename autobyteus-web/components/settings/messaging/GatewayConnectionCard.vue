<template>
  <section class="border border-gray-200 rounded-lg p-4">
    <h3 class="text-sm font-semibold text-gray-900">Managed Messaging Gateway</h3>
    <p class="mt-1 text-xs text-gray-500">
      Download, configure, and supervise the messaging gateway on the selected node.
    </p>

    <div class="mt-3 flex flex-wrap items-center gap-2">
      <button
        class="px-4 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50"
        :disabled="gatewayStore.isGatewayChecking || gatewayStore.isGatewayMutating"
        @click="onRefreshStatus"
        data-testid="gateway-refresh-button"
      >
        {{ gatewayStore.isGatewayChecking ? 'Refreshing...' : 'Refresh Status' }}
      </button>
      <button
        class="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm disabled:opacity-50"
        :disabled="gatewayStore.isGatewayChecking || gatewayStore.isGatewayMutating"
        @click="onEnableGateway"
        data-testid="gateway-enable-button"
      >
        {{ gatewayStore.isGatewayMutating ? 'Applying...' : 'Enable Messaging' }}
      </button>
      <button
        class="px-4 py-2 rounded-md border border-gray-300 text-gray-700 text-sm disabled:opacity-50"
        :disabled="gatewayStore.isGatewayChecking || gatewayStore.isGatewayMutating"
        @click="onUpdateGateway"
        data-testid="gateway-update-button"
      >
        Update Runtime
      </button>
      <button
        class="px-4 py-2 rounded-md border border-red-300 text-red-700 text-sm disabled:opacity-50"
        :disabled="gatewayStore.isGatewayChecking || gatewayStore.isGatewayMutating"
        @click="onDisableGateway"
        data-testid="gateway-disable-button"
      >
        Disable
      </button>

      <span
        class="text-xs px-2 py-0.5 rounded uppercase tracking-wide"
        :class="statusClass"
        data-testid="gateway-status-badge"
      >
        {{ gatewayStore.managedStatus?.lifecycleState || gatewayStore.gatewayStatus }}
      </span>
    </div>

    <div class="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
      <div class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
        <p class="text-xs text-gray-500">Active Version</p>
        <p class="font-medium text-gray-800" data-testid="managed-gateway-active-version">
          {{ gatewayStore.managedStatus?.activeVersion || 'Not installed' }}
        </p>
      </div>
      <div class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
        <p class="text-xs text-gray-500">Release Tag</p>
        <p class="font-medium text-gray-800">{{ gatewayStore.managedStatus?.releaseTag || 'N/A' }}</p>
      </div>
      <div class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
        <p class="text-xs text-gray-500">Runtime Port</p>
        <p class="font-medium text-gray-800" data-testid="managed-gateway-port">
          {{ bindPortLabel }}
        </p>
      </div>
      <div class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
        <p class="text-xs text-gray-500">Installed Versions</p>
        <p class="font-medium text-gray-800">
          {{ installedVersionsLabel }}
        </p>
      </div>
    </div>

    <p
      v-if="gatewayStore.managedStatus?.message"
      class="mt-2 text-sm text-gray-600"
      data-testid="managed-gateway-message"
    >
      {{ gatewayStore.managedStatus.message }}
    </p>
    <p v-if="gatewayStore.gatewayError" class="mt-2 text-sm text-red-600" data-testid="gateway-error">
      {{ gatewayStore.gatewayError }}
    </p>
    <p v-if="configError" class="mt-2 text-sm text-red-600" data-testid="gateway-config-error">
      {{ configError }}
    </p>

    <div class="mt-4 space-y-4">
      <div class="rounded-md border border-gray-200 p-3">
        <div class="flex items-center justify-between gap-2">
          <div>
            <h4 class="text-sm font-medium text-gray-900">WhatsApp Business</h4>
            <p class="text-xs text-gray-500">Webhook secret only. Peer binding stays manual.</p>
          </div>
          <input
            v-model="gatewayStore.providerConfig.whatsappBusinessEnabled"
            type="checkbox"
            class="h-4 w-4"
            data-testid="provider-whatsapp-enabled"
          />
        </div>
        <input
          v-model="gatewayStore.providerConfig.whatsappBusinessSecret"
          type="password"
          placeholder="WhatsApp Business secret"
          class="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          data-testid="provider-whatsapp-secret"
        />
        <p class="mt-2 text-xs text-gray-600">{{ providerStatusText('WHATSAPP') }}</p>
      </div>

      <div class="rounded-md border border-gray-200 p-3">
        <div class="flex items-center justify-between gap-2">
          <div>
            <h4 class="text-sm font-medium text-gray-900">WeCom App</h4>
            <p class="text-xs text-gray-500">Configure webhook token and one or more app accounts.</p>
          </div>
          <input
            v-model="gatewayStore.providerConfig.wecomAppEnabled"
            type="checkbox"
            class="h-4 w-4"
            data-testid="provider-wecom-enabled"
          />
        </div>
        <input
          v-model="gatewayStore.providerConfig.wecomWebhookToken"
          type="password"
          placeholder="WeCom webhook token"
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

      <div class="rounded-md border border-gray-200 p-3">
        <div class="flex items-center justify-between gap-2">
          <div>
            <h4 class="text-sm font-medium text-gray-900">Discord Bot</h4>
            <p class="text-xs text-gray-500">Peer discovery is available after the runtime is enabled.</p>
          </div>
          <input
            v-model="gatewayStore.providerConfig.discordEnabled"
            type="checkbox"
            class="h-4 w-4"
            data-testid="provider-discord-enabled"
          />
        </div>
        <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            v-model="gatewayStore.providerConfig.discordBotToken"
            type="password"
            placeholder="Discord bot token"
            class="rounded-md border border-gray-300 px-3 py-2 text-sm"
            data-testid="provider-discord-token"
          />
          <input
            v-model="gatewayStore.providerConfig.discordAccountId"
            type="text"
            placeholder="Discord account id"
            class="rounded-md border border-gray-300 px-3 py-2 text-sm"
            data-testid="provider-discord-account-id"
          />
        </div>
        <p class="mt-2 text-xs text-gray-600">{{ providerStatusText('DISCORD') }}</p>
      </div>

      <div class="rounded-md border border-gray-200 p-3">
        <div class="flex items-center justify-between gap-2">
          <div>
            <h4 class="text-sm font-medium text-gray-900">Telegram Bot</h4>
            <p class="text-xs text-gray-500">Peer discovery is available after the runtime is enabled.</p>
          </div>
          <input
            v-model="gatewayStore.providerConfig.telegramEnabled"
            type="checkbox"
            class="h-4 w-4"
            data-testid="provider-telegram-enabled"
          />
        </div>
        <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            v-model="gatewayStore.providerConfig.telegramBotToken"
            type="password"
            placeholder="Telegram bot token"
            class="rounded-md border border-gray-300 px-3 py-2 text-sm"
            data-testid="provider-telegram-token"
          />
          <input
            v-model="gatewayStore.providerConfig.telegramAccountId"
            type="text"
            placeholder="Telegram account id"
            class="rounded-md border border-gray-300 px-3 py-2 text-sm"
            data-testid="provider-telegram-account-id"
          />
        </div>
        <div class="mt-3 flex flex-wrap gap-4 text-sm">
          <label class="inline-flex items-center gap-2">
            <input v-model="gatewayStore.providerConfig.telegramPollingEnabled" type="checkbox" />
            Polling Enabled
          </label>
          <label class="inline-flex items-center gap-2">
            <input v-model="gatewayStore.providerConfig.telegramWebhookEnabled" type="checkbox" />
            Webhook Enabled
          </label>
        </div>
        <input
          v-model="gatewayStore.providerConfig.telegramWebhookSecretToken"
          type="password"
          placeholder="Telegram webhook secret token"
          class="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          data-testid="provider-telegram-webhook-secret"
        />
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
import type { GatewayWeComAccountModel, MessagingProvider } from '~/types/messaging';

const gatewayStore = useGatewaySessionSetupStore();
const configError = ref<string | null>(null);
const wecomAccountsJson = ref('[]');

watch(
  () => gatewayStore.providerConfig.wecomAppAccounts,
  (accounts) => {
    wecomAccountsJson.value = `${JSON.stringify(accounts, null, 2)}`;
  },
  { immediate: true, deep: true },
);

const statusClass = computed(() => {
  if (gatewayStore.gatewayStatus === 'READY') {
    return 'bg-green-100 text-green-700';
  }
  if (gatewayStore.gatewayStatus === 'BLOCKED') {
    return 'bg-red-100 text-red-700';
  }
  return 'bg-gray-100 text-gray-700';
});

const bindPortLabel = computed(() => {
  const host = gatewayStore.managedStatus?.bindHost;
  const port = gatewayStore.managedStatus?.bindPort;
  if (!host || !port) {
    return 'Not running';
  }
  return `${host}:${port}`;
});

const installedVersionsLabel = computed(() => {
  const versions = gatewayStore.managedStatus?.installedVersions || [];
  return versions.length > 0 ? versions.join(', ') : 'None';
});

const excludedProvidersLabel = computed(() => {
  const providers = gatewayStore.managedStatus?.excludedProviders || [];
  return providers.length > 0 ? providers.join(', ') : 'None';
});

function providerStatusText(provider: MessagingProvider): string {
  const status = gatewayStore.providerStatusByProvider[provider];
  if (!status) {
    return 'Provider status unavailable.';
  }
  if (status.effectivelyEnabled) {
    return `${provider} is configured and enabled.`;
  }
  if (status.blockedReason) {
    return status.blockedReason;
  }
  if (status.configured) {
    return `${provider} is configured but currently disabled.`;
  }
  return `${provider} is not configured yet.`;
}

async function onRefreshStatus(): Promise<void> {
  try {
    await gatewayStore.refreshManagedGatewayStatus();
  } catch {
    // Store exposes error state.
  }
}

async function onEnableGateway(): Promise<void> {
  try {
    await gatewayStore.enableManagedGateway();
  } catch {
    // Store exposes error state.
  }
}

async function onDisableGateway(): Promise<void> {
  try {
    await gatewayStore.disableManagedGateway();
  } catch {
    // Store exposes error state.
  }
}

async function onUpdateGateway(): Promise<void> {
  try {
    await gatewayStore.updateManagedGateway();
  } catch {
    // Store exposes error state.
  }
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
