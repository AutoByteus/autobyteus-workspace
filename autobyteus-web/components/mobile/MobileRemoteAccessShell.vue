<template>
  <main class="min-h-screen bg-slate-100 text-slate-900">
    <MobilePairingBootstrap v-if="!sessionStore.isPaired" @paired="onPaired">
      <template v-if="unsupportedMessage" #notice>
        <MobileUnsupportedFeatureNotice :message="unsupportedMessage" />
      </template>
    </MobilePairingBootstrap>
    <section v-else class="mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-8">
      <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">AutoByteus Remote Access</p>
            <h1 class="mt-2 text-2xl font-bold text-slate-950">Connected to AutoByteus</h1>
            <p class="mt-1 break-all font-mono text-xs text-slate-500">{{ sessionStore.session?.serverBaseUrl }}</p>
          </div>
          <button class="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700" @click="sessionStore.deleteLocalSession">
            Unpair this phone
          </button>
        </div>

        <div v-if="sessionStore.lastDiagnostic" class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p class="font-semibold">{{ sessionStore.lastDiagnostic.title }}</p>
          <p class="mt-1">{{ sessionStore.lastDiagnostic.message }}</p>
          <p class="mt-1 text-xs">{{ sessionStore.lastDiagnostic.recoveryAction }}</p>
        </div>

        <MobileUnsupportedFeatureNotice
          v-if="unsupportedMessage"
          class="mt-4"
          :message="unsupportedMessage"
        />

        <div class="mt-6 grid gap-3 sm:grid-cols-2">
          <button class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left" @click="checkStatus">
            <p class="font-semibold">Server status</p>
            <p class="mt-1 text-sm text-slate-600">{{ statusSummary }}</p>
          </button>
          <NuxtLink to="/workspace" class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
            <p class="font-semibold">Workspace and runs</p>
            <p class="mt-1 text-sm text-slate-600">Open the mobile-safe workspace slice.</p>
          </NuxtLink>
        </div>

        <div class="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 class="text-sm font-semibold text-slate-900">Mobile MVP scope</h2>
          <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>Pairing, reconnect, and server status are mobile-ready.</li>
            <li>Agent/team runs and run history use the paired node and authorized transports.</li>
            <li>Desktop-only controls stay unsupported in the phone shell.</li>
          </ul>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import MobilePairingBootstrap from '~/components/mobile/MobilePairingBootstrap.vue';
import MobileUnsupportedFeatureNotice from '~/components/mobile/MobileUnsupportedFeatureNotice.vue';
import { useMobileNodeSessionStore } from '~/stores/mobileNodeSessionStore';
import type { MobileFeatureId } from '~/utils/mobileFeatureGates';

const sessionStore = useMobileNodeSessionStore();
const route = useRoute();

const unsupportedFeatureMessages: Partial<Record<MobileFeatureId, string>> = {
  desktopSettings: 'Desktop settings are managed from the desktop app. Phone Access exposes only mobile-safe connection controls.',
  desktopUpdates: 'Desktop update controls are not available from the phone client.',
  localFolderPicker: 'Local folder picking is not available from the phone client.',
  applicationIframe: 'Application iframe surfaces are not part of the mobile MVP yet.',
};

const statusSummary = computed(() => {
  if (sessionStore.isCheckingStatus) {
    return 'Checking…';
  }
  if (!sessionStore.lastStatus) {
    return 'Tap to check reachability.';
  }
  return sessionStore.lastStatus.phoneAccessEnabled ? 'Phone Access enabled.' : 'Phone Access disabled.';
});

const unsupportedMessage = computed(() => {
  const feature = String(route.query.unsupported ?? '') as MobileFeatureId;
  return unsupportedFeatureMessages[feature] ?? null;
});

async function checkStatus(): Promise<void> {
  await sessionStore.fetchStatus();
}

async function onPaired(): Promise<void> {
  await checkStatus();
}

onMounted(async () => {
  sessionStore.initializeFromStorage();
  if (sessionStore.isPaired) {
    await checkStatus();
  }
});
</script>
