<template>
  <section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
    <div class="flex items-start justify-between gap-4">
      <div class="space-y-3">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <span class="i-heroicons-microphone-20-solid h-5 w-5"></span>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">{{ extension.name }}</h3>
            <p class="text-sm text-gray-500">{{ extension.description }}</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <div class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium" :class="statusClass">
            {{ statusLabel }}
          </div>
          <div
            v-if="extension.status === 'installed' && extension.enabled"
            class="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700"
          >
            Enabled
          </div>
          <div
            v-else-if="extension.status === 'installed'"
            class="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-medium text-yellow-700"
          >
            Disabled
          </div>
        </div>

        <div
          v-if="extension.status === 'installing'"
          class="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-300 border-t-amber-700"></span>
          <span>{{ extension.message || 'Installing Voice Input...' }}</span>
        </div>

        <p v-if="extension.message && extension.status !== 'installing'" class="text-sm text-gray-600">{{ extension.message }}</p>
        <p v-if="extension.lastError" class="text-sm text-red-600">{{ extension.lastError }}</p>

        <div v-if="extension.status === 'installed' || extension.status === 'error'" class="space-y-2">
          <label class="flex flex-col gap-1 text-sm text-gray-700">
            <span class="font-medium">Language</span>
            <select
              class="w-44 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              :disabled="busy || extension.status !== 'installed'"
              :value="extension.settings.languageMode"
              @change="handleLanguageModeChange"
            >
              <option value="auto">Auto</option>
              <option value="en">English</option>
              <option value="zh">Chinese</option>
            </select>
          </label>
        </div>

        <p v-if="canOpenFolder" class="text-xs text-gray-500">
          Managed locally in your AutoByteus extensions folder.
        </p>
        <div class="text-xs text-gray-500">
          Runtime: {{ extension.runtimeVersion || 'Not installed' }}
          <span v-if="extension.modelVersion"> · Model: {{ extension.modelVersion }}</span>
          <span v-if="extension.backendKind"> · Backend: {{ backendLabel }}</span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="extension.status === 'installing'"
          type="button"
          class="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 disabled:cursor-wait"
          disabled
        >
          {{ pendingActionLabel }}
        </button>
        <button
          v-else-if="extension.status === 'not-installed'"
          type="button"
          class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="busy"
          @click="$emit('install')"
        >
          Install
        </button>
        <button
          v-else-if="extension.status === 'installed' && !extension.enabled"
          type="button"
          class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="busy"
          @click="$emit('enable')"
        >
          Enable
        </button>
        <button
          v-else-if="extension.status === 'installed' && extension.enabled"
          type="button"
          class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="busy"
          @click="$emit('disable')"
        >
          Disable
        </button>
        <button
          v-if="canOpenFolder"
          type="button"
          class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="busy"
          @click="$emit('openFolder')"
        >
          Open Folder
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
  pendingAction: 'install' | 'enable' | 'disable' | 'remove' | 'reinstall' | 'update-settings' | null;
}>();

const emit = defineEmits<{
  install: [];
  enable: [];
  disable: [];
  remove: [];
  reinstall: [];
  openFolder: [];
  updateLanguageMode: [value: string];
}>();

const canOpenFolder = computed(() => props.extension.status === 'installed' || props.extension.status === 'error');

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

const pendingActionLabel = computed(() => {
  switch (props.pendingAction) {
    case 'enable':
      return 'Enabling...';
    case 'disable':
      return 'Disabling...';
    case 'reinstall':
      return 'Reinstalling...';
    case 'update-settings':
      return 'Saving...';
    default:
      return 'Installing...';
  }
});

const backendLabel = computed(() => {
  if (props.extension.backendKind === 'faster-whisper') {
    return 'faster-whisper';
  }
  if (props.extension.backendKind === 'mlx') {
    return 'MLX';
  }
  return null;
});

function handleLanguageModeChange(event: Event): void {
  const target = event.target as HTMLSelectElement | null;
  if (!target) {
    return;
  }
  emit('updateLanguageMode', target.value);
}
</script>
