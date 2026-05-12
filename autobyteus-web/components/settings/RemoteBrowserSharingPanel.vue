<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 class="text-sm font-semibold text-gray-900">{{ t('settings.components.settings.NodeManager.remoteBrowserSharing.title') }}</h3>
    <p class="mt-1 text-xs leading-5 text-gray-500">
      {{ t('settings.components.settings.NodeManager.remoteBrowserSharing.description') }}
    </p>

    <label class="mt-4 flex items-center gap-2 text-sm text-gray-700">
      <input
        v-model="store.settings.enabled"
        type="checkbox"
        class="rounded border-slate-300 text-blue-600 focus:ring-blue-200"
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
        class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        data-testid="remote-browser-sharing-host"
      />
    </div>

    <div class="mt-3 flex items-center gap-2">
      <button
        class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
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
