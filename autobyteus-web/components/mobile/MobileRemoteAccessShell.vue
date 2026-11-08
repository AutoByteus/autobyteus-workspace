<template>
  <main class="min-h-screen bg-white text-slate-900" data-testid="mobile-remote-access-shell">
    <MobilePairingBootstrap
      v-if="!sessionStore.isPaired || hasRoutePairingParam"
      @paired="onPaired"
      @pairing-failed="postPair = false"
      @pairing-started="postPair = true"
    >
      <template v-if="unsupportedMessage" #notice>
        <MobileUnsupportedFeatureNotice :message="unsupportedMessage" />
      </template>
    </MobilePairingBootstrap>

    <MobilePairedShell v-else :post-pair="postPair" :notice="unsupportedMessage" @checked="postPair = false" />
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import MobilePairedShell from '~/components/mobile/MobilePairedShell.vue';
import MobilePairingBootstrap from '~/components/mobile/MobilePairingBootstrap.vue';
import MobileUnsupportedFeatureNotice from '~/components/mobile/MobileUnsupportedFeatureNotice.vue';
import { useMobileNodeSessionStore } from '~/stores/mobileNodeSessionStore';
import type { MobileFeatureId } from '~/utils/mobileFeatureGates';
import { getShellBridge } from '~/utils/remoteAccess/shellBridge';

// Keep the component name in the compiled chunk stable for existing page tests.
defineOptions({ name: 'MobileRemoteAccessShell' });

const sessionStore = useMobileNodeSessionStore();
const route = useRoute();

/** Just paired: the paired shell shows "Connected to <node>" until its first check ends. */
const postPair = ref(false);
const routePairingConsumed = ref(false);

const unsupportedFeatureMessages: Partial<Record<MobileFeatureId, string>> = {
  desktopWorkspace: 'The desktop workspace isn’t on the phone. Your runs are here.',
  desktopSettings: 'Desktop settings are managed from the desktop app. Phone Access exposes only phone connection controls.',
  desktopUpdates: 'Desktop update controls are not available from the phone client.',
  localFolderPicker: 'Local folder picking is not available from the phone client.',
  applicationIframe: 'Application iframe surfaces are not part of the mobile shell yet.',
  browser: 'The Browser tab is Electron-only today and is not available from the phone client.',
};

const unsupportedMessage = computed(() => {
  const feature = String(route.query.unsupported ?? '') as MobileFeatureId;
  return unsupportedFeatureMessages[feature] ?? null;
});
const routePairingParam = computed(() => String((Array.isArray(route.query.pairing) ? route.query.pairing[0] : route.query.pairing) ?? '').trim());
const hasRoutePairingParam = computed(() => Boolean(routePairingParam.value) && !routePairingConsumed.value);

function onPaired(): void {
  if (!hasRoutePairingParam.value || typeof window === 'undefined') return;
  routePairingConsumed.value = true;
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.delete('pairing');
  window.history.replaceState(window.history.state, '', nextUrl.toString());
}

watch(() => sessionStore.isPaired, (isPaired, wasPaired) => {
  if (!isPaired && wasPaired) postPair.value = false;
});

onMounted(() => {
  sessionStore.initializeFromStorage();
  // In the Android app: this document is the node's page, so the app may show it (autobyteus-433 DS-006).
  getShellBridge()?.pageReady();
});
</script>
