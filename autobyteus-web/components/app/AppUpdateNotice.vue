<template>
  <transition name="update-card">
    <section
      v-if="appUpdateStore.shouldShow"
      class="fixed bottom-6 right-6 z-[95] w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border border-sky-200 bg-gradient-to-br from-white to-sky-50 p-4 shadow-2xl"
      data-testid="app-update-notice"
    >
      <header class="mb-2 flex items-start justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-sky-700">App Update</p>
          <h3 class="text-sm font-semibold text-slate-900">{{ statusTitle }}</h3>
        </div>
        <button
          class="rounded-md p-1 text-slate-500 transition hover:bg-sky-100 hover:text-slate-700"
          aria-label="Dismiss update notice"
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
          <span>Download progress</span>
          <span>{{ appUpdateStore.progressLabel }}</span>
        </div>
        <div class="h-2 w-full rounded-full bg-slate-200">
          <div
            class="h-2 rounded-full bg-sky-600 transition-all"
            :style="{ width: `${Math.max(0, Math.min(100, appUpdateStore.downloadPercent ?? 0))}%` }"
          />
        </div>
      </div>

      <details
        v-if="appUpdateStore.releaseNotes"
        class="mt-3 rounded-md border border-sky-100 bg-white/70 p-2 text-xs text-slate-700"
      >
        <summary class="cursor-pointer font-medium text-sky-700">Release notes</summary>
        <p class="mt-2 whitespace-pre-line">{{ appUpdateStore.releaseNotes }}</p>
      </details>

      <div class="mt-4 flex flex-wrap items-center gap-2">
        <button
          v-if="appUpdateStore.status === 'available'"
          class="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
          data-testid="app-update-download"
          @click="appUpdateStore.downloadUpdate()"
        >
          Download Update
        </button>

        <button
          v-if="appUpdateStore.status === 'downloaded'"
          class="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          data-testid="app-update-install"
          @click="appUpdateStore.installUpdateAndRestart()"
        >
          Install &amp; Restart
        </button>

        <button
          v-if="appUpdateStore.status === 'error' || appUpdateStore.status === 'no-update'"
          class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          data-testid="app-update-check"
          @click="appUpdateStore.checkForUpdates()"
        >
          Check Again
        </button>

        <button
          v-if="appUpdateStore.status === 'available' || appUpdateStore.status === 'error'"
          class="rounded-md border border-transparent px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          data-testid="app-update-later"
          @click="appUpdateStore.dismissNotice()"
        >
          Later
        </button>
      </div>
    </section>
  </transition>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAppUpdateStore } from '~/stores/appUpdateStore';

const appUpdateStore = useAppUpdateStore();

const statusTitle = computed(() => {
  switch (appUpdateStore.status) {
    case 'checking':
      return 'Checking for updates';
    case 'available':
      return 'Update available';
    case 'downloading':
      return 'Downloading update';
    case 'downloaded':
      return 'Ready to install';
    case 'no-update':
      return 'You are up to date';
    case 'error':
      return 'Update failed';
    default:
      return 'App updates';
  }
});

const statusMessage = computed(() => {
  if (appUpdateStore.message) {
    return appUpdateStore.message;
  }

  if (appUpdateStore.status === 'available') {
    return 'A new version is ready to download.';
  }

  if (appUpdateStore.status === 'downloaded') {
    return 'Update downloaded. Restart to apply the new version.';
  }

  if (appUpdateStore.status === 'error') {
    return 'Could not complete app update check.';
  }

  return 'Manage desktop updates from here.';
});

const versionSummary = computed(() => {
  const current = appUpdateStore.currentVersion || 'unknown';
  if (appUpdateStore.availableVersion) {
    return `Current ${current} → New ${appUpdateStore.availableVersion}`;
  }
  return appUpdateStore.currentVersion ? `Current ${current}` : null;
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
