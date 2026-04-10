<template>
  <div class="h-full overflow-auto bg-white p-6">
    <div class="mx-auto w-full max-w-3xl space-y-4">
      <section
        class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        data-testid="settings-updates-panel"
      >
        <header class="mb-4">
          <h2 class="text-lg font-semibold text-gray-900">{{ $t('settings.components.settings.AboutSettingsManager.autobyteus_updates') }}</h2>
          <p class="mt-1 text-sm text-gray-600">{{ $t('settings.components.settings.AboutSettingsManager.version_details_and_desktop_app_update') }}</p>
        </header>

        <dl class="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt class="text-gray-500">{{ $t('settings.components.settings.AboutSettingsManager.current_version') }}</dt>
            <dd class="font-medium text-gray-900" data-testid="settings-updates-version">{{ currentVersionLabel }}</dd>
          </div>
          <div>
            <dt class="text-gray-500">{{ $t('settings.components.settings.AboutSettingsManager.update_status') }}</dt>
            <dd class="font-medium text-gray-900" data-testid="settings-updates-status">{{ statusLabel }}</dd>
          </div>
          <div>
            <dt class="text-gray-500">{{ $t('settings.components.settings.AboutSettingsManager.last_checked') }}</dt>
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
          >{{ $t('settings.components.settings.AboutSettingsManager.check_for_updates') }}</button>

          <button
            v-if="appUpdateStore.status === 'available'"
            type="button"
            class="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            data-testid="settings-updates-download-update"
            @click="downloadUpdate"
          >{{ $t('settings.components.settings.AboutSettingsManager.download_update') }}</button>

          <button
            v-if="appUpdateStore.status === 'downloaded'"
            type="button"
            class="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            data-testid="settings-updates-install-update"
            @click="installUpdateAndRestart"
          >{{ $t('settings.components.settings.AboutSettingsManager.install_and_amp_restart') }}</button>

          <button
            v-if="appUpdateStore.status === 'installing'"
            type="button"
            class="cursor-not-allowed rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-white opacity-80"
            data-testid="settings-updates-installing"
            disabled
          >
            {{ $t('settings.components.settings.AboutSettingsManager.restarting') }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import { useAppUpdateStore } from '~/stores/appUpdateStore';

const appUpdateStore = useAppUpdateStore();
const { t } = useLocalization();

onMounted(() => {
  if (!appUpdateStore.initialized) {
    void appUpdateStore.initialize();
  }
});

const currentVersionLabel = computed(() => (
  appUpdateStore.currentVersion || t('settings.components.settings.AboutSettingsManager.unavailable')
));

const statusLabel = computed(() => {
  switch (appUpdateStore.status) {
    case 'checking':
      return t('settings.components.settings.AboutSettingsManager.status.checking');
    case 'available':
      return t('settings.components.settings.AboutSettingsManager.status.available');
    case 'downloading':
      return t('settings.components.settings.AboutSettingsManager.status.downloading');
    case 'downloaded':
      return t('settings.components.settings.AboutSettingsManager.status.downloaded');
    case 'installing':
      return t('settings.components.settings.AboutSettingsManager.status.installing');
    case 'no-update':
      return t('settings.components.settings.AboutSettingsManager.status.noUpdate');
    case 'error':
      return t('settings.components.settings.AboutSettingsManager.status.error');
    default:
      return t('settings.components.settings.AboutSettingsManager.status.idle');
  }
});

const statusMessage = computed(() => {
  if (!appUpdateStore.isElectron) {
    return t('settings.components.settings.AboutSettingsManager.message.electronOnly');
  }

  switch (appUpdateStore.status) {
    case 'checking':
      return t('settings.components.settings.AboutSettingsManager.message.checking');
    case 'available':
      return appUpdateStore.availableVersion
        ? t('settings.components.settings.AboutSettingsManager.message.availableVersion', {
            version: appUpdateStore.availableVersion,
          })
        : t('settings.components.settings.AboutSettingsManager.message.available');
    case 'downloading':
      return t('settings.components.settings.AboutSettingsManager.message.downloading');
    case 'downloaded':
      return t('settings.components.settings.AboutSettingsManager.message.downloaded');
    case 'installing':
      return t('settings.components.settings.AboutSettingsManager.message.installing');
    case 'no-update':
      return t('settings.components.settings.AboutSettingsManager.message.noUpdate');
    case 'error':
      return appUpdateStore.error
        ? t('settings.components.settings.AboutSettingsManager.message.errorWithDetail', {
            error: appUpdateStore.error,
          })
        : t('settings.components.settings.AboutSettingsManager.message.error');
    default:
      return t('settings.components.settings.AboutSettingsManager.message.idle');
  }
});

const lastCheckedLabel = computed(() => {
  if (!appUpdateStore.checkedAt) {
    return t('settings.components.settings.AboutSettingsManager.lastChecked.never');
  }

  const value = new Date(appUpdateStore.checkedAt);
  if (Number.isNaN(value.getTime())) {
    return t('settings.components.settings.AboutSettingsManager.lastChecked.unknown');
  }

  return value.toLocaleString();
});

const isCheckDisabled = computed(
  () => appUpdateStore.status === 'checking' || appUpdateStore.status === 'downloading' || appUpdateStore.status === 'installing',
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
