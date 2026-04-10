<template>
  <section class="border border-gray-200 rounded-lg p-4">
    <h3 class="text-sm font-semibold text-gray-900">{{ t('settings.components.settings.NodeManager.remoteBrowserSharing.title') }}</h3>
    <p class="mt-1 text-xs text-gray-500">
      {{ t('settings.components.settings.NodeManager.remoteBrowserSharing.description') }}
    </p>

    <label class="mt-4 flex items-center gap-2 text-sm text-gray-700">
      <input
        v-model="store.settings.enabled"
        type="checkbox"
        class="rounded border-gray-300"
        data-testid="remote-browser-sharing-toggle"
      />
      {{ t('settings.components.settings.NodeManager.remoteBrowserSharing.toggleLabel') }}
    </label>

    <div class="mt-3">
      <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
        {{ t('settings.components.settings.NodeManager.remoteBrowserSharing.advertisedHostLabel') }}
      </label>
      <input
        v-model="store.settings.advertisedHost"
        type="text"
        :placeholder="t('settings.components.settings.NodeManager.remoteBrowserSharing.advertisedHostPlaceholder')"
        class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
        data-testid="remote-browser-sharing-host"
      />
    </div>

    <div class="mt-3 flex items-center gap-2">
      <button
        class="px-4 py-2 rounded-md bg-slate-800 text-white text-sm disabled:opacity-50"
        :disabled="store.busyNodeId !== null"
        data-testid="remote-browser-sharing-save"
        @click="store.saveSettings"
      >
        {{ t('settings.components.settings.NodeManager.remoteBrowserSharing.save') }}
      </button>
      <span
        v-if="store.requiresRestart"
        class="text-xs rounded bg-amber-100 px-2 py-1 text-amber-800"
      >
        {{ t('settings.components.settings.NodeManager.remoteBrowserSharing.restartRequired') }}
      </span>
    </div>

    <p v-if="store.error" class="mt-2 text-sm text-red-600" data-testid="remote-browser-sharing-error">
      {{ store.error }}
    </p>
    <p v-if="store.info" class="mt-2 text-sm text-blue-600" data-testid="remote-browser-sharing-info">
      {{ store.info }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { useRemoteBrowserSharingStore } from '~/stores/remoteBrowserSharingStore';
import { useLocalization } from '~/composables/useLocalization';

const store = useRemoteBrowserSharingStore();
const { t } = useLocalization();
</script>
