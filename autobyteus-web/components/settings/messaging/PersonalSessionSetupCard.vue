<template>
  <section class="border border-gray-200 rounded-lg p-4">
    <h3 class="text-sm font-semibold text-gray-900">{{ title }}</h3>
    <p class="mt-1 text-xs text-gray-500">
      {{ subtitle }}
    </p>

    <div
      v-if="!providerScopeStore.requiresPersonalSession"
      class="mt-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700"
      data-testid="personal-session-not-required"
    >
      Personal session setup is not required for {{ businessModeLabel }} mode.
    </div>

    <div v-else class="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
      <input
        v-model="accountLabel"
        type="text"
        :placeholder="accountLabelPlaceholder"
        class="w-full md:max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm"
        data-testid="session-account-label"
      />
      <button
        class="px-4 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50"
        :disabled="gatewayStore.isSessionLoading"
        @click="onStartSession"
        data-testid="start-session-button"
      >
        {{ gatewayStore.isSessionLoading ? 'Starting...' : 'Start Session' }}
      </button>
      <button
        class="px-4 py-2 rounded-md border border-gray-300 text-gray-700 text-sm disabled:opacity-50"
        :disabled="!gatewayStore.session || gatewayStore.isSessionLoading"
        @click="onRefreshStatus"
        data-testid="refresh-session-status-button"
      >
        Refresh Status
      </button>
      <button
        class="px-4 py-2 rounded-md border border-red-300 text-red-700 text-sm disabled:opacity-50"
        :disabled="!gatewayStore.session || gatewayStore.isSessionLoading"
        @click="onStopSession"
        data-testid="stop-session-button"
      >
        Stop Session
      </button>
    </div>

    <div v-if="gatewayStore.session" class="mt-3 rounded-md bg-gray-50 border border-gray-200 p-3">
      <p class="text-sm text-gray-800">
        Session: <span class="font-mono">{{ gatewayStore.session.sessionId }}</span>
      </p>
      <p class="text-sm text-gray-800 mt-1">
        Status: <span class="font-semibold">{{ gatewayStore.session.status }}</span>
      </p>
      <p
        v-if="gatewayStore.sessionStatusAutoSyncState === 'running'"
        class="text-xs text-gray-500 mt-1"
        data-testid="session-auto-sync-running"
      >
        Auto-syncing status...
      </p>
      <p
        v-if="gatewayStore.sessionStatusAutoSyncState === 'paused'"
        class="text-xs text-amber-700 mt-1"
        data-testid="session-auto-sync-paused"
      >
        Auto-sync paused. Use Refresh Status to continue.
      </p>
      <div v-if="gatewayStore.session.qr" class="mt-2">
        <ScannableQrCodePanel
          :qr-code="gatewayStore.session.qr.code"
          :provider="gatewayStore.sessionProvider"
        />
      </div>
      <button
        class="mt-2 px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 text-xs disabled:opacity-50"
        :disabled="gatewayStore.isSessionLoading"
        @click="onRefreshQr"
        data-testid="refresh-qr-button"
      >
        Refresh QR
      </button>
    </div>

    <p v-if="gatewayStore.personalModeBlockedReason" class="mt-2 text-sm text-red-600" data-testid="personal-mode-blocked">
      {{ gatewayStore.personalModeBlockedReason }}
    </p>
    <p v-if="gatewayStore.sessionError" class="mt-2 text-sm text-red-600" data-testid="session-error">
      {{ gatewayStore.sessionError }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';
import { useMessagingProviderScopeStore } from '~/stores/messagingProviderScopeStore';
import ScannableQrCodePanel from '~/components/settings/messaging/ScannableQrCodePanel.vue';
import type { PersonalSessionProvider } from '~/types/messaging';

const gatewayStore = useGatewaySessionSetupStore();
const providerScopeStore = useMessagingProviderScopeStore();
const accountLabel = ref('Home WhatsApp');

const title = computed(() =>
  providerScopeStore.requiresPersonalSession
    ? `${gatewayStore.sessionProviderLabel} Personal Session`
    : `${businessModeLabel.value} Bridge`,
);

const subtitle = computed(() =>
  providerScopeStore.requiresPersonalSession
    ? 'Start a personal session, scan QR, and verify that the session reaches ACTIVE state.'
    : 'Business API mode uses account-level setup and does not require QR session activation.',
);

const businessModeLabel = computed(() => {
  if (providerScopeStore.selectedProvider === 'DISCORD') {
    return 'Discord Bot';
  }
  return 'WeCom App';
});

const accountLabelPlaceholder = computed(() =>
  gatewayStore.sessionProvider === 'WECHAT'
    ? 'Account label (e.g. Home WeChat)'
    : 'Account label (e.g. Home WhatsApp)',
);

watch(
  () => providerScopeStore.selectedProvider,
  (provider) => {
    if (provider === 'WHATSAPP' || provider === 'WECHAT') {
      gatewayStore.setSessionProvider(provider as PersonalSessionProvider);
    }

    if (provider === 'WECHAT') {
      accountLabel.value = 'Home WeChat';
      return;
    }
    if (provider === 'WHATSAPP') {
      accountLabel.value = 'Home WhatsApp';
    }
  },
  { immediate: true },
);

async function onStartSession(): Promise<void> {
  try {
    await gatewayStore.startPersonalSession(accountLabel.value.trim() || 'Personal Account');
  } catch {
    // Store exposes error state.
  }
}

async function onRefreshQr(): Promise<void> {
  try {
    await gatewayStore.fetchPersonalSessionQr();
  } catch {
    // Store exposes error state.
  }
}

async function onRefreshStatus(): Promise<void> {
  try {
    await gatewayStore.fetchPersonalSessionStatus();
  } catch {
    // Store exposes error state.
  }
}

async function onStopSession(): Promise<void> {
  try {
    await gatewayStore.stopPersonalSession();
  } catch {
    // Store exposes error state.
  }
}
</script>
