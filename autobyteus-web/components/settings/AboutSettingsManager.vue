<template>
  <div class="h-full overflow-auto bg-white p-6">
    <div class="mx-auto w-full max-w-3xl space-y-4">
      <section
        class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        data-testid="settings-updates-panel"
      >
        <header class="mb-4">
          <h2 class="text-lg font-semibold text-gray-900">AutoByteus Updates</h2>
          <p class="mt-1 text-sm text-gray-600">
            Version details and desktop app update controls.
          </p>
        </header>

        <dl class="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt class="text-gray-500">Current Version</dt>
            <dd class="font-medium text-gray-900" data-testid="settings-updates-version">{{ currentVersionLabel }}</dd>
          </div>
          <div>
            <dt class="text-gray-500">Update Status</dt>
            <dd class="font-medium text-gray-900" data-testid="settings-updates-status">{{ statusLabel }}</dd>
          </div>
          <div>
            <dt class="text-gray-500">Last Checked</dt>
            <dd class="font-medium text-gray-900" data-testid="settings-updates-last-checked">{{ lastCheckedLabel }}</dd>
          </div>
        </dl>

        <p class="mt-4 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700" data-testid="settings-updates-message">
          {{ statusMessage }}
        </p>

        <div class="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="settings-updates-check-updates"
            :disabled="!appUpdateStore.isElectron || isCheckDisabled"
            @click="checkForUpdates"
          >
            Check for Updates
          </button>

          <button
            v-if="appUpdateStore.status === 'available'"
            type="button"
            class="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            data-testid="settings-updates-download-update"
            @click="downloadUpdate"
          >
            Download Update
          </button>

          <button
            v-if="appUpdateStore.status === 'downloaded'"
            type="button"
            class="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            data-testid="settings-updates-install-update"
            @click="installUpdateAndRestart"
          >
            Install &amp; Restart
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useAppUpdateStore } from '~/stores/appUpdateStore';

const appUpdateStore = useAppUpdateStore();

onMounted(() => {
  if (!appUpdateStore.initialized) {
    void appUpdateStore.initialize();
  }
});

const currentVersionLabel = computed(() => appUpdateStore.currentVersion || 'Unavailable');

const statusLabel = computed(() => {
  switch (appUpdateStore.status) {
    case 'checking':
      return 'Checking';
    case 'available':
      return 'Update available';
    case 'downloading':
      return 'Downloading';
    case 'downloaded':
      return 'Ready to install';
    case 'no-update':
      return 'Up to date';
    case 'error':
      return 'Error';
    default:
      return 'Idle';
  }
});

const statusMessage = computed(() => {
  if (!appUpdateStore.isElectron) {
    return 'Update checks are available in packaged Electron desktop builds.';
  }
  return appUpdateStore.message || 'Check for updates manually at any time.';
});

const lastCheckedLabel = computed(() => {
  if (!appUpdateStore.checkedAt) {
    return 'Never';
  }

  const value = new Date(appUpdateStore.checkedAt);
  if (Number.isNaN(value.getTime())) {
    return 'Unknown';
  }

  return value.toLocaleString();
});

const isCheckDisabled = computed(
  () => appUpdateStore.status === 'checking' || appUpdateStore.status === 'downloading',
);

const checkForUpdates = async (): Promise<void> => {
  await appUpdateStore.checkForUpdates();
};

const downloadUpdate = async (): Promise<void> => {
  await appUpdateStore.downloadUpdate();
};

const installUpdateAndRestart = async (): Promise<void> => {
  await appUpdateStore.installUpdateAndRestart();
};
</script>
