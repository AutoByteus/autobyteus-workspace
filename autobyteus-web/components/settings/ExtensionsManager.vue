<template>
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
    <header class="space-y-2">
      <p class="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">{{ t('extensions.page.eyebrow') }}</p>
      <h2 class="text-3xl font-semibold text-gray-900">{{ t('settings.components.settings.ExtensionsManager.optional_capabilities') }}</h2>
      <p class="max-w-2xl text-sm leading-6 text-gray-600">{{ t('extensions.page.lead') }}</p>
      <p v-if="isDesktop" class="flex flex-wrap items-center gap-x-2 pt-1 text-sm text-gray-600" data-testid="extensions-node-line">
        <svg class="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="4" width="14" height="9" rx="1.5" /><path d="M7 16.5h6M10 13v3.5" stroke-linecap="round" /></svg>
        <span>{{ t('extensions.page.nodeLine') }}</span>
        <span class="font-medium text-gray-900">{{ nodeName }}</span>
        <span class="text-gray-500">· {{ windowNode.isEmbeddedWindow ? t('extensions.page.thisComputer') : nodeAddress }}</span>
      </p>
    </header>

    <div v-if="!isDesktop" class="rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600" data-testid="extensions-browser-note">{{ t('extensions.page.browserOnly') }}</div>

    <template v-else>
      <!-- No owner credential for this window's node: its extensions are owner only (REQ-005). -->
      <div v-if="!canManage" class="flex items-start gap-2.5 rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm leading-6 text-gray-700" data-testid="extensions-owner-note">
        <svg class="mt-1 h-4 w-4 flex-shrink-0 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="4.5" y="9" width="11" height="8" rx="1.5" /><path d="M7 9V6.5a3 3 0 0 1 6 0V9" /></svg>
        <p>
          {{ t('extensions.page.ownerOnly', { node: nodeName }) }}
          <NuxtLink to="/nodes?nodeTab=manage" class="font-medium text-blue-700 hover:text-blue-800">{{ t('extensions.page.ownerOnlyLink') }}</NuxtLink>
        </p>
      </div>

      <template v-else>
        <div v-if="store.list?.catalog === 'unverified'" class="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800" role="alert" data-testid="extensions-catalog-unverified">
          <svg class="mt-1 h-4 w-4 flex-shrink-0 text-red-500" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10" cy="10" r="7.5" /><path d="M10 6.5v4M10 13.5v.01" stroke-linecap="round" /></svg>
          <p>{{ t('extensions.page.catalogUnverified') }}</p>
        </div>
        <div v-else-if="store.list?.catalog === 'unreachable'" class="flex items-start gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-700" role="status" data-testid="extensions-catalog-offline">
          <svg class="mt-1 h-4 w-4 flex-shrink-0 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 7.5a10 10 0 0 1 14 0M5.5 10.5a6.5 6.5 0 0 1 9 0M8 13.5a3 3 0 0 1 4 0M3 3l14 14" stroke-linecap="round" /></svg>
          <p>{{ t('extensions.page.catalogOffline') }}</p>
        </div>
        <div v-if="store.error" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert" data-testid="extensions-error">{{ store.error }}</div>
        <p v-if="!store.list && !store.error" class="flex items-center gap-2 text-sm text-gray-500" data-testid="extensions-loading">
          <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500 motion-reduce:animate-none" aria-hidden="true" />
          {{ t('extensions.page.loading') }}
        </p>

        <ExtensionCard v-for="item in store.items" :key="item.id" :item="item" :platform="store.list?.platform ?? ''" :can-install="store.canInstall">
          <template #after-page>
            <VoiceMicrophonePanel v-if="item.id === 'voice-input'" :usable="item.state === 'installed' && item.enabled === true && item.ready === true" />
          </template>
        </ExtensionCard>

        <p v-if="!windowNode.isEmbeddedWindow" class="flex items-start gap-2 text-sm leading-6 text-gray-500" data-testid="extensions-voice-note">
          <svg class="mt-1 h-4 w-4 flex-shrink-0 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="10" cy="10" r="7.5" /><path d="M10 9v4.5M10 6.5v.01" stroke-linecap="round" /></svg>
          {{ t('extensions.page.voiceElsewhere') }}
        </p>
      </template>
    </template>

    <ExtensionDialogs :node-name="nodeName" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import ExtensionCard from '~/components/settings/extensions/ExtensionCard.vue';
import ExtensionDialogs from '~/components/settings/extensions/ExtensionDialogs.vue';
import VoiceMicrophonePanel from '~/components/settings/extensions/VoiceMicrophonePanel.vue';
import { useLocalization } from '~/composables/useLocalization';
import { useExtensionsStore } from '~/stores/extensionsStore';
import { useNodeAccessStore } from '~/stores/nodeAccessStore';
import { useNodeStore } from '~/stores/nodeStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';

/** Settings → Extensions: the extensions of this window's node (REQ-001, REQ-011), managed with its owner credential (REQ-005). */
const { t } = useLocalization();
const store = useExtensionsStore();
const nodeStore = useNodeStore();
const windowNode = useWindowNodeContextStore();
const access = useNodeAccessStore();

/** Extensions are managed in the desktop app, which holds the owner credentials of its nodes. */
const isDesktop = typeof window !== 'undefined' && Boolean(window.electronAPI);
const entry = computed(() => nodeStore.getEntryById(windowNode.entryId));
const nodeName = computed(() => entry.value?.name ?? t('extensions.page.thisNode'));
const nodeAddress = computed(() => (entry.value?.baseUrl ?? '').replace(/^https?:\/\//, ''));
const needsConnecting = computed(() => !windowNode.isEmbeddedWindow && access.stateOf(windowNode.entryId) === 'needs_connecting');
const canManage = computed(() => !store.notOwner && !needsConnecting.value);

onMounted(async () => {
  if (!isDesktop) return;
  await access.initialize();
  if (!needsConnecting.value) await store.open();
});
onBeforeUnmount(() => store.close());
</script>
