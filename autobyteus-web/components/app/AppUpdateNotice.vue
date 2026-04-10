<template>
  <transition name="update-card">
    <section
      v-if="appUpdateStore.shouldShow"
      class="fixed bottom-6 right-6 z-[95] w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border border-sky-200 bg-gradient-to-br from-white to-sky-50 p-4 shadow-2xl"
      data-testid="app-update-notice"
    >
      <header class="mb-2 flex items-start justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-sky-700">{{ $t('shell.components.app.AppUpdateNotice.app_update') }}</p>
          <h3 class="text-sm font-semibold text-slate-900">{{ statusTitle }}</h3>
        </div>
        <button
          v-if="appUpdateStore.status !== 'installing'"
          class="rounded-md p-1 text-slate-500 transition hover:bg-sky-100 hover:text-slate-700"
          :aria-label="$t('shell.components.app.AppUpdateNotice.dismiss_update_notice')"
          data-testid="app-update-dismiss"
          @click="appUpdateStore.dismissNotice()"
        >
          <span class="i-heroicons-x-mark-20-solid h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      <p class="text-sm text-slate-700" data-testid="app-update-message">{{ statusMessage }}</p>

      <p v-if="versionSummary" class="mt-1 text-xs text-slate-500" data-testid="app-update-version">
        {{ versionSummary }}
      </p>

      <div
        v-if="appUpdateStore.status === 'downloading'"
        class="mt-3"
        data-testid="app-update-progress"
      >
        <div class="mb-1 flex items-center justify-between text-xs text-slate-600">
          <span>{{ $t('shell.components.app.AppUpdateNotice.download_progress') }}</span>
          <span>{{ appUpdateStore.progressLabel }}</span>
        </div>
        <div class="h-2 w-full rounded-full bg-slate-200">
          <div
            class="h-2 rounded-full bg-sky-600 transition-all"
            :style="{ width: `${Math.max(0, Math.min(100, appUpdateStore.downloadPercent ?? 0))}%` }"
          />
        </div>
      </div>

      <div
        v-if="appUpdateStore.status === 'installing'"
        class="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800"
        data-testid="app-update-installing-indicator"
      >
        <div class="flex items-center gap-2">
          <span class="i-heroicons-arrow-path h-4 w-4 animate-spin" aria-hidden="true" />
          <span>{{ $t('shell.components.app.AppUpdateNotice.restarting_to_install_update_this_window') }}</span>
        </div>
      </div>

      <details
        v-if="appUpdateStore.releaseNotes"
        class="mt-3 rounded-md border border-sky-100 bg-white/70 p-2 text-xs text-slate-700"
      >
        <summary class="cursor-pointer font-medium text-sky-700">{{ $t('shell.components.app.AppUpdateNotice.release_notes') }}</summary>
        <p class="mt-2 whitespace-pre-line">{{ appUpdateStore.releaseNotes }}</p>
      </details>

      <div class="mt-4 flex flex-wrap items-center gap-2">
        <button
          v-if="appUpdateStore.status === 'available'"
          class="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
          data-testid="app-update-download"
          @click="appUpdateStore.downloadUpdate()"
        >{{ $t('shell.components.app.AppUpdateNotice.download_update') }}</button>

        <button
          v-if="appUpdateStore.status === 'downloaded'"
          class="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          data-testid="app-update-install"
          @click="appUpdateStore.installUpdateAndRestart()"
        >{{ $t('shell.components.app.AppUpdateNotice.install_and_amp_restart') }}</button>

        <button
          v-if="appUpdateStore.status === 'installing'"
          class="cursor-not-allowed rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-white opacity-80"
          data-testid="app-update-installing"
          disabled
        >
          {{ $t('shell.components.app.AppUpdateNotice.restarting') }}
        </button>

        <button
          v-if="appUpdateStore.status === 'error' || appUpdateStore.status === 'no-update'"
          class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          data-testid="app-update-check"
          @click="appUpdateStore.checkForUpdates()"
        >{{ $t('shell.components.app.AppUpdateNotice.check_again') }}</button>

        <button
          v-if="appUpdateStore.status === 'available' || appUpdateStore.status === 'error'"
          class="rounded-md border border-transparent px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          data-testid="app-update-later"
          @click="appUpdateStore.dismissNotice()"
        >
          {{ $t('shell.components.app.AppUpdateNotice.later') }}
        </button>
      </div>
    </section>
  </transition>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import { useAppUpdateStore } from '~/stores/appUpdateStore';

const appUpdateStore = useAppUpdateStore();
const { t } = useLocalization();

const statusTitle = computed(() => {
  switch (appUpdateStore.status) {
    case 'checking':
      return t('shell.components.app.AppUpdateNotice.statusTitle.checking');
    case 'available':
      return t('shell.components.app.AppUpdateNotice.statusTitle.available');
    case 'downloading':
      return t('shell.components.app.AppUpdateNotice.statusTitle.downloading');
    case 'downloaded':
      return t('shell.components.app.AppUpdateNotice.statusTitle.downloaded');
    case 'installing':
      return t('shell.components.app.AppUpdateNotice.statusTitle.installing');
    case 'no-update':
      return t('shell.components.app.AppUpdateNotice.statusTitle.noUpdate');
    case 'error':
      return t('shell.components.app.AppUpdateNotice.statusTitle.error');
    default:
      return t('shell.components.app.AppUpdateNotice.statusTitle.idle');
  }
});

const statusMessage = computed(() => {
  if (appUpdateStore.status === 'available') {
    return appUpdateStore.availableVersion
      ? t('shell.components.app.AppUpdateNotice.statusMessage.availableVersion', {
          version: appUpdateStore.availableVersion,
        })
      : t('shell.components.app.AppUpdateNotice.statusMessage.available');
  }

  if (appUpdateStore.status === 'downloading') {
    return t('shell.components.app.AppUpdateNotice.statusMessage.downloading');
  }

  if (appUpdateStore.status === 'downloaded') {
    return t('shell.components.app.AppUpdateNotice.statusMessage.downloaded');
  }

  if (appUpdateStore.status === 'installing') {
    return t('shell.components.app.AppUpdateNotice.statusMessage.installing');
  }

  if (appUpdateStore.status === 'no-update') {
    return t('shell.components.app.AppUpdateNotice.statusMessage.noUpdate');
  }

  if (appUpdateStore.status === 'error') {
    return appUpdateStore.error
      ? t('shell.components.app.AppUpdateNotice.statusMessage.errorWithDetail', {
          error: appUpdateStore.error,
        })
      : t('shell.components.app.AppUpdateNotice.statusMessage.error');
  }

  if (appUpdateStore.status === 'checking') {
    return t('shell.components.app.AppUpdateNotice.statusMessage.checking');
  }

  return t('shell.components.app.AppUpdateNotice.statusMessage.idle');
});

const versionSummary = computed(() => {
  const current = appUpdateStore.currentVersion || t('shell.components.app.AppUpdateNotice.version.unknown');
  if (appUpdateStore.availableVersion) {
    return t('shell.components.app.AppUpdateNotice.version.currentToNew', {
      current,
      next: appUpdateStore.availableVersion,
    });
  }
  return appUpdateStore.currentVersion
    ? t('shell.components.app.AppUpdateNotice.version.currentOnly', { current })
    : null;
});
</script>

<style scoped>
.update-card-enter-active,
.update-card-leave-active {
  transition: all 0.2s ease;
}

.update-card-enter-from,
.update-card-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
