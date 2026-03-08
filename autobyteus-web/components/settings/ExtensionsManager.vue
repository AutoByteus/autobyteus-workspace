<template>
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
    <header class="space-y-2">
      <p class="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Extensions</p>
      <h2 class="text-3xl font-semibold text-gray-900">Optional capabilities</h2>
      <p class="max-w-2xl text-sm leading-6 text-gray-600">
        Install voice input without increasing the base app size. Runtime assets are downloaded on demand and managed locally.
      </p>
    </header>

    <div v-if="!extensionsStore.isElectron" class="rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600">
      Extensions are available only in the Electron desktop app.
    </div>

    <div v-else-if="extensionsStore.error" class="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
      {{ extensionsStore.error }}
    </div>

    <VoiceInputExtensionCard
      v-if="voiceInput"
      :extension="voiceInput"
      :busy="extensionsStore.isBusy"
      @install="extensionsStore.installExtension('voice-input')"
      @remove="extensionsStore.removeExtension('voice-input')"
      @reinstall="extensionsStore.reinstallExtension('voice-input')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useExtensionsStore } from '~/stores/extensionsStore';
import VoiceInputExtensionCard from '~/components/settings/VoiceInputExtensionCard.vue';

const extensionsStore = useExtensionsStore();
const voiceInput = computed(() => extensionsStore.voiceInput);

onMounted(async () => {
  await extensionsStore.initialize();
});
</script>
