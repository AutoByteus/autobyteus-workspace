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
            <dd class="flex flex-wrap items-center gap-2 font-medium text-gray-900">
              <span data-testid="settings-updates-version">{{ currentVersionLabel }}</span>
              <span
                v-if="appUpdateStore.currentVersionIsPrerelease"
                class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800"
                data-testid="settings-updates-beta-badge"
              >{{ $t('settings.components.settings.AboutSettingsManager.betaBadge') }}</span>
            </dd>
          </div>
          <div>
            <dt class="text-gray-500">{{ $t('settings.components.settings.AboutSettingsManager.update_status') }}</dt>
            <dd class="font-medium text-gray-900" data-testid="settings-updates-status">{{ statusLabel }}</dd>
          </div>
          <div>
            <dt class="text-gray-500">{{ $t('settings.components.settings.AboutSettingsManager.last_checked') }}</dt>
            <dd class="font-medium text-gray-900" data-testid="settings-updates-last-checked">{{ lastCheckedLabel }}</dd>
            <dd v-if="appUpdateStore.autoCheck" class="mt-0.5 text-xs font-normal text-gray-500" data-testid="settings-updates-auto-state">{{ autoCheckStateLabel }}</dd>
          </div>
        </dl>

        <p class="mt-4 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700" data-testid="settings-updates-message">
          {{ statusMessage }}
        </p>

        <p
          v-if="autoCheckFailedNote"
          class="mt-2 text-sm text-gray-600"
          data-testid="settings-updates-auto-failed-note"
        >{{ $t('settings.components.settings.AboutSettingsManager.autoCheck.failedNote') }}</p>

        <!-- The app's own automatic check (REQ-012/013/016): its switch, its interval, and what it contacts. -->
        <div
          v-if="appUpdateStore.autoCheck"
          class="mt-4 border-t border-gray-100 pt-4"
          data-testid="settings-updates-auto-check"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p id="settings-updates-auto-check-label" class="text-sm font-medium text-gray-900">
                {{ $t('settings.components.settings.AboutSettingsManager.autoCheck.label') }}
              </p>
              <p id="settings-updates-auto-check-description" class="mt-1 text-sm text-gray-600" data-testid="settings-updates-auto-check-description">
                {{ $t('settings.components.settings.AboutSettingsManager.autoCheck.description') }}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              data-testid="settings-updates-auto-check-toggle"
              class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
              :class="autoCheckEnabled ? 'bg-emerald-500' : 'bg-slate-300'"
              :aria-checked="autoCheckEnabled"
              aria-labelledby="settings-updates-auto-check-label"
              aria-describedby="settings-updates-auto-check-description"
              @click="toggleAutoCheck"
            >
              <span
                aria-hidden="true"
                class="inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform"
                :class="autoCheckEnabled ? 'translate-x-5' : 'translate-x-0.5'"
              />
            </button>
          </div>
          <div class="mt-3 rounded-lg bg-slate-50 px-4 py-3">
            <UpdateIntervalField
              test-key="app"
              :label="$t('settings.components.settings.AboutSettingsManager.autoCheck.interval')"
              :minutes="appUpdateStore.autoCheck.intervalMinutes"
              :save="saveAutoCheckInterval"
              :muted="!autoCheckEnabled"
            />
            <p v-if="!autoCheckEnabled" class="mt-1.5 text-xs leading-5 text-amber-800" data-testid="settings-updates-auto-check-no-effect">{{ $t('settings.components.settings.AboutSettingsManager.autoCheck.noEffect') }}</p>
          </div>
        </div>

        <div
          v-if="!updatesDisabled"
          class="mt-4 flex items-start justify-between gap-4 border-t border-gray-100 pt-4"
        >
          <div class="min-w-0">
            <p id="settings-updates-beta-channel-label" class="text-sm font-medium text-gray-900">
              {{ $t('settings.components.settings.AboutSettingsManager.betaChannel.label') }}
            </p>
            <p class="mt-1 text-sm text-gray-600">
              {{ $t('settings.components.settings.AboutSettingsManager.betaChannel.description') }}
            </p>
            <p
              v-if="appUpdateStore.updateStaged"
              class="mt-1 text-sm text-amber-700"
              data-testid="settings-updates-beta-channel-downloaded-hint"
            >
              {{ $t('settings.components.settings.AboutSettingsManager.betaChannel.downloadedHint') }}
            </p>
          </div>

          <button
            type="button"
            role="switch"
            data-testid="settings-updates-beta-channel-toggle"
            class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
            :class="isBetaChannel ? 'bg-emerald-500' : 'bg-slate-300'"
            :aria-checked="isBetaChannel"
            aria-labelledby="settings-updates-beta-channel-label"
            :disabled="isChannelToggleDisabled"
            @click="toggleBetaChannel"
          >
            <span
              aria-hidden="true"
              class="inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform"
              :class="isBetaChannel ? 'translate-x-5' : 'translate-x-0.5'"
            />
          </button>
        </div>

        <div v-if="!updatesDisabled" class="mt-4 flex flex-wrap gap-2">
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
import { computed, onMounted, ref } from 'vue';
import { isAppUpdateChannelLocked } from '~/shared/appUpdateTypes';
import { useLocalization } from '~/composables/useLocalization';
import { useAppUpdateStore } from '~/stores/appUpdateStore';
import { getSettingsAppUpdateErrorMessageKey } from '~/utils/appUpdateErrorDisplay';
import { describeInterval } from '~/utils/updateInterval';
import UpdateIntervalField from '~/components/settings/UpdateIntervalField.vue';

const appUpdateStore = useAppUpdateStore();
const { t } = useLocalization();

onMounted(() => {
  if (!appUpdateStore.initialized) {
    void appUpdateStore.initialize();
  }
});

const updatesDisabled = computed(() => appUpdateStore.status === 'disabled');

/** The app's own automatic check (REQ-012/013/015): its switch, its interval, and what the last check said. */
const autoCheckEnabled = computed(() => appUpdateStore.autoCheck?.enabled === true);
const CHECK_OPERATIONS: ReadonlyArray<string> = ['startup-check', 'periodic-check', 'manual-check'];
const isCheckError = computed(() => CHECK_OPERATIONS.includes(appUpdateStore.errorOperation ?? ''));
const autoCheckFailedNote = computed(() => appUpdateStore.status === 'error' && appUpdateStore.errorOperation === 'periodic-check' && autoCheckEnabled.value);
const autoCheckStateLabel = computed(() => autoCheckEnabled.value && appUpdateStore.autoCheck
  ? t('settings.components.settings.AboutSettingsManager.autoCheck.stateEvery', { interval: describeInterval(appUpdateStore.autoCheck.intervalMinutes, t) })
  : t('settings.components.settings.AboutSettingsManager.autoCheck.stateOff'));
const toggleAutoCheck = async (): Promise<void> => {
  await appUpdateStore.setAutoCheck({ enabled: !autoCheckEnabled.value });
};
const saveAutoCheckInterval = async (minutes: number): Promise<void> => {
  if (!await appUpdateStore.setAutoCheck({ intervalMinutes: minutes })) throw new Error('refused');
};

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
      return isCheckError.value
        ? t('settings.components.settings.AboutSettingsManager.status.checkFailed')
        : t('settings.components.settings.AboutSettingsManager.status.error');
    case 'disabled':
      return t('settings.components.settings.AboutSettingsManager.status.disabled');
    default:
      return appUpdateStore.autoCheck && !autoCheckEnabled.value
        ? t('settings.components.settings.AboutSettingsManager.status.checksOff')
        : t('settings.components.settings.AboutSettingsManager.status.idle');
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
      return t(getSettingsAppUpdateErrorMessageKey(appUpdateStore.errorKind));
    case 'disabled':
      return t('settings.components.settings.AboutSettingsManager.message.disabled');
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

const isChangingChannel = ref(false);

const isBetaChannel = computed(() => appUpdateStore.updateChannel === 'beta');

const isChannelToggleDisabled = computed(
  () => !appUpdateStore.isElectron || isChangingChannel.value || isAppUpdateChannelLocked(appUpdateStore),
);

const toggleBetaChannel = async (): Promise<void> => {
  if (isChannelToggleDisabled.value) {
    return;
  }
  isChangingChannel.value = true;
  try {
    await appUpdateStore.setUpdateChannel(isBetaChannel.value ? 'stable' : 'beta');
  } finally {
    isChangingChannel.value = false;
  }
};

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
