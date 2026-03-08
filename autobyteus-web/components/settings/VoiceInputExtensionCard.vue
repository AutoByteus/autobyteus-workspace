<template>
  <section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
    <div class="flex items-start justify-between gap-4">
      <div class="space-y-2">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <span class="i-heroicons-microphone-20-solid h-5 w-5"></span>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">{{ extension.name }}</h3>
            <p class="text-sm text-gray-500">{{ extension.description }}</p>
          </div>
        </div>
        <div class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium" :class="statusClass">
          {{ statusLabel }}
        </div>
        <p v-if="extension.message" class="text-sm text-gray-600">{{ extension.message }}</p>
        <p v-if="extension.lastError" class="text-sm text-red-600">{{ extension.lastError }}</p>
        <div class="text-xs text-gray-500">
          Runtime: {{ extension.runtimeVersion || 'Not installed' }}
          <span v-if="extension.modelVersion"> · Model: {{ extension.modelVersion }}</span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="extension.status === 'not-installed'"
          type="button"
          class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="busy"
          @click="$emit('install')"
        >
          Install
        </button>
        <button
          v-if="extension.status === 'installed'"
          type="button"
          class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="busy"
          @click="$emit('remove')"
        >
          Remove
        </button>
        <button
          v-if="extension.status === 'installed' || extension.status === 'error'"
          type="button"
          class="rounded-md border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="busy"
          @click="$emit('reinstall')"
        >
          Reinstall
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ManagedExtensionState } from '~/electron/extensions/types';

const props = defineProps<{
  extension: ManagedExtensionState;
  busy: boolean;
}>();

defineEmits<{
  install: [];
  remove: [];
  reinstall: [];
}>();

const statusLabel = computed(() => {
  switch (props.extension.status) {
    case 'installed':
      return 'Installed';
    case 'installing':
      return 'Installing';
    case 'error':
      return 'Needs Attention';
    default:
      return 'Not Installed';
  }
});

const statusClass = computed(() => {
  switch (props.extension.status) {
    case 'installed':
      return 'bg-green-50 text-green-700';
    case 'installing':
      return 'bg-amber-50 text-amber-700';
    case 'error':
      return 'bg-red-50 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
});
</script>
